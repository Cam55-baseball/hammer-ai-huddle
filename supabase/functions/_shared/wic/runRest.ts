/** Owner Oct 21 rules. Feet are prescription units; no distance is inferred. */
export function sprintRestSeconds(distanceFeet: number | null | undefined): number | null {
  if (typeof distanceFeet !== "number" || !Number.isFinite(distanceFeet) || distanceFeet <= 0) return null;
  return Math.min(300, Math.ceil(distanceFeet / 30) * 60);
}

export function sprintRestWhy(distanceFeet: number | null | undefined): string | null {
  const seconds = sprintRestSeconds(distanceFeet);
  if (seconds == null) return null;
  return `Why this rest: after each run set, rest ${seconds / 60} minute${seconds === 60 ? "" : "s"} — 1 minute per 10 yards, up to 5 minutes for runs of 50 yards or more.`;
}

export type BaseRep = 1 | 2 | 3 | 4;
export interface DeclaredBaseRoute {
  sport: "baseball" | "softball";
  bases_per_rep: BaseRep;
  base_distance_feet: 60 | 90;
}

/** Catalog route must match both the selected sport and the complete recorded distance. */
export function declaredRouteBases(route: unknown, sport: "baseball" | "softball", distanceFeet: number | null | undefined): BaseRep | null {
  if (!route || typeof route !== "object") return null;
  const r = route as Partial<DeclaredBaseRoute>;
  const baseFeet = sport === "softball" ? 60 : 90;
  if (r.sport !== sport || r.base_distance_feet !== baseFeet ||
      typeof r.bases_per_rep !== "number" || ![1, 2, 3, 4].includes(r.bases_per_rep) ||
      distanceFeet !== r.bases_per_rep * baseFeet) return null;
  return r.bases_per_rep;
}
export const BASE_REST_TEXT = "Each single counts 1 base, a double 2, a triple 3 and a home run 4. Rest 30 seconds between reps. When your running total reaches 4 bases, rest 5 minutes, then start the base count at zero. Keep today's prescribed reps and distance.";

/** Reaching/passing home ends the cycle, with no remainder carried forward. */
export function conditioningRestAfterRep(basesSoFar: number, bases: BaseRep): { bases: number; reachedHome: boolean; seconds: number } {
  if (!Number.isInteger(basesSoFar) || basesSoFar < 0 || basesSoFar > 3 || ![1, 2, 3, 4].includes(bases)) {
    throw new Error("Invalid base-running rep");
  }
  const total = basesSoFar + bases;
  const reachedHome = total >= 4;
  return { bases: reachedHome ? 0 : total, reachedHome, seconds: reachedHome ? 300 : 30 };
}

/** Explicit existing base-route identities only; names never grant running. */
export function prescribedBases(slug: string, distanceFeet: number | null | undefined, route?: unknown, sport?: "baseball" | "softball"): BaseRep | null {
  if (route != null) return sport ? declaredRouteBases(route, sport, distanceFeet) : null;
  if (slug === "bases_home_2nd" || slug === "bases_1st_3rd") return sport === "softball" ? null : 2;
  if (slug === "repeat_90ft_bb" && distanceFeet === 90) return sport === "softball" ? null : 1;
  return null;
}