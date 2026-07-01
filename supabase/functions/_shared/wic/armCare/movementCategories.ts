// Phase 10 — Arm Care Movement Categories

export type ArmCareCategory =
  | "throwing_day"
  | "non_throwing_day"
  | "bullpen"
  | "starter"
  | "reliever"
  | "position_player"
  | "two_way"
  | "recovery"
  | "return_to_throwing";

export const ALL_ARM_CARE_CATEGORIES: readonly ArmCareCategory[] = [
  "throwing_day","non_throwing_day","bullpen","starter","reliever",
  "position_player","two_way","recovery","return_to_throwing",
];

export interface CategorizedArmCareMovement {
  slug: string;
  arm_care_category: ArmCareCategory | string | null;
}

export function coverageOf(rxs: readonly CategorizedArmCareMovement[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rxs) {
    const c = (r.arm_care_category ?? "__unknown__") as string;
    out[c] = (out[c] ?? 0) + 1;
  }
  return out;
}

export function missingCategories(
  required: readonly ArmCareCategory[],
  rxs: readonly CategorizedArmCareMovement[],
): ArmCareCategory[] {
  const present = new Set(rxs.map((r) => r.arm_care_category as ArmCareCategory));
  return required.filter((c) => !present.has(c));
}
