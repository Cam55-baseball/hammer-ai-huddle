// Phase 9 — Speed Movement Category Engine
// Exclusive constitutional category assignment + coverage computation for the
// Speed engine. Mirrors the Phase 8 lift movementCategories module.

export type SpeedCategory =
  | "acceleration"
  | "top_speed"
  | "elastic"
  | "overspeed"
  | "resisted"
  | "reactive"
  | "deceleration"
  | "change_of_direction"
  | "plyometric"
  | "pap"
  | "mobility";

export const ALL_SPEED_CATEGORIES: readonly SpeedCategory[] = [
  "acceleration",
  "top_speed",
  "elastic",
  "overspeed",
  "resisted",
  "reactive",
  "deceleration",
  "change_of_direction",
  "plyometric",
  "pap",
  "mobility",
];

export interface CategorizedSpeedMovement {
  slug: string;
  speed_category: SpeedCategory | string | null;
}

export function coverageOf(
  rxs: readonly CategorizedSpeedMovement[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rxs) {
    const c = (r.speed_category ?? "__unknown__") as string;
    out[c] = (out[c] ?? 0) + 1;
  }
  return out;
}

export function missingCategories(
  required: readonly SpeedCategory[],
  rxs: readonly CategorizedSpeedMovement[],
): SpeedCategory[] {
  const present = new Set(rxs.map((r) => r.speed_category as SpeedCategory));
  return required.filter((c) => !present.has(c));
}
