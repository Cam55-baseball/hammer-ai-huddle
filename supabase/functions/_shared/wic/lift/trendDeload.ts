// Round 9 owner rule (2026-10-07) — bring the lighter week forward when fatigue
// outruns progress. Safety first, then building dominance. PURE + stateless:
// the decision for a week is made from data BEFORE that week's Monday, so every
// build and reload in the week gets the same answer (one plan per day).
//
// Trigger (evaluated at the week's Monday, last 14 days):
//   >= 3 sessions rated very hard (8+/10)
//   AND at least one of:
//     - main-lift performance flat or down (verified numbers only)
//     - 7-day readiness average clearly below the 28-day average
//     - a new pain flag
// Effect: this week's approved sets × 0.6 (the scheme is otherwise unchanged).
// Never stacked: no trend week right after HT's own deload or after a trend week,
// and not in a week HT already deloads. In-season stays on HT's maintenance rules.

export const TREND_DELOAD_VERSION = "trend_deload_v1";
export const TREND_DELOAD_SETS_MUL = 0.6;
export const TREND_RULES = {
  windowDays: 14,
  hardRpe: 8,
  hardSessionsMin: 3,
  /** "clearly below": 7-day readiness average at least this many points under the 28-day average (1–10 scale). */
  readinessDrop: 0.75,
  minReadinessDays7: 3,
  minReadinessDays28: 8,
} as const;

export interface TrendSession { date: string; rpe: number | null }
export interface TrendReadiness { date: string; score: number } // 1–10
export interface TrendLift { date: string; verifiedMax: number } // verified estimates only, per main-lift session

export interface TrendInput {
  weekStart: string; // Monday (YYYY-MM-DD) of the week being decided
  phase: string;
  sessions: readonly TrendSession[];
  readiness: readonly TrendReadiness[];
  painFlagDates: readonly string[]; // first-seen dates of pain flags
  lifts: readonly TrendLift[];
  /** HT's own deload: is THIS week a deload week / was LAST week one. */
  htDeloadThisWeek: boolean;
  htDeloadLastWeek: boolean;
}

export interface TrendDecision {
  apply: boolean;
  setsMul: number;
  reason: string | null; // plain, athlete-facing
  signals: { hardSessions: number; liftFlatOrDown: boolean | null; readinessDown: boolean | null; newPain: boolean; skipped?: string };
}

const DAY = 86_400_000;
const shift = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

export function isInSeasonPhase(p: string): boolean {
  const s = p.toLowerCase();
  return s.startsWith("in") || s === "regular_season" || s === "tournament" || s.startsWith("post");
}

/** The raw trigger as of `asOf` (exclusive): data in [asOf-14, asOf). */
export function trendTrigger(i: Omit<TrendInput, "htDeloadThisWeek" | "htDeloadLastWeek" | "phase">, asOf: string) {
  const from14 = shift(asOf, -TREND_RULES.windowDays);
  const inWin = (d: string, from: string) => d >= from && d < asOf;
  // A session = one plan date; its rating = the hardest logged rating that day.
  const byDay = new Map<string, number>();
  for (const s of i.sessions) if (s.rpe != null && inWin(s.date, from14)) byDay.set(s.date, Math.max(byDay.get(s.date) ?? 0, s.rpe));
  const hardSessions = [...byDay.values()].filter((r) => r >= TREND_RULES.hardRpe).length;

  // Main-lift performance: verified numbers only. Compare the best verified max in
  // the last 14 days with the best in the 14 days before. No verified data → unknown.
  const lifts14 = i.lifts.filter((l) => inWin(l.date, from14)).map((l) => l.verifiedMax);
  const liftsPrev = i.lifts.filter((l) => l.date >= shift(from14, -14) && l.date < from14).map((l) => l.verifiedMax);
  const liftFlatOrDown = lifts14.length && liftsPrev.length ? Math.max(...lifts14) <= Math.max(...liftsPrev) : null;

  const r7 = i.readiness.filter((r) => inWin(r.date, shift(asOf, -7))).map((r) => r.score);
  const r28 = i.readiness.filter((r) => inWin(r.date, shift(asOf, -28))).map((r) => r.score);
  const readinessDown = r7.length >= TREND_RULES.minReadinessDays7 && r28.length >= TREND_RULES.minReadinessDays28
    ? avg(r7) <= avg(r28) - TREND_RULES.readinessDrop : null;

  const newPain = i.painFlagDates.some((d) => inWin(d, from14));
  const fires = hardSessions >= TREND_RULES.hardSessionsMin && (liftFlatOrDown === true || readinessDown === true || newPain);
  return { fires, hardSessions, liftFlatOrDown, readinessDown, newPain };
}

