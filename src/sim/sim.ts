import {
  COZY_LINES,
  DAY_LIMIT,
  ENERGY,
  GRID_SIZE,
  RAIN,
  REPRO_TARGET,
  RESOURCE,
  ROOT_MASS_PER_TILE,
  SEED_RESERVES,
  STARTING_STATS,
  THREATS,
} from "../constants";

export type Coord = { x: number; y: number };
export type Tile = { moisture: number; nutrients: number; light: number };
export type World = { grid: Tile[][] };

export type PlantState = {
  leafMass: number;
  rootMass: number;
  defense: number;
  repro: number;
  health: number;
  rootTiles: Set<string>;
  leafZeroDays: number;
  seedEnergy: number;
  seedWater: number;
  seedNutrients: number;
};

export type DayStats = {
  energy: number;
  netEnergy: number;
  maintenance: number;
  waterFactor: number;
  nutrientFactor: number;
  waterUptake: number;
  waterDemand: number;
  nutrientUptake: number;
  nutrientDemand: number;
  seedEnergyUsed: number;
  seedWaterUsed: number;
  seedNutrientsUsed: number;
  leafGrowth: number;
  netLeafChange: number;
  rootGrowth: number;
  netRootChange: number;
  defenseGrowth: number;
  reproGrowth: number;
  leafLoss: number;
  droughtDamage: number;
  pestHpDamage: number;
  netHpChange: number;
  pestPressure: number;
  rainLabel: string;
};

export type RunState = {
  day: number;
  rng: RNG;
  world: World;
  plant: PlantState;
  journal: string[];
  status: "playing" | "won" | "lost";
  lastStats: DayStats | null;
};

export type Allocation = {
  leaves: number;
  roots: number;
  defense: number;
  repro: number;
};

export type StepResult = {
  state: RunState;
  log: string;
};

export class RNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 2 ** 32;
  }

  pick<T>(list: T[]): T {
    const index = Math.floor(this.next() * list.length);
    return list[Math.min(index, list.length - 1)];
  }

  getSeed(): number {
    return this.seed;
  }
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const coordKey = (coord: Coord) => `${coord.x},${coord.y}`;

const parseKey = (key: string): Coord => {
  const [x, y] = key.split(",").map(Number);
  return { x, y };
};

export const createWorld = (): World => ({
  grid: Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({
      moisture: 0.6,
      nutrients: 0.6,
      light: 1,
    })),
  ),
});

export const createInitialState = (seed = 1234): RunState => {
  const center = Math.floor(GRID_SIZE / 2);
  const plant: PlantState = {
    leafMass: STARTING_STATS.leafMass,
    rootMass: STARTING_STATS.rootMass,
    defense: STARTING_STATS.defense,
    repro: STARTING_STATS.repro,
    health: STARTING_STATS.health,
    rootTiles: new Set([coordKey({ x: center, y: center })]),
    leafZeroDays: 0,
    seedEnergy: SEED_RESERVES.energy,
    seedWater: SEED_RESERVES.water,
    seedNutrients: SEED_RESERVES.nutrients,
  };

  return {
    day: 1,
    rng: new RNG(seed),
    world: createWorld(),
    plant,
    journal: [],
    status: "playing",
    lastStats: null,
  };
};

const getAdjacent = (coord: Coord): Coord[] => [
  { x: coord.x + 1, y: coord.y },
  { x: coord.x - 1, y: coord.y },
  { x: coord.x, y: coord.y + 1 },
  { x: coord.x, y: coord.y - 1 },
].filter(
  (tile) => tile.x >= 0 && tile.x < GRID_SIZE && tile.y >= 0 && tile.y < GRID_SIZE,
);

const rainForDay = (rng: RNG) => {
  const roll = rng.next();
  if (roll < RAIN.heavyChance) {
    return { amount: RAIN.heavyAmount, label: "Heavy rain" };
  }
  if (roll < RAIN.heavyChance + RAIN.noneChance) {
    return { amount: 0, label: "No rain" };
  }
  return { amount: RAIN.lightAmount, label: "Light rain" };
};

const applyRain = (world: World, rainAmount: number, heavy: boolean) => {
  world.grid.forEach((row) => {
    row.forEach((tile) => {
      tile.moisture = clamp(tile.moisture + rainAmount - RAIN.evaporation, 0, 1);
      const leach = heavy ? RAIN.heavyLeach : 0;
      tile.nutrients = clamp(tile.nutrients + RAIN.nutrientRegen - leach, 0, 1);
    });
  });
};

const computeTotals = (world: World, rootTiles: Set<string>) => {
  let waterAvailable = 0;
  let nutrientAvailable = 0;

  rootTiles.forEach((key) => {
    const { x, y } = parseKey(key);
    const tile = world.grid[y][x];
    waterAvailable += tile.moisture * RESOURCE.waterPerTile;
    nutrientAvailable += tile.nutrients * RESOURCE.nutrientPerTile;
  });

  return { waterAvailable, nutrientAvailable };
};

