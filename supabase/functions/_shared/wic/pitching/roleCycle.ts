// Owner Part B (Oct 31 2026): pitcher role cycle, mound/circle minimum, role lifts,
import { pitchingCounts, type PitcherGameRow } from "../pitchingCounts.ts";
import { judgePitching } from "../masteryPitchingStandards.ts";
import type { MasteryLevel } from "../masteryStandards.ts";
// sprint conditioning and the two-way arm split. Pure; shared by app and server.
// Only ORGANIZES work: every throw still passes the arm ledger, Pitch Smart, age,
// windmill and injury rules downstream, which may only remove work.

export type Sport = "baseball" | "softball";
export type PitchRole = "starter" | "bullpen" | "closer";
export type CycleDay = "start" | "outing" | "day_after" | "rest" | "long_toss" | "bullpen" | "light_mound" | "shortbox" | "pfp" | "available" | "pre_start";

export const FULL_DISTANCE_FT: Record<Sport, number> = { baseball: 60.5, softball: 43 };
/** Shortbox = 2/3 of the full pitching distance (≈40 ft baseball, ≈29 ft softball). */
export const SHORTBOX_FRACTION = 2 / 3;
export const shortboxFeet = (sport: Sport) => Math.round(FULL_DISTANCE_FT[sport] * SHORTBOX_FRACTION);
export const MOUND_MINIMUM_PER_WEEK = 3;
export const RELIEVER_VOLUME = 2 / 3;
export const TWO_WAY_MAJOR_SHARE = 0.7;

const DAY = 86_400_000;
const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
const between = (a: string, b: string) => Math.round((ms(b) - ms(a)) / DAY);

export interface CycleInput {
  sport: Sport;
  role: PitchRole;
  date: string;
  /** Dates actually pitched in a game (start or relief), any order. */
  outingDates: readonly string[];
  /** Planned/projected start dates. */
  plannedStarts: readonly string[];
  /** Game dates this player's team plays. */
  gameDates: readonly string[];
  /** Days the windmill program allows back-to-back circle work. */
  windmillAllowsDayTwo?: boolean;
}

/** One day of the role cycle, before the arm law trims anything. */
export function cycleDay(i: CycleInput): CycleDay {
  const past = [...i.outingDates].filter((d) => d < i.date).sort().reverse();
  const last = past[0];
  const since = last ? between(last, i.date) : 99;
  const startsToday = i.plannedStarts.includes(i.date) || (i.role === "starter" && i.outingDates.includes(i.date));
  const next = [...i.plannedStarts].filter((d) => d > i.date).sort()[0];
  const until = next ? between(i.date, next) : 99;
  if (i.role === "starter") {
    if (startsToday) return "start";
    if (since === 1) return "day_after";
    if (since === 2) return i.sport === "softball" && i.windmillAllowsDayTwo ? "light_mound" : "rest";
    if (until === 1) return "pre_start";
    if (since === 3) return "long_toss";
    if (since === 4) return "bullpen";
    return since % 2 === 1 ? "shortbox" : "light_mound";
  }
  // Bullpen arms and closers.
  if (i.outingDates.includes(i.date)) return "outing";
  const backToBack = past[1] != null && between(past[1], last!) === 1;
  if (since === 1) return "day_after";
  if (since === 2 && backToBack) return "day_after"; // 2nd recovery day after back-to-back outings
  if (i.gameDates.includes(i.date)) return "available";
  const dow = new Date(ms(i.date)).getUTCDay();
  if (dow === 0) return "rest";
  return dow % 3 === 0 ? "long_toss" : dow % 2 === 0 ? "shortbox" : "light_mound";
}

export interface MoundWork { kind: "full_bullpen" | "light_mound" | "shortbox" | "circle" | "shortbox_circle"; feet: number; intensity: "catch_light" | "medium" | "full"; label: string }

/** Mound (baseball) or circle (softball) work this day counts toward the 3×/week minimum. */
export function moundWork(sport: Sport, day: CycleDay): MoundWork | null {
  const full = FULL_DISTANCE_FT[sport];
  const sb = shortboxFeet(sport);
  const place = sport === "softball" ? "circle" : "mound";
  if (day === "bullpen") return { kind: sport === "softball" ? "circle" : "full_bullpen", feet: full, intensity: "medium", label: sport === "softball" ? "Circle session" : "Bullpen" };
  if (day === "shortbox") return { kind: sport === "softball" ? "shortbox_circle" : "shortbox", feet: sb, intensity: "catch_light", label: `Shortbox from the ${place} (${sb} ft) — command, pitches in the zone` };
  if (day === "available") return { kind: sport === "softball" ? "circle" : "light_mound", feet: full, intensity: "catch_light", label: `Available — light ${place} catch, short PFP` };
  if (day === "light_mound" || day === "pre_start") return { kind: sport === "softball" ? "circle" : "light_mound", feet: full, intensity: "catch_light", label: sport === "softball" ? "Light circle work — as light as playing catch" : "Light mound work — as light as playing catch" };
  return null;
}