export function trendDeload(i: TrendInput): TrendDecision {
  const t = trendTrigger(i, i.weekStart);
  const signals = { hardSessions: t.hardSessions, liftFlatOrDown: t.liftFlatOrDown, readinessDown: t.readinessDown, newPain: t.newPain };
  const no = (skipped?: string): TrendDecision => ({ apply: false, setsMul: 1, reason: null, signals: skipped ? { ...signals, skipped } : signals });
  if (!t.fires) return no();
  if (isInSeasonPhase(i.phase)) return no("in_season_ht_rules");
  if (i.htDeloadThisWeek) return no("ht_deload_this_week");
  if (i.htDeloadLastWeek) return no("ht_deload_last_week");
  // Never stack: if the trigger already fired at last week's Monday, last week was the lighter week.
  if (trendTrigger(i, shift(i.weekStart, -7)).fires) return no("trend_deload_last_week");
  const why = t.newPain ? "a new pain flag" : t.readinessDown ? "your readiness has dropped" : "your main lifts have stopped going up";
  return {
    apply: true,
    setsMul: TREND_DELOAD_SETS_MUL,
    reason: `Lighter week: you rated ${t.hardSessions} sessions very hard in the last two weeks and ${why}. Fewer sets this week so your body can catch up — then we build again.`,
    signals,
  };
}

/** Apply ×0.6 to approved sets (round, never below 1). Reps, % and the scheme stay the same. */
export function lighterSets(sets: number): number {
  return Math.max(1, Math.round(sets * TREND_DELOAD_SETS_MUL));
}

// ── Loader (server) ───────────────────────────────────────────────────────
import { verifiedMax, type LogRow } from "./verifiedMax.ts";
const MAIN_LIFT = /(squat|deadlift|trap_bar|bench|overhead_press|military_press|hip_thrust|clean)/i;

/** Builds TrendInput from wk_session_logs + check-ins. Any read failure → null (no effect). */
export async function loadTrendInput(admin: any, userId: string, weekStart: string, phase: string, htDeloadThisWeek: boolean, htDeloadLastWeek: boolean): Promise<TrendInput | null> {
  const from = shift(weekStart, -42);
  const [logs, quiz] = await Promise.all([
    admin.from("wk_session_logs").select("plan_date, movement_slug, load_used, reps_completed, rpe, metrics").eq("user_id", userId).gte("plan_date", from).lt("plan_date", weekStart).limit(2000),
    admin.from("vault_focus_quizzes").select("entry_date, physical_readiness, pain_location").eq("user_id", userId).gte("entry_date", from).lt("entry_date", weekStart).limit(500),
  ]);
  if (logs.error || quiz.error) return null;
  const rows = (logs.data ?? []) as any[];
  const sessions = rows.map((r) => ({ date: String(r.plan_date), rpe: r.rpe == null ? null : Number(r.rpe) }));
  // Main lift = the most-logged main movement; one verified series so numbers compare like for like.
  const counts = new Map<string, number>();
  for (const r of rows) if (MAIN_LIFT.test(String(r.movement_slug ?? ""))) counts.set(r.movement_slug, (counts.get(r.movement_slug) ?? 0) + 1);
  const main = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const lifts: TrendLift[] = [];
  if (main) {
    const series = rows.filter((r) => r.movement_slug === main).sort((a, b) => (a.plan_date < b.plan_date ? -1 : 1));
    const dates = [...new Set(series.map((r) => String(r.plan_date)))];
    for (const d of dates) {
      // Verified number from that session's own sets (and earlier ones the same day).
      const v = verifiedMax(series.filter((r) => r.plan_date === d) as LogRow[]);
      if (v != null) lifts.push({ date: d, verifiedMax: v });
    }
  }
  const q = ((quiz.data ?? []) as any[]).sort((a, b) => (a.entry_date < b.entry_date ? -1 : 1));
  const readiness = q.filter((r) => r.physical_readiness != null).map((r) => ({ date: String(r.entry_date), score: Number(r.physical_readiness) }));
  const painFlagDates: string[] = [];
  let lastPain: string | null = null;
  for (const r of q) {
    const has = Array.isArray(r.pain_location) && r.pain_location.length > 0;
    if (has && (!lastPain || shift(lastPain, 7) < r.entry_date)) painFlagDates.push(String(r.entry_date));
    if (has) lastPain = String(r.entry_date);
  }
  return { weekStart, phase, sessions, readiness, painFlagDates, lifts, htDeloadThisWeek, htDeloadLastWeek };
}
