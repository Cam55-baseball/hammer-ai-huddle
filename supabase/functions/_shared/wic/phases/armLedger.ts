/**
 * Throwing Coverage v1 (amendment v1.4) — docs/wic/throwing-coverage-and-polish-v1.md
 *
 * ONE arm ledger for every athlete who throws, baseball and softball.
 * Pure and deterministic. Produces budgets, warnings and labels — never a dose.
 * Baseball pitchers keep Pitch Smart unchanged. Windmill counts are never
 * converted from baseball counts (separate tables, separate budgets).
 */
import { rampLength, type RampProfile } from "./rampLaw.ts";

export const ARM_LEDGER_VERSION = "arm_ledger_v1";

export type Sport = "baseball" | "softball";
export type ThrowRole = "position" | "catcher" | "pitcher" | "two_way" | "pitcher_catcher";
export type Intent = "low" | "moderate" | "high";

export interface ThrowAthlete { sport: Sport; role: ThrowRole; age: number | null }
export interface ThrowEvent {
  kind: "warmup" | "practice" | "pregame" | "game" | "long_toss" | "throwdown" | "pitch";
  count: number; intent: Intent; estimated: boolean;
}

/**
 * Owner-tunable defaults. Windmill values are the owner's (§1). The values
 * marked CHOSEN were not given by the owner and are flagged for review.
 */
export const ARM_DEFAULTS = {
  windmill: { gameMax: 100, dayMax: 140, maxConsecutiveDays: 3, restBetweenOutings: 2, youthDayInnings: 12, youthRestAfterInnings: 7 },
  /** CHOSEN — high-intent-equivalent throws per day for position players, by age. */
  positionDaily: [{ maxAge: 12, units: 40 }, { maxAge: 15, units: 55 }, { maxAge: 18, units: 70 }, { maxAge: 200, units: 85 }],
  /** CHOSEN — catchers carry extra volume; throw-downs still count as high intent. */
  catcherExtra: 15,
  /** CHOSEN — how much a throw counts toward the tank by intent. */
  intentWeight: { low: 0.25, moderate: 0.5, high: 1 } as Record<Intent, number>,
  /** CHOSEN — a pitcher who also catches is budgeted to this share of the stricter budget. */
  pitcherCatcherShare: 0.85,
  /** CHOSEN — softball tournament weekend budget per tournament day (pitches). */
  tournamentPerDay: 140,
  tournamentWarnAt: 0.8,
} as const;

export const isPitchingRole = (r: ThrowRole) => r === "pitcher" || r === "two_way" || r === "pitcher_catcher";
export const isCatchingRole = (r: ThrowRole) => r === "catcher" || r === "pitcher_catcher";
const isYouth = (age: number | null) => age === null || age <= 14;

/** Pitch Smart daily maximums (baseball only; unchanged). */
export function pitchSmartDailyMax(age: number | null): number {
  const a = age ?? 13;
  if (a <= 8) return 50;
  if (a <= 10) return 75;
  if (a <= 12) return 85;
  if (a <= 16) return 95;
  if (a <= 18) return 105;
  return 120;
}

function positionDaily(age: number | null, catcher: boolean): number {
  const a = age ?? 13;
  const base = ARM_DEFAULTS.positionDaily.find((b) => a <= b.maxAge)!.units;
  return catcher ? base + ARM_DEFAULTS.catcherExtra : base;
}

function pitcherDaily(a: ThrowAthlete): number {
  return a.sport === "baseball" ? pitchSmartDailyMax(a.age) : ARM_DEFAULTS.windmill.dayMax;
}
function pitcherWeekly(a: ThrowAthlete): number {
  // Baseball: rest tables make ~2.5 max outings a week the ceiling. Windmill: 3 days max in a row.
  return a.sport === "baseball" ? Math.round(pitchSmartDailyMax(a.age) * 2.5) : ARM_DEFAULTS.windmill.dayMax * ARM_DEFAULTS.windmill.maxConsecutiveDays;
}

export interface ArmBudget { daily: number; weekly: number; unit: "pitches" | "throws"; strictest: "pitcher" | "position" | null; tight: boolean }

/** Daily and weekly budgets. Two-way: the stricter one wins. Pitcher-catcher: tighter still. */
export function armBudget(a: ThrowAthlete): ArmBudget {
  const pos = { daily: positionDaily(a.age, isCatchingRole(a.role)), weekly: positionDaily(a.age, isCatchingRole(a.role)) * 4 };
  if (a.role === "position" || a.role === "catcher") return { ...pos, unit: "throws", strictest: null, tight: false };
  const pit = { daily: pitcherDaily(a), weekly: pitcherWeekly(a) };
  if (a.role === "pitcher") return { ...pit, unit: "pitches", strictest: null, tight: false };
  const daily = Math.min(pos.daily, pit.daily);
  const weekly = Math.min(pos.weekly, pit.weekly);
  const strictest = pos.daily <= pit.daily ? "position" : "pitcher";
  if (a.role === "two_way") return { daily, weekly, unit: "throws", strictest, tight: false };
  const s = ARM_DEFAULTS.pitcherCatcherShare;
  return { daily: Math.floor(daily * s), weekly: Math.floor(weekly * s), unit: "throws", strictest, tight: true };
}

