// Owner Oct 28 "Add fields": owner conditioning drills carry their own work time,
// rest, rounds and distance. They are validated against the EXISTING run rest
// rules (runRest.ts) — never a new limit — and only serve the weekly running
// floor. Low readiness halves the rounds (rounded up); rest is never shortened.
import { sprintRestSeconds } from "../runRest.ts";

export type OwnerConditioningKind = "run" | "base_route";
export interface OwnerConditioningFields {
  conditioning_kind?: string | null;
  work_seconds?: number | null;
  rest_seconds?: number | null;
  rounds?: number | null;
  distance_feet?: number | null;
  bases_per_rep?: number | null;
  base_distance_feet?: number | null;
  sports?: string[];
}

const int = (v: unknown, lo: number, hi: number) => typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;
export const sportBaseFeet = (sport: string) => (sport === "softball" ? 60 : 90);

/** Plain-language problems; empty = the drill may be served. */
export function ownerConditioningProblems(r: OwnerConditioningFields): string[] {
  const out: string[] = [];
  const kind = r.conditioning_kind;
  if (kind !== "run" && kind !== "base_route") return ["a conditioning type (run or base route)"];
  if (!int(r.rounds, 1, 20)) out.push("rounds (1 to 20)");
  if (!int(r.work_seconds, 1, 600)) out.push("a work time (1 to 600 seconds)");
  if (!int(r.rest_seconds, 0, 600)) out.push("a rest time (0 to 600 seconds)");
  if (kind === "run") {
    if (!int(r.distance_feet, 1, 1200)) out.push("a run distance in feet");
    else {
      const min = sprintRestSeconds(r.distance_feet)!;
      if (int(r.rest_seconds, 0, 600) && (r.rest_seconds as number) < min) out.push(`at least ${min} seconds rest for ${r.distance_feet} ft (1 minute per 10 yards, up to 5)`);
    }
  } else {
    const sports = r.sports ?? [];
    if (sports.length !== 1) out.push("exactly one sport (base distance is 90 ft baseball, 60 ft softball)");
    else if (r.base_distance_feet !== sportBaseFeet(sports[0])) out.push(`a ${sportBaseFeet(sports[0])} ft base distance for ${sports[0]}`);
    if (!int(r.bases_per_rep, 1, 4)) out.push("bases per rep (1 to 4)");
    if (int(r.rest_seconds, 0, 600) && (r.rest_seconds as number) < 30) out.push("at least 30 seconds rest between base reps");
  }
  return out;
}

export interface OwnerConditioningDose { rounds: number; work_seconds: number; rest_seconds: number; distance_feet: number; bases_per_rep: number | null; base_distance_feet: number | null; low: boolean }

export function ownerConditioningDose(r: OwnerConditioningFields, lowReadiness: boolean): OwnerConditioningDose | null {
  if (ownerConditioningProblems(r).length) return null;
  const rounds = lowReadiness ? Math.max(1, Math.ceil((r.rounds as number) / 2)) : (r.rounds as number);
  const base = r.conditioning_kind === "base_route";
  return {
    rounds, work_seconds: r.work_seconds as number, rest_seconds: r.rest_seconds as number,
    distance_feet: base ? (r.bases_per_rep as number) * (r.base_distance_feet as number) : (r.distance_feet as number),
    bases_per_rep: base ? (r.bases_per_rep as number) : null, base_distance_feet: base ? (r.base_distance_feet as number) : null, low: lowReadiness,
  };
}

/** Who may get this drill: base routes are position-player work; pitchers keep run drills only. */
export function ownerConditioningFits(r: OwnerConditioningFields, ctx: { sport: string; isPitcher: boolean }): boolean {
  if (!(r.sports ?? []).includes(ctx.sport)) return false;
  if (ctx.isPitcher && r.conditioning_kind === "base_route") return false;
  return ownerConditioningProblems(r).length === 0;
}

export function ownerConditioningLine(name: string, d: OwnerConditioningDose): string {
  const run = d.bases_per_rep ? `${d.bases_per_rep} base${d.bases_per_rep > 1 ? "s" : ""} (${d.distance_feet} ft)` : `${d.distance_feet} ft`;
  return `${name}: ${d.rounds} round${d.rounds > 1 ? "s" : ""} of ${run}, about ${d.work_seconds} seconds of work, rest ${d.rest_seconds} seconds.${d.low ? " Fewer rounds today because your readiness is lower. It still counts." : ""}`;
}