export function dayLabel(sport: Sport, day: CycleDay): string {
  const place = sport === "softball" ? "circle" : "mound";
  switch (day) {
    case "start": return "Start — compete";
    case "outing": return "Outing — short, low-pitch";
    case "day_after": return "Light catch + 2-hand med-ball overhead throws (throwing mobility)";
    case "rest": return "Rest day — no throwing";
    case "long_toss": return "Long toss";
    case "bullpen": return sport === "softball" ? "Circle session" : "Bullpen";
    case "pre_start": return `Light ${place} work, no lower-body lift`;
    case "available": return moundWork(sport, day)!.label;
    case "pfp": return "Short PFP";
    default: return moundWork(sport, day)?.label ?? "";
  }
}

export interface LiftRule { volume: number; loadChange: false; heavy: boolean; noLowerBody: boolean; noLift: boolean }
/** Lifts never get lighter by role: relievers lose volume, not weight. */
export function liftRule(role: PitchRole, day: CycleDay, prevDay: CycleDay | null): LiftRule {
  return {
    volume: role === "starter" ? 1 : RELIEVER_VOLUME,
    loadChange: false,
    heavy: role === "starter" && prevDay === "rest",
    noLowerBody: day === "pre_start" || day === "start",
    noLift: day === "start" || day === "rest" || day === "pre_start",
  };
}
export const reliefSets = (sets: number, role: PitchRole) => role === "starter" ? sets : Math.max(2, Math.round(sets * RELIEVER_VOLUME));

const LOWER = /squat|deadlift|rdl|hinge|lunge|step[-_ ]?up|split|jump|bound|leg|calf|nordic|hip[-_ ]thrust|sled|cossack|clean|snatch/i;
export const isLowerBodyLift = (slug: string, pattern?: string | null) => LOWER.test(`${slug} ${pattern ?? ""}`);

/** Sprint conditioning: starters build max-effort capacity week to week; relievers repeat short sprints. */
/** Rep count only: distance and rest stay the sprint row's declared values and runRest rule. */
export function sprintDose(role: PitchRole, weekIndex: number): { reps: number; kind: "max_sprint" | "repeat_sprint" } {
  if (role === "starter") return { reps: Math.min(10, 4 + Math.max(0, Math.floor(weekIndex))), kind: "max_sprint" };
  return { reps: 6, kind: "repeat_sprint" };
}

/** Two-way split inside one budget: the minority kind may use at most 30% of the room left after warm-ups. */
export function minorityCap(room: number, focus: "pitcher" | "position" | null | undefined): { pitching: number; position: number } {
  if (focus === "pitcher") return { pitching: room, position: Math.floor(room * (1 - TWO_WAY_MAJOR_SHARE)) };
  if (focus === "position") return { pitching: Math.floor(room * (1 - TWO_WAY_MAJOR_SHARE)), position: room };
  return { pitching: room, position: room };
}
/** Minority allowance given what the majority kind actually kept: minority ≤ 30% of the arm work. */
export const minorityAllowance = (majorityKept: number) => Math.floor(majorityKept * (1 - TWO_WAY_MAJOR_SHARE) / TWO_WAY_MAJOR_SHARE);

/** Week checks used by the simulations. Returns plain-word violations. */
export function weekViolations(sport: Sport, role: PitchRole, days: readonly { date: string; day: CycleDay }[]): string[] {
  const out: string[] = [];
  // Game outings are real mound/circle throws and count toward the minimum.
  const mound = days.filter((d) => moundWork(sport, d.day) || d.day === "outing" || d.day === "start").length;
  if (mound < MOUND_MINIMUM_PER_WEEK) out.push(`only ${mound} ${sport === "softball" ? "circle" : "mound"} days`);
  for (let k = 1; k < days.length; k++) {
    const prev = days[k - 1].day, cur = days[k].day;
    if ((prev === "start" || prev === "outing") && cur !== "day_after" && !(role !== "starter" && cur === "outing")) out.push(`${days[k].date}: no recovery day after outing`);
    if (role === "starter" && prev === "start" && k + 1 < days.length && !(days[k + 1].day === "rest" || (sport === "softball" && days[k + 1].day === "light_mound"))) out.push(`${days[k + 1].date}: second day after start not rest`);
    if (cur === "start" && prev !== "pre_start" && k > 0) out.push(`${days[k].date}: day before start not light`);
  }
  return out;
}

