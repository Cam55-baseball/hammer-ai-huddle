// Owner Oct 28 "Add fields": owner conditioning drills carry their own work time,
// rest, rounds and distance. They are validated against the EXISTING run rest
// rules (runRest.ts) — never a new limit — and only serve the weekly running
// floor. Low readiness halves the rounds (rounded up); rest is never shortened.
import { sprintRestSeconds } from "../runRest.ts";

export type OwnerConditioningKind = "run" | "base_route" | "sprint" | "shuttle" | "jump" | "carry" | "sled";
/** Owner Oct 31: yard-measured kinds count toward the 1000-yard session cap; jumps count contacts. */
export const YARD_KINDS = new Set(["run", "base_route", "sprint", "shuttle", "carry", "sled"]);
export const RUNNING_KINDS = new Set(["run", "base_route", "sprint", "shuttle"]);
export const PROGRAMS = [["5tool", "5Tool Player"], ["pitcher", "Complete Pitcher"], ["golden2way", "Golden 2Way"]] as const;
export interface OwnerConditioningFields {
  conditioning_kind?: string | null;
  work_seconds?: number | null;
  rest_seconds?: number | null;
  rounds?: number | null;
  distance_feet?: number | null;
  bases_per_rep?: number | null;
  base_distance_feet?: number | null;
  sports?: string[];
  contacts?: number | null;
  load_lbs?: number | null;
  carry_yards?: number | null;
  conditioning_programs?: string[] | null;
  pitch_role_fit?: string[] | null;
}

const int = (v: unknown, lo: number, hi: number) => typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;
export const sportBaseFeet = (sport: string) => (sport === "softball" ? 60 : 90);

/** Plain-language problems; empty = the drill may be served. */
export function ownerConditioningProblems(r: OwnerConditioningFields): string[] {
  const out: string[] = [];
  const kind = r.conditioning_kind;
  if (!kind || !["run", "base_route", "sprint", "shuttle", "jump", "carry", "sled"].includes(kind)) return ["a conditioning type"];
  if (!int(r.rounds, 1, 20)) out.push("rounds (1 to 20)");
  if (kind === "jump") {
    if (!int(r.contacts, 1, 200)) out.push("contacts per round (1 to 200)");
    if (!int(r.rest_seconds, 0, 600)) out.push("a rest time (0 to 600 seconds)");
    return out;
  }
  if (kind === "carry" || kind === "sled") {
    if (!int(r.carry_yards, 1, 200)) out.push("yards per round (1 to 200)");
    if (typeof r.load_lbs !== "number" || !(r.load_lbs > 0) || r.load_lbs > 1000) out.push("a load in pounds");
    if (kind === "carry" && !int(r.work_seconds, 1, 600)) out.push("a carry time (1 to 600 seconds)");
    if (!int(r.rest_seconds, 0, 600)) out.push("a rest time (0 to 600 seconds)");
    if (int(r.rounds, 1, 20) && int(r.carry_yards, 1, 200) && (r.rounds as number) * (r.carry_yards as number) > 1000) out.push("no more than 1000 yards in total");
    return out;
  }
  if (!int(r.work_seconds, 1, 600)) out.push("a work time (1 to 600 seconds)");
  if (!int(r.rest_seconds, 0, 600)) out.push("a rest time (0 to 600 seconds)");
  if (kind === "run" || kind === "sprint" || kind === "shuttle") {
    if (!int(r.distance_feet, 1, 1200)) out.push("a run distance in feet");
    else if (int(r.rounds, 1, 20) && (r.rounds as number) * (r.distance_feet as number) > 3000) out.push("no more than 1000 yards in total");
    else {
      const min = sprintRestSeconds(r.distance_feet);
      if (min !== null && int(r.rest_seconds, 0, 600) && (r.rest_seconds as number) < min) out.push(`at least ${min} seconds rest for ${r.distance_feet} ft (1 minute per 10 yards, up to 5)`);
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

export interface OwnerConditioningDose { rounds: number; work_seconds: number; rest_seconds: number; distance_feet: number; contacts: number | null; load_lbs: number | null; bases_per_rep: number | null; base_distance_feet: number | null; low: boolean }

export function ownerConditioningDose(r: OwnerConditioningFields, lowReadiness: boolean): OwnerConditioningDose | null {
  if (ownerConditioningProblems(r).length) return null;
  const rounds = lowReadiness ? Math.max(1, Math.ceil((r.rounds as number) / 2)) : (r.rounds as number);
  const base = r.conditioning_kind === "base_route";
  return {
    rounds, work_seconds: r.work_seconds ?? 0, rest_seconds: r.rest_seconds as number,
    distance_feet: base ? (r.bases_per_rep as number) * (r.base_distance_feet as number) : r.conditioning_kind === 'jump' ? 0 : ['carry','sled'].includes(String(r.conditioning_kind)) ? (r.carry_yards ?? 0) * 3 : (r.distance_feet as number),
    contacts: r.conditioning_kind === 'jump' ? r.contacts ?? null : null,
    load_lbs: ['carry','sled'].includes(String(r.conditioning_kind)) ? r.load_lbs ?? null : null,
    bases_per_rep: base ? (r.bases_per_rep as number) : null, base_distance_feet: base ? (r.base_distance_feet as number) : null, low: lowReadiness,
  };
}

/** Who may get this drill: base routes are position-player work; pitchers keep run drills only. */
export function ownerConditioningFits(r: OwnerConditioningFields, ctx: { sport: string; isPitcher: boolean; modules?: string[]; role?: string | null; runningOnly?: boolean }): boolean {
  if (!(r.sports ?? []).includes(ctx.sport)) return false;
  if (ctx.runningOnly !== false && !RUNNING_KINDS.has(String(r.conditioning_kind))) return false;
  const programs = r.conditioning_programs ?? [];
  if (programs.length && !programs.some((p) => ctx.modules?.includes(`${ctx.sport}_${p}`))) return false;
  const roles = r.pitch_role_fit ?? [];
  if (roles.length && (!ctx.isPitcher || !ctx.role || !roles.includes(ctx.role))) return false;
  if (ctx.isPitcher && r.conditioning_kind === "base_route") return false;
  return ownerConditioningProblems(r).length === 0;
}

export function ownerConditioningLine(name: string, d: OwnerConditioningDose, yardCap = false): string {
  const yd = Math.round(d.distance_feet / 3);
  if (d.contacts !== null) return `${name}: ${d.rounds} rounds × ${d.contacts} contacts (${d.rounds * d.contacts} contacts total), rest ${d.rest_seconds} seconds.${d.low ? ' Fewer rounds today because your readiness is lower.' : ''}`;
  const run = d.bases_per_rep ? `${d.bases_per_rep} base${d.bases_per_rep > 1 ? "s" : ""} (${yd} yd)` : `${yd} yd`;
  return `${name}: ${d.rounds} round${d.rounds > 1 ? "s" : ""} of ${run} (${d.rounds * yd} yd total${yardCap ? ", max 1000 yd" : ""})${d.load_lbs !== null ? ` at ${d.load_lbs} lb` : ''}${d.work_seconds > 0 ? `, about ${d.work_seconds} seconds of work` : ''}, rest ${d.rest_seconds} seconds.${d.low ? " Fewer rounds today because your readiness is lower. It still counts." : ""}`;
}