/** Units a set of throws uses. A pitch always counts as high intent. */
export function throwUnits(events: ThrowEvent[]): number {
  return events.reduce((s, e) => s + e.count * (e.kind === "pitch" || e.kind === "throwdown" ? 1 : ARM_DEFAULTS.intentWeight[e.intent]), 0);
}

export type DayType = "off" | "practice" | "game" | "tournament";

/** Estimate throws when nothing is logged. Every event is marked estimated. */
export function estimateThrows(a: ThrowAthlete, day: DayType): ThrowEvent[] {
  if (day === "off") return [];
  const e = (kind: ThrowEvent["kind"], count: number, intent: Intent): ThrowEvent => ({ kind, count, intent, estimated: true });
  const out: ThrowEvent[] = [e("warmup", 30, "low")];
  const cat = isCatchingRole(a.role);
  if (day === "practice") {
    out.push(e("practice", cat ? 50 : a.role === "pitcher" ? 20 : 40, "moderate"));
    if (cat) out.push(e("throwdown", 8, "high"));
  } else {
    out.push(e("pregame", 20, "moderate"));
    if (cat) { out.push(e("game", 110, "low"), e("throwdown", 4, "high")); }
    else if (a.role !== "pitcher") out.push(e("game", 12, "high"));
  }
  return out;
}

export interface LedgerDay { units: number; pitches: number; highIntent: number; estimated: boolean; overDaily: boolean; warnings: string[] }

export function ledgerDay(a: ThrowAthlete, events: ThrowEvent[]): LedgerDay {
  const b = armBudget(a);
  const pitches = events.filter((e) => e.kind === "pitch").reduce((s, e) => s + e.count, 0);
  const units = throwUnits(events);
  const used = b.unit === "pitches" ? pitches : units;
  const warnings: string[] = [];
  if (a.sport === "baseball" && isPitchingRole(a.role) && pitches > pitchSmartDailyMax(a.age)) warnings.push("Over the daily pitch maximum for this age.");
  if (a.sport === "softball" && isPitchingRole(a.role) && pitches > ARM_DEFAULTS.windmill.dayMax) warnings.push(`Over ${ARM_DEFAULTS.windmill.dayMax} pitches today.`);
  if (used > b.daily) warnings.push("Over today's arm budget.");
  return {
    units: Math.round(units * 10) / 10, pitches,
    highIntent: events.filter((e) => e.intent === "high" || e.kind === "pitch" || e.kind === "throwdown").reduce((s, e) => s + e.count, 0),
    estimated: events.some((e) => e.estimated), overDaily: used > b.daily, warnings,
  };
}

export interface WindmillOuting { date: string; pitches: number; innings: number; gamePitches?: number[] }

/** Windmill rules (§1). Returns plain-words problems with pitching on `today`; empty = allowed. */
export function windmillCheck(age: number | null, history: WindmillOuting[], today: string, planned: { pitches: number; innings: number; gamePitches?: number[] }): string[] {
  const w = ARM_DEFAULTS.windmill;
  const out: string[] = [];
  const day = (d: string) => Math.round(Date.parse(d) / 86400000);
  const t = day(today);
  if ((planned.gamePitches ?? []).some((g) => g > w.gameMax)) out.push(`No more than ${w.gameMax} pitches in a game.`);
  if (planned.pitches > w.dayMax) out.push(`No more than ${w.dayMax} pitches in a day.`);
  const pitched = new Set(history.filter((h) => h.pitches > 0).map((h) => day(h.date)));
  let streak = 0;
  for (let d = t - 1; pitched.has(d); d--) streak++;
  if (streak >= w.maxConsecutiveDays) out.push(`No more than ${w.maxConsecutiveDays} days of pitching in a row.`);
  if (isYouth(age)) {
    if (planned.innings > w.youthDayInnings) out.push(`No more than ${w.youthDayInnings} innings in a day.`);
    const y = history.find((h) => day(h.date) === t - 1);
    if (y && y.innings >= w.youthRestAfterInnings) out.push(`Rest day after ${w.youthRestAfterInnings} or more innings.`);
  }
  return out;
}

/** Whether the calendar allows the preferred two days of rest between outings (soft rule). */
export function windmillPreferredRest(lastOuting: string | null, today: string): boolean {
  if (!lastOuting) return true;
  return Math.round((Date.parse(today) - Date.parse(lastOuting)) / 86400000) - 1 >= ARM_DEFAULTS.windmill.restBetweenOutings;
}

export interface TournamentStatus { budget: number; thrown: number; state: "ok" | "approaching" | "reached"; line: string }

