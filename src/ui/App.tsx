import { useMemo, useState } from "react";
import {
  DAY_LIMIT,
  GRID_SIZE,
  REPRO_TARGET,
  ROOT_MASS_PER_TILE,
  STARTING_STATS,
} from "../constants";
import {
  Allocation,
  Coord,
  createInitialState,
  isAdjacentToRoot,
  normalizeAllocations,
  serializeRootTiles,
  stepDay,
} from "../sim/sim";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const percentToAllocation = (allocations: Record<string, number>): Allocation => ({
  leaves: allocations.leaves / 100,
  roots: allocations.roots / 100,
  defense: allocations.defense / 100,
  repro: allocations.repro / 100,
});

const formatNumber = (value: number) => value.toFixed(2);

const colorForValue = (value: number, hue: number) => {
  const lightness = 25 + value * 55;
  return `hsl(${hue} 55% ${lightness}%)`;
};

export const App = () => {
  const [runState, setRunState] = useState(() => createInitialState());
  const [viewMode, setViewMode] = useState<"moisture" | "nutrients">("moisture");
  const [target, setTarget] = useState<Coord | null>(null);
  const [allocations, setAllocations] = useState({
    leaves: 40,
    roots: 30,
    defense: 15,
    repro: 15,
  });

  const rootCoords = useMemo(() => serializeRootTiles(runState.plant.rootTiles), [runState]);
  const rootSet = runState.plant.rootTiles;

  const handleAllocationChange = (key: keyof typeof allocations, value: number) => {
    const nextValue = clamp(value, 0, 100);
    const keys = Object.keys(allocations) as Array<keyof typeof allocations>;
    const others = keys.filter((item) => item !== key);
    const otherSum = others.reduce((sum, item) => sum + allocations[item], 0);
    const remaining = 100 - nextValue;
    const next = { ...allocations, [key]: nextValue };

    if (otherSum === 0) {
      const split = Math.floor(remaining / others.length);
      let distributed = 0;
      others.forEach((item, index) => {
        const val = index === others.length - 1 ? remaining - distributed : split;
        distributed += val;
        next[item] = val;
      });
    } else {
      let distributed = 0;
      others.forEach((item, index) => {
        const raw = (allocations[item] / otherSum) * remaining;
        const val = index === others.length - 1 ? remaining - distributed : Math.round(raw);
        distributed += val;
        next[item] = val;
      });
    }

    setAllocations(next);
  };

  const handleTileClick = (coord: Coord) => {
    if (rootSet.has(`${coord.x},${coord.y}`)) {
      return;
    }
    if (!isAdjacentToRoot(rootSet, coord)) {
      return;
    }
    setTarget(coord);
  };

  const handleEndDay = () => {
    const normalized = normalizeAllocations(percentToAllocation(allocations));
    const result = stepDay(runState, normalized, target);
    setRunState(result.state);
    setTarget(null);
  };

  const canExpand =
    runState.plant.rootTiles.size <
    1 + Math.floor(runState.plant.rootMass / ROOT_MASS_PER_TILE);

  return (
    <div className="app">
      <header>
        <div>
          <h1>Sprout</h1>
          <p className="subtitle">Single Plant Grid Life-Sim MVP</p>
        </div>
        <div className="status">
          <p>
            Day {Math.min(runState.day, DAY_LIMIT)} / {DAY_LIMIT}
          </p>
          <p className={`badge ${runState.status}`}>
            {runState.status === "playing" && "Growing"}
            {runState.status === "won" && "Seeded!"}
            {runState.status === "lost" && "Withered"}
          </p>
        </div>
      </header>

      <main>
        <section className="grid-panel">
          <div className="view-toggle">
            <button
              type="button"
              className={viewMode === "moisture" ? "active" : ""}
              onClick={() => setViewMode("moisture")}
            >
              Moisture
            </button>
            <button
              type="button"
              className={viewMode === "nutrients" ? "active" : ""}
              onClick={() => setViewMode("nutrients")}
            >
              Nutrients
            </button>
          </div>
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
              gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
            }}
          >
            {runState.world.grid.map((row, y) =>
              row.map((tile, x) => {
                const key = `${x},${y}`;
                const isRoot = rootSet.has(key);
                const isCenter = x === Math.floor(GRID_SIZE / 2) && y === Math.floor(GRID_SIZE / 2);
                const isTarget = target?.x === x && target?.y === y;
                const value = viewMode === "moisture" ? tile.moisture : tile.nutrients;
                const color = colorForValue(value, viewMode === "moisture" ? 200 : 110);
                return (
                  <button
                    key={key}
                    type="button"
                    className={`tile ${isRoot ? "root" : ""} ${
                      isTarget ? "target" : ""
                    } ${isCenter ? "center" : ""}`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleTileClick({ x, y })}
                  >
                    {isCenter && <span className="center-marker">●</span>}
                  </button>
                );
              }),
            )}
          </div>
          <div className="hint">
            {canExpand
              ? "Select an adjacent tile to guide root expansion."
              : "Grow more roots to expand further."}
          </div>
        </section>

        <section className="control-panel">
          <div className="stats">
            <h2>How it works</h2>
            <ul className="explain">
              <li>
                <strong>Leaves</strong> generate energy, but water and nutrients cap production.
              </li>
              <li>
                <strong>Maintenance</strong> is paid first. Low energy means less growth.
              </li>
              <li>
                <strong>Roots</strong> increase daily water/nutrient uptake and unlock new tiles.
              </li>
              <li>
                <strong>Defense</strong> reduces pest damage with diminishing returns.
              </li>
              <li>
                <strong>HP</strong> is vitality; drought and pests lower it toward zero.
              </li>
            </ul>
          </div>
          <div className="stats">
            <h2>Plant Stats</h2>
            <div className="stat-grid">
              <div>
                <span>HP</span>
                <strong>{formatNumber(runState.plant.health)}</strong>
              </div>
              <div>
                <span>Leaf Mass</span>
                <strong>{formatNumber(runState.plant.leafMass)}</strong>
              </div>
              <div>
                <span>Root Mass</span>
                <strong>{formatNumber(runState.plant.rootMass)}</strong>
              </div>
              <div>
                <span>Defense</span>
                <strong>{formatNumber(runState.plant.defense)}</strong>
              </div>
              <div>
                <span>Repro</span>
                <strong>{formatNumber(runState.plant.repro)}</strong>
              </div>
              <div>
                <span>Root Tiles</span>
                <strong>{rootCoords.length}</strong>
              </div>
            </div>
            <div className="goals">
              <p>
                Seed target: <strong>{REPRO_TARGET}</strong> by day {DAY_LIMIT}.
              </p>
              <p>
                Start values: LM {STARTING_STATS.leafMass}, RM {STARTING_STATS.rootMass}.
              </p>
              <p>
                HP reflects overall vitality (drought + pests reduce it). Keep HP above zero to
                survive.
              </p>
            </div>
          </div>

          <div className="allocations">
            <h2>Daily Energy Allocation</h2>
            {([
              { key: "leaves", label: "Leaves" },
              { key: "roots", label: "Roots" },
              { key: "defense", label: "Defense" },
              { key: "repro", label: "Reproduction" },
            ] as const).map((item) => (
              <label key={item.key} className="slider-row">
                <span>{item.label}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={allocations[item.key]}
                  onChange={(event) =>
                    handleAllocationChange(item.key, Number(event.target.value))
                  }
                />
                <strong>{allocations[item.key]}%</strong>
              </label>
            ))}
          </div>

          <button type="button" className="end-day" onClick={handleEndDay}>
            End Day
          </button>

          <div className="day-stats">
            <h2>Today</h2>
            {runState.lastStats ? (
              <ul>
                <li>Energy: {formatNumber(runState.lastStats.energy)}</li>
                <li>Maintenance: {formatNumber(runState.lastStats.maintenance)}</li>
                <li>Net Energy: {formatNumber(runState.lastStats.netEnergy)}</li>
                {runState.lastStats.netEnergy <= 0 ? (
                  <li className="warning">Growth stalled: energy did not cover maintenance.</li>
                ) : null}
                <li>Water Factor: {formatNumber(runState.lastStats.waterFactor)}</li>
                <li>
                  Water: {formatNumber(runState.lastStats.waterUptake)} /{" "}
                  {formatNumber(runState.lastStats.waterDemand)}
                </li>
                <li>Nutrient Factor: {formatNumber(runState.lastStats.nutrientFactor)}</li>
                <li>
                  Nutrients: {formatNumber(runState.lastStats.nutrientUptake)} /{" "}
                  {formatNumber(runState.lastStats.nutrientDemand)}
                </li>
                <li>Pest Pressure: {formatNumber(runState.lastStats.pestPressure)}</li>
                <li>Leaf Growth: +{formatNumber(runState.lastStats.leafGrowth)}</li>
                <li>Leaf Loss: -{formatNumber(runState.lastStats.leafLoss)}</li>
                <li>Net Leaf Change: {formatNumber(runState.lastStats.netLeafChange)}</li>
                <li>Net Root Change: +{formatNumber(runState.lastStats.netRootChange)}</li>
                <li>Net HP Change: {formatNumber(runState.lastStats.netHpChange)}</li>
                <li>HP Loss (Drought): -{formatNumber(runState.lastStats.droughtDamage)}</li>
                <li>HP Loss (Pests): -{formatNumber(runState.lastStats.pestHpDamage)}</li>
                <li>Rain: {runState.lastStats.rainLabel}</li>
              </ul>
            ) : (
              <p>Pick your sliders, then end the day.</p>
            )}
          </div>

          <div className="journal">
            <h2>Journal</h2>
            <ol>
              {runState.journal.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ol>
          </div>
        </section>
      </main>
    </div>
  );
};