const depleteResources = (
  world: World,
  rootTiles: Set<string>,
  waterUptake: number,
  nutrientUptake: number,
  totals: { waterAvailable: number; nutrientAvailable: number },
) => {
  const waterFactor = totals.waterAvailable > 0 ? waterUptake / totals.waterAvailable : 0;
  const nutrientFactor =
    totals.nutrientAvailable > 0 ? nutrientUptake / totals.nutrientAvailable : 0;

  rootTiles.forEach((key) => {
    const { x, y } = parseKey(key);
    const tile = world.grid[y][x];
    const tileWater = tile.moisture * RESOURCE.waterPerTile;
    const tileNutrients = tile.nutrients * RESOURCE.nutrientPerTile;

    if (totals.waterAvailable > 0) {
      const waterLoss = (tileWater * waterFactor) / RESOURCE.waterPerTile;
      tile.moisture = clamp(tile.moisture - waterLoss, 0, 1);
    }

    if (totals.nutrientAvailable > 0) {
      const nutrientLoss = (tileNutrients * nutrientFactor) / RESOURCE.nutrientPerTile;
      tile.nutrients = clamp(tile.nutrients - nutrientLoss, 0, 1);
    }
  });
};

const chooseExpansionTile = (
  world: World,
  rootTiles: Set<string>,
  target: Coord | null,
) => {
  const candidates = new Map<string, Coord>();
  rootTiles.forEach((key) => {
    const coord = parseKey(key);
    getAdjacent(coord).forEach((adjacent) => {
      const adjKey = coordKey(adjacent);
      if (!rootTiles.has(adjKey)) {
        candidates.set(adjKey, adjacent);
      }
    });
  });

  if (candidates.size === 0) {
    return null;
  }

  if (target) {
    const key = coordKey(target);
    if (candidates.has(key)) {
      return target;
    }
  }

  let best: Coord | null = null;
  let bestScore = -Infinity;

  candidates.forEach((coord) => {
    const tile = world.grid[coord.y][coord.x];
    const score = tile.moisture + tile.nutrients;
    if (score > bestScore) {
      bestScore = score;
      best = coord;
    }
  });

  return best;
};

const updateStatus = (state: RunState, plant: PlantState) => {
  if (plant.health <= 0 || plant.leafZeroDays >= 3) {
    return "lost" as const;
  }

  if (plant.repro >= REPRO_TARGET && state.day <= DAY_LIMIT && plant.health > 0) {
    return "won" as const;
  }

  return "playing" as const;
};

