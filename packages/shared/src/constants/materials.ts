import type { MaterialType, MaterialUnit } from "../types/entities";

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  rock: "Rock / Crushed Stone",
  sand: "Sand",
  fill: "Fill Dirt",
  concrete: "Concrete",
  gravel: "Gravel",
  asphalt: "Asphalt",
  other: "Other",
};

export const MATERIAL_UNIT_LABELS: Record<MaterialUnit, string> = {
  ton: "Tons",
  cy: "Cubic Yards",
  load: "Loads",
};

export const DEFAULT_FUEL_SURCHARGE_PERCENT = 0.12; // 12%
