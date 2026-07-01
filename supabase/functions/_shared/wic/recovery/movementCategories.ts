// Phase 10 — Recovery Movement Categories

export type RecoveryCategory =
  | "cns"
  | "tissue"
  | "mobility"
  | "regeneration"
  | "deload"
  | "post_game"
  | "travel"
  | "sleep";

export const ALL_RECOVERY_CATEGORIES: readonly RecoveryCategory[] = [
  "cns","tissue","mobility","regeneration","deload","post_game","travel","sleep",
];

export interface CategorizedRecoveryMovement {
  slug: string;
  recovery_category: RecoveryCategory | string | null;
}

export function coverageOf(rxs: readonly CategorizedRecoveryMovement[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rxs) {
    const c = (r.recovery_category ?? "__unknown__") as string;
    out[c] = (out[c] ?? 0) + 1;
  }
  return out;
}

export function missingCategories(
  required: readonly RecoveryCategory[],
  rxs: readonly CategorizedRecoveryMovement[],
): RecoveryCategory[] {
  const present = new Set(rxs.map((r) => r.recovery_category as RecoveryCategory));
  return required.filter((c) => !present.has(c));
}
