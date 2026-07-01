// Phase 8 — Movement Category Engine
// Exclusive constitutional category assignment + coverage computation.

export type MovementCategory =
  | "compound_lower"
  | "compound_upper_push"
  | "compound_upper_pull"
  | "single_leg"
  | "rotation"
  | "anti_rotation"
  | "carry"
  | "core"
  | "arm_care"
  | "mobility"
  | "jump_landing"
  | "posterior_chain"
  | "hip"
  | "shoulder"
  | "foot_ankle";

export const ALL_CATEGORIES: readonly MovementCategory[] = [
  "compound_lower",
  "compound_upper_push",
  "compound_upper_pull",
  "single_leg",
  "rotation",
  "anti_rotation",
  "carry",
  "core",
  "arm_care",
  "mobility",
  "jump_landing",
  "posterior_chain",
  "hip",
  "shoulder",
  "foot_ankle",
];

export interface CategorizedMovement {
  slug: string;
  movement_category: MovementCategory | string | null;
}

/**
 * Return {category: count} for a set of prescribed movements.
 * A missing / unknown category is bucketed under "__unknown__" so callers can
 * surface it as a governance failure.
 */
export function coverageOf(rxs: readonly CategorizedMovement[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rxs) {
    const c = (r.movement_category ?? "__unknown__") as string;
    out[c] = (out[c] ?? 0) + 1;
  }
  return out;
}

export function duplicateCategories(rxs: readonly CategorizedMovement[]): MovementCategory[] {
  const cov = coverageOf(rxs);
  const out: MovementCategory[] = [];
  for (const [k, n] of Object.entries(cov)) {
    if (n > 1 && ALL_CATEGORIES.includes(k as MovementCategory)) {
      // Only certain categories are "single-slot only" per template — the
      // template decides what counts as duplicate. This helper reports raw
      // multiplicity; the session-builder tolerates repeats where legal.
      out.push(k as MovementCategory);
    }
  }
  return out;
}

export function missingCategories(
  required: readonly MovementCategory[],
  rxs: readonly CategorizedMovement[],
): MovementCategory[] {
  const present = new Set(rxs.map((r) => r.movement_category as MovementCategory));
  return required.filter((c) => !present.has(c));
}
