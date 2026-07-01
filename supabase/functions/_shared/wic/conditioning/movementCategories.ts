// Phase 10 — Conditioning Movement Categories

export type ConditioningCategory =
  | "aerobic_base"
  | "aerobic_power"
  | "repeated_sprint"
  | "alactic_power"
  | "lactic_capacity"
  | "recovery_flush"
  | "tissue_prep"
  | "pitcher_specific";

export const ALL_CONDITIONING_CATEGORIES: readonly ConditioningCategory[] = [
  "aerobic_base",
  "aerobic_power",
  "repeated_sprint",
  "alactic_power",
  "lactic_capacity",
  "recovery_flush",
  "tissue_prep",
  "pitcher_specific",
];

export interface CategorizedConditioningMovement {
  slug: string;
  conditioning_category: ConditioningCategory | string | null;
}

export function coverageOf(rxs: readonly CategorizedConditioningMovement[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rxs) {
    const c = (r.conditioning_category ?? "__unknown__") as string;
    out[c] = (out[c] ?? 0) + 1;
  }
  return out;
}

export function missingCategories(
  required: readonly ConditioningCategory[],
  rxs: readonly CategorizedConditioningMovement[],
): ConditioningCategory[] {
  const present = new Set(rxs.map((r) => r.conditioning_category as ConditioningCategory));
  return required.filter((c) => !present.has(c));
}