// ── Owner Oct 31: command development (up to 5 mound/circle days) ─────────────
/** Pitchers struggling with command (from data only) may get up to this many mound/circle days. */
export const MOUND_COMMAND_MAX_PER_WEEK = 5;

export interface CommandEvidence {
  /** Walk rate of the latest COMPLETE batters-faced window and its starting standard (max). */
  walkRate?: number | null;
  walkMax?: number | null;
  /** Judged command stats against starting standards (first-pitch strike %, two-ball %). */
  stats?: readonly { key: string; status: string }[];
  /** Root pattern ids of accessible analysis findings for pitching. */
  analysisFindings?: readonly string[];
  /** Picked pitching/throwing goal ids. */
  goalIds?: readonly string[];
}

const COMMAND_STATS: Record<string, string> = {
  bb_pct: "Your walk rate is above the starting standard.",
  first_pitch_strike_pct: "Your first-pitch strikes are below the starting standard.",
  two_ball_pct: "Too many batters reach two balls compared with the starting standard.",
};

/** Data-only judge: never invents a struggle from missing data. */
export function commandStruggle(e: CommandEvidence | null | undefined): { struggling: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!e) return { struggling: false, reasons };
  if (typeof e.walkRate === "number" && typeof e.walkMax === "number" && e.walkRate > e.walkMax) reasons.push(COMMAND_STATS.bb_pct);
  for (const s of e.stats ?? []) if (COMMAND_STATS[s.key] && s.status === "Building" && !reasons.includes(COMMAND_STATS[s.key])) reasons.push(COMMAND_STATS[s.key]);
  if ((e.analysisFindings ?? []).some((f) => /command/i.test(f))) reasons.push("Your video analysis found a command problem.");
  if ((e.goalIds ?? []).includes("command")) reasons.push("You picked a command goal.");
  return { struggling: reasons.length > 0, reasons };
}

export const countsAsMoundDay = (sport: Sport, day: CycleDay) => !!moundWork(sport, day) || day === "start" || day === "outing";

const BLOCKED: Partial<Record<CycleDay, string>> = {
  rest: "it is your rest day",
  day_after: "it is a recovery day after pitching",
};

/**
 * Pick the extra light command days for one week (date order). Only non-mound throwing days
 * qualify; rest and recovery days never do. Adds only up to MOUND_COMMAND_MAX_PER_WEEK total.
 */
export function commandExtraDays(i: { sport: Sport; week: readonly { date: string; day: CycleDay }[]; struggling: boolean; limitPitching?: boolean }): { extra: string[]; blocked: { date: string; reason: string }[]; baseline: number } {
  const baseline = i.week.filter((d) => countsAsMoundDay(i.sport, d.day)).length;
  const extra: string[] = [];
  const blocked: { date: string; reason: string }[] = [];
  if (!i.struggling) return { extra, blocked, baseline };
  let room = Math.max(0, MOUND_COMMAND_MAX_PER_WEEK - baseline);
  for (const d of i.week) {
    if (countsAsMoundDay(i.sport, d.day) || room === 0) continue;
    const why = BLOCKED[d.day] ?? (i.limitPitching ? "you asked to limit your pitching" : null);
    if (why) { blocked.push({ date: d.date, reason: why }); continue; }
    extra.push(d.date);
    room--;
  }
  return { extra, blocked, baseline };
}

/**
 * First-pitch strike % and two-ball % (and walk %) judged on the latest COMPLETE batters-faced
 * window of logged pitching game lines — same window/standards as the Pitching identity card.
 * An incomplete window or unknown level returns no stats, so missing data never adds a day.
 */
export function commandStatsFromLines(
  games: readonly PitcherGameRow[], sport: Sport, level: MasteryLevel | null, overrides: Record<string, number | null | undefined>, size: number,
): { key: string; status: string }[] {
  if (!level || !(size > 0)) return [];
  const out: PitcherGameRow[] = []; let bf = 0, complete = false;
  for (const g of [...games].reverse()) { out.unshift(g); bf += typeof g.batters_faced === "number" ? g.batters_faced : 0; if (bf >= size) { complete = true; break; } }
  if (!complete) return [];
  return judgePitching(pitchingCounts(out), sport, level, overrides).parts
    .filter((p) => p.key === "first_pitch_strike_pct" || p.key === "two_ball_pct" || p.key === "bb_pct")
    .map((p) => ({ key: p.key, status: p.status }));
}
