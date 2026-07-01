// Phase 9 — Bat Speed Movement Category Engine

export type BatSpeedCategory =
  | "overload"
  | "underload"
  | "elastic_rotation"
  | "rotational_strength"
  | "pap"
  | "med_ball"
  | "band"
  | "pvc"
  | "heavy_implement"
  | "light_implement"
  | "recovery_swing";

export const ALL_BAT_SPEED_CATEGORIES: readonly BatSpeedCategory[] = [
  "overload",
  "underload",
  "elastic_rotation",
  "rotational_strength",
  "pap",
  "med_ball",
  "band",
  "pvc",
  "heavy_implement",
  "light_implement",
  "recovery_swing",
];

export interface CategorizedBatMovement {
  slug: string;
  bat_speed_category: BatSpeedCategory | string | null;
}

export function coverageOf(rxs: readonly CategorizedBatMovement[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rxs) {
    const c = (r.bat_speed_category ?? "__unknown__") as string;
    out[c] = (out[c] ?? 0) + 1;
  }
  return out;
}

export function missingCategories(
  required: readonly BatSpeedCategory[],
  rxs: readonly CategorizedBatMovement[],
): BatSpeedCategory[] {
  const present = new Set(rxs.map((r) => r.bat_speed_category as BatSpeedCategory));
  return required.filter((c) => !present.has(c));
}