export function tournamentStatus(days: number, thrown: number): TournamentStatus {
  const budget = ARM_DEFAULTS.tournamentPerDay * Math.max(1, days);
  const state = thrown >= budget ? "reached" : thrown >= budget * ARM_DEFAULTS.tournamentWarnAt ? "approaching" : "ok";
  const line = state === "reached"
    ? `Weekend budget reached: ${thrown} of ${budget} pitches. No more pitching this tournament.`
    : state === "approaching"
      ? `Getting close: ${thrown} of ${budget} pitches this weekend.`
      : `${thrown} of ${budget} pitches this weekend.`;
  return { budget, thrown, state, line };
}

/** Recovery block after a tournament, sized to what was actually thrown. */
export function tournamentRecoveryDays(thrown: number): number {
  if (thrown <= 0) return 0;
  if (thrown <= 150) return 1;
  if (thrown <= 300) return 2;
  if (thrown <= 450) return 3;
  return 4;
}

/** Two-way: no high-intent position throwing on a start day, the day before or the day after. */
export function highIntentPositionAllowed(a: ThrowAthlete, daysFromStart: number | null): boolean {
  if (!isPitchingRole(a.role) || a.role === "pitcher") return true;
  return daysFromStart === null || Math.abs(daysFromStart) > 1;
}

export const PITCHER_CATCHER_FLAG = "Pitching and catching is the heaviest arm load there is. Every throw is counted and your budget is kept tight.";

export const WINDMILL_WHOLE_CHAIN = [
  "hip and pelvis control", "trunk rotation strength", "front-of-shoulder capacity", "biceps and forearm capacity",
];

/** Softball and baseball distances scale by age. Catcher throw to second = base path × √2. */
export function fieldDistances(sport: Sport, age: number | null) {
  const a = age ?? 13;
  const bases = sport === "softball" ? (a <= 10 ? 55 : 60) : a <= 12 ? 60 : a <= 13 ? 80 : 90;
  return { bases, toSecond: Math.floor(bases * Math.SQRT2), longToss: sport === "softball" ? (a <= 12 ? 90 : 150) : a <= 12 ? 120 : a <= 15 ? 150 : 180 };
}

export type LadderStep = "distance" | "volume" | "intent" | "position_work";
export const POSITION_LADDER: LadderStep[] = ["distance", "volume", "intent", "position_work"];

export function positionWork(sport: Sport, role: ThrowRole, position: "infield" | "outfield" | "catcher" | null): string[] {
  if (isCatchingRole(role) || position === "catcher") return [`throw-downs to second (${fieldDistances(sport, null).toSecond} ft)`, "pop times"];
  if (position === "outfield") return ["crow-hop throws", "carry to the cut-off"];
  return ["quick release", "short hops"];
}

export interface RecoveryRule { kind: "pitch_smart_rest" | "windmill_rest" | "position_next_day"; text: string }

export function recoveryRule(a: ThrowAthlete): RecoveryRule {
  if (isPitchingRole(a.role)) {
    return a.sport === "baseball"
      ? { kind: "pitch_smart_rest", text: "Rest days after pitching follow the Pitch Smart table for the pitch count." }
      : { kind: "windmill_rest", text: "Two days between outings when the calendar allows, never more than three days in a row." };
  }
  return { kind: "position_next_day", text: "A lighter throwing day after a heavy one." };
}

export interface ThrowingProfile {
  version: string; sport: Sport; role: ThrowRole;
  seasonState: string; phase: string;
  ramp: { active: boolean; days: number; dayIndex: number | null; timeline: "pitcher" | "position" };
  dailyBudget: number; weeklyBudget: number; budgetUnit: "pitches" | "throws";
  recovery: RecoveryRule; flag: string | null;
}

/** §2 — the six values every throwing athlete must have, from one place. */
export function throwingProfile(
  a: ThrowAthlete,
  plan: { seasonState: string; phase: string },
  ramp: { daysOff: number; dayIndex: number | null } | null,
  profile?: Partial<RampProfile>,
): ThrowingProfile {
  const b = armBudget(a);
  const pitcherTimeline = isPitchingRole(a.role);
  const len = ramp ? rampLength("throwing", ramp.daysOff, {
    age: a.age, isPitcher: pitcherTimeline, growthMode: (a.age ?? 99) <= 15, painLast90: {}, firstTime: {}, eliteClean: false, ...profile,
  }).days : 0;
  return {
    version: ARM_LEDGER_VERSION, sport: a.sport, role: a.role,
    seasonState: plan.seasonState, phase: plan.phase,
    ramp: { active: len > 0, days: len, dayIndex: len > 0 ? ramp!.dayIndex : null, timeline: pitcherTimeline ? "pitcher" : "position" },
    dailyBudget: b.daily, weeklyBudget: b.weekly, budgetUnit: b.unit,
    recovery: recoveryRule(a), flag: a.role === "pitcher_catcher" ? PITCHER_CATCHER_FLAG : null,
  };
}
