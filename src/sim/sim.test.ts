import { describe, expect, it } from "vitest";
import { createInitialState, normalizeAllocations, stepDay } from "./sim";

const allocation = normalizeAllocations({
  leaves: 0.4,
  roots: 0.3,
  defense: 0.2,
  repro: 0.1,
});

const runDays = (seed: number, days: number) => {
  let state = createInitialState(seed);
  const snapshots: Array<Record<string, number>> = [];

  for (let day = 0; day < days; day += 1) {
    const result = stepDay(state, allocation, null);
    state = result.state;
    snapshots.push({
      day: state.day,
      health: Number(state.plant.health.toFixed(4)),
      leafMass: Number(state.plant.leafMass.toFixed(4)),
      rootMass: Number(state.plant.rootMass.toFixed(4)),
      defense: Number(state.plant.defense.toFixed(4)),
      repro: Number(state.plant.repro.toFixed(4)),
      rootTiles: state.plant.rootTiles.size,
    });
  }

  return snapshots;
};

describe("simulation determinism", () => {
  it("replays identical day-by-day outputs for a fixed seed", () => {
    const firstRun = runDays(1234, 7);
    const secondRun = runDays(1234, 7);
    expect(firstRun).toEqual(secondRun);
  });
});
