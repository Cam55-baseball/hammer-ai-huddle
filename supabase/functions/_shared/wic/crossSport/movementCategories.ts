// Phase 10 — Cross-Sport Movement Categories

export type CrossSportCategory =
  | "fascial_rotation"
  | "footwork"
  | "explosive_transfer"
  | "recovery_transfer"
  | "balance_transfer"
  | "visual_reaction"
  | "reflex"
  | "coordination"
  | "rotational_power"
  | "low_impact";

export const ALL_CROSS_SPORT_CATEGORIES: readonly CrossSportCategory[] = [
  "fascial_rotation","footwork","explosive_transfer","recovery_transfer","balance_transfer",
  "visual_reaction","reflex","coordination","rotational_power","low_impact",
];

export interface CategorizedCrossSportMovement {
  slug: string;
  cross_sport_category: CrossSportCategory | string | null;
}

export function coverageOf(rxs: readonly CategorizedCrossSportMovement[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rxs) {
    const c = (r.cross_sport_category ?? "__unknown__") as string;
    out[c] = (out[c] ?? 0) + 1;
  }
  return out;
}

export function missingCategories(
  required: readonly CrossSportCategory[],
  rxs: readonly CategorizedCrossSportMovement[],
): CrossSportCategory[] {
  const present = new Set(rxs.map((r) => r.cross_sport_category as CrossSportCategory));
  return required.filter((c) => !present.has(c));
}