export const stepDay = (
  state: RunState,
  allocation: Allocation,
  target: Coord | null,
): StepResult => {
  const nextState: RunState = {
    ...state,
    world: state.world,
    plant: {
      ...state.plant,
      rootTiles: new Set(state.plant.rootTiles),
    },
  };

  if (state.status !== "playing") {
    return { state: nextState, log: "The season is already decided." };
  }

  const rain = rainForDay(nextState.rng);
  applyRain(nextState.world, rain.amount, rain.label === "Heavy rain");

  const waterDemand = RESOURCE.baseWaterDemand + nextState.plant.leafMass * RESOURCE.demandPerLeaf;
  const nutrientDemand =
    RESOURCE.baseNutrientDemand + nextState.plant.leafMass * RESOURCE.demandPerLeafN;

  const totals = computeTotals(nextState.world, nextState.plant.rootTiles);
  const baseWaterUptake = Math.min(
    totals.waterAvailable,
    nextState.plant.rootMass * RESOURCE.waterUptakePerRoot,
  );
  const baseNutrientUptake = Math.min(
    totals.nutrientAvailable,
    nextState.plant.rootMass * RESOURCE.nutrientUptakePerRoot,
  );
  const seedWaterUsed = Math.min(
    nextState.plant.seedWater,
    Math.max(waterDemand - baseWaterUptake, 0),
  );
  const seedNutrientsUsed = Math.min(
    nextState.plant.seedNutrients,
    Math.max(nutrientDemand - baseNutrientUptake, 0),
  );
  nextState.plant.seedWater -= seedWaterUsed;
  nextState.plant.seedNutrients -= seedNutrientsUsed;

  const waterUptake = baseWaterUptake + seedWaterUsed;
  const nutrientUptake = baseNutrientUptake + seedNutrientsUsed;

  depleteResources(
    nextState.world,
    nextState.plant.rootTiles,
    baseWaterUptake,
    baseNutrientUptake,
    totals,
  );

  const waterFactor = clamp(waterUptake / waterDemand, 0, 1);
  const nutrientFactor = clamp(nutrientUptake / nutrientDemand, 0.2, 1);

  const energy =
    nextState.plant.leafMass * ENERGY.basePhoto * waterFactor * nutrientFactor;
  const maint =
    nextState.plant.leafMass * ENERGY.leafMaint +
    nextState.plant.rootMass * ENERGY.rootMaint +
    nextState.plant.defense * ENERGY.defMaint;
  const seedEnergyUsed = Math.min(nextState.plant.seedEnergy, Math.max(maint - energy, 0));
  nextState.plant.seedEnergy -= seedEnergyUsed;
  const netEnergy = Math.max(energy + seedEnergyUsed - maint, 0);

  const leafGrowth = netEnergy * allocation.leaves * ENERGY.leafGrowRate;
  const rootGrowth = netEnergy * allocation.roots * ENERGY.rootGrowRate;
  const defenseGrowth = netEnergy * allocation.defense * ENERGY.defGrowRate;
  const reproGrowth = netEnergy * allocation.repro * ENERGY.reproGrowRate;

  nextState.plant.leafMass += leafGrowth;
  nextState.plant.rootMass += rootGrowth;
  nextState.plant.defense += defenseGrowth;
  nextState.plant.repro += reproGrowth;

  const maxTilesAllowed = 1 + Math.floor(nextState.plant.rootMass / ROOT_MASS_PER_TILE);
  if (nextState.plant.rootTiles.size < maxTilesAllowed) {
    const expansion = chooseExpansionTile(nextState.world, nextState.plant.rootTiles, target);
    if (expansion) {
      nextState.plant.rootTiles.add(coordKey(expansion));
    }
  }

  const hpStart = nextState.plant.health;
  let droughtDamage = 0;
  if (waterFactor < THREATS.droughtThreshold) {
    droughtDamage = (THREATS.droughtThreshold - waterFactor) * THREATS.droughtDamageScale;
    nextState.plant.health = clamp(nextState.plant.health - droughtDamage, 0, 100);
  }

  let pestPressure = nextState.rng.next() * THREATS.pestBaseMax;
  if (nextState.rng.next() < THREATS.pestSpikeChance) {
    pestPressure = Math.min(1, pestPressure + THREATS.pestSpikeAmount);
  }

  const defEffect =
    nextState.plant.defense / (nextState.plant.defense + THREATS.defHalfSat);
  const leafLoss =
    nextState.plant.leafMass * pestPressure * THREATS.pestDamageRate * (1 - defEffect);
  nextState.plant.leafMass = Math.max(0, nextState.plant.leafMass - leafLoss);
  const pestHpDamage = pestPressure * THREATS.pestHpDamageRate * (1 - defEffect);
  nextState.plant.health = clamp(
    nextState.plant.health - pestHpDamage,
    0,
    100,
  );

  if (nextState.plant.leafMass <= 0) {
    nextState.plant.leafZeroDays += 1;
  } else {
    nextState.plant.leafZeroDays = 0;
  }

  const cozyLine = nextState.rng.pick(COZY_LINES);
  const log = `Day ${nextState.day}: ${rain.label}. Water ${waterFactor.toFixed(
    2,
  )}, pests ${pestPressure.toFixed(2)}. ${cozyLine}`;

  nextState.journal = [log, ...nextState.journal].slice(0, 10);
  nextState.lastStats = {
    energy: energy,
    netEnergy,
    maintenance: maint,
    waterFactor,
    nutrientFactor,
    waterUptake,
    waterDemand,
    nutrientUptake,
    nutrientDemand,
    seedEnergyUsed,
    seedWaterUsed,
    seedNutrientsUsed,
    leafGrowth,
    netLeafChange: leafGrowth - leafLoss,
    rootGrowth,
    netRootChange: rootGrowth,
    defenseGrowth,
    reproGrowth,
    leafLoss,
    droughtDamage,
    pestHpDamage,
    netHpChange: nextState.plant.health - hpStart,
    pestPressure,
    rainLabel: rain.label,
  };

  nextState.status = updateStatus(nextState, nextState.plant);
  nextState.day += 1;

  return { state: nextState, log };
};

export const serializeRootTiles = (rootTiles: Set<string>) =>
  Array.from(rootTiles).map(parseKey);

export const isAdjacentToRoot = (rootTiles: Set<string>, coord: Coord) => {
  return Array.from(rootTiles).some((key) => {
    const root = parseKey(key);
    return Math.abs(root.x - coord.x) + Math.abs(root.y - coord.y) === 1;
  });
};

export const normalizeAllocations = (allocations: Allocation): Allocation => {
  const total = allocations.leaves + allocations.roots + allocations.defense + allocations.repro;
  if (total === 0) {
    return { leaves: 0.25, roots: 0.25, defense: 0.25, repro: 0.25 };
  }
  return {
    leaves: allocations.leaves / total,
    roots: allocations.roots / total,
    defense: allocations.defense / total,
    repro: allocations.repro / total,
  };
};
