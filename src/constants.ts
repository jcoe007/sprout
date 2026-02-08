export const GRID_SIZE = 11;
export const DAY_LIMIT = 30;

export const STARTING_STATS = {
  health: 100,
  leafMass: 1,
  rootMass: 1,
  defense: 0,
  repro: 0,
};

export const REPRO_TARGET = 30;
export const ROOT_MASS_PER_TILE = 2;

export const RAIN = {
  lightChance: 0.7,
  noneChance: 0.25,
  heavyChance: 0.05,
  lightAmount: 0.25,
  heavyAmount: 0.6,
  evaporation: 0.08,
  nutrientRegen: 0.005,
  heavyLeach: 0.02,
};

export const RESOURCE = {
  waterPerTile: 1,
  nutrientPerTile: 1,
  waterUptakePerRoot: 0.9,
  nutrientUptakePerRoot: 0.7,
  baseWaterDemand: 0.4,
  baseNutrientDemand: 0.3,
  demandPerLeaf: 0.3,
  demandPerLeafN: 0.2,
};

export const ENERGY = {
  basePhoto: 1.2,
  leafMaint: 0.08,
  rootMaint: 0.06,
  defMaint: 0.04,
  leafGrowRate: 0.9,
  rootGrowRate: 0.8,
  defGrowRate: 0.6,
  reproGrowRate: 0.7,
};

export const THREATS = {
  droughtThreshold: 0.6,
  droughtDamageScale: 10,
  pestBaseMax: 0.3,
  pestSpikeChance: 0.15,
  pestSpikeAmount: 0.7,
  defHalfSat: 5,
  pestDamageRate: 0.2,
  pestHpDamageRate: 5,
};

export const COZY_LINES = [
  "Warm light. The soil holds yesterday's rain.",
  "Roots taste something mineral and old.",
  "A soft breeze keeps the canopy honest.",
  "A quiet day, save for a few hungry mouths.",
  "Damp earth hums beneath the leaves.",
];
