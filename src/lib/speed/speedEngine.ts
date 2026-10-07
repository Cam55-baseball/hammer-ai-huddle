/**
 * Speed engine — Round 8 Step 3 (Speed Lab rules folded into the Hammers Today Speed card).
 * Pure functions only. Hammers Today owns the phase and the dose; these rules can only
 * LOWER today's sprint reps or turn the day into a break day — never add work.
 * Source: docs/research/program-consolidation-report.md Part 3.
 */

export type BodyFeel = "good" | "okay" | "tight";
export interface SpeedCheckIn { sleep: 1 | 2 | 3 | 4 | 5; feel: BodyFeel; painAreas: string[] }

/** One readiness score, 0–100: 50 + (sleep−3)×10, feel +15/0/−15, −5 per pain area. */
export function readinessScore(c: SpeedCheckIn): number {
  const feel = c.feel === "good" ? 15 : c.feel === "tight" ? -15 : 0;
  return Math.max(0, Math.min(100, 50 + (c.sleep - 3) * 10 + feel - 5 * c.painAreas.length));
}

/** Readiness under 40 → reps ×0.6; 40–59 → ×0.75. Never below 1 rep, never above prescribed. */
export function repFactor(score: number): number {
  return score < 40 ? 0.6 : score < 60 ? 0.75 : 1;
}
export function cutReps(prescribed: number, score: number): number {
  if (!(prescribed > 0)) return prescribed;
  return Math.max(1, Math.min(prescribed, Math.floor(prescribed * repFactor(score))));
}

export interface SpeedSessionLite { date: string; rpe: number | null; times: Record<string, number> }

/** Break-day triggers (player may override). Returns plain-language reasons. */
export function breakDayReasons(
  checkIn: SpeedCheckIn,
  recent: SpeedSessionLite[], // newest first
  bests: Record<string, number>,
): string[] {
  const out: string[] = [];
  const [a, b] = recent;
  if (a?.rpe != null && b?.rpe != null && a.rpe >= 8 && b.rpe >= 8) out.push("Your last two speed sessions were both very hard (8 or more out of 10).");
  if (checkIn.sleep <= 2) out.push("You slept poorly.");
  if (checkIn.painAreas.length >= 3) out.push("You marked 3 or more sore spots.");
  if (a) {
    const slow = Object.entries(a.times).filter(([d, t]) => bests[d] > 0 && t > bests[d] * 1.05).length;
    if (slow >= 2) out.push("Your last sprints were more than 5% slower than your best at 2 or more distances.");
  }
  return out;
}

/** Plateau: 4 timed sessions in a row without a new personal best. */
export function isPlateau(sessions: SpeedSessionLite[] /* oldest first */): boolean {
  const best: Record<string, number> = {};
  let since = 0;
  for (const s of sessions) {
    if (!Object.keys(s.times).length) continue; // effort-only day, no times to compare
    let pb = false;
    for (const [d, t] of Object.entries(s.times)) {
      if (!(t > 0)) continue;
      if (best[d] == null || t < best[d]) { if (best[d] != null) pb = true; best[d] = t; }
    }
    since = pb ? 0 : since + 1;
  }
  return sessions.length >= 4 && since >= 4;
}

/** Resisted work opens at session 7, overspeed at 10 — and never below the age floors the catalog already sets. */
export function unlocks(sessionsDone: number) {
  return { resisted: sessionsDone + 1 >= 7, overspeed: sessionsDone + 1 >= 10 };
}

/** Speed tiers as % of the world-class reference time (generic names only). */
export const WORLD_CLASS = {
  baseball: { short: { yd: 10, s: 1.41 }, mid: { yd: 30, s: 3.3 }, long: { yd: 60, s: 6.4 } },
  softball: { short: { yd: 7, s: 1.0 }, mid: { yd: 20, s: 2.2 }, long: { yd: 40, s: 4.25 } },
} as const;
export function speedTier(time: number, worldClass: number): "Building Speed" | "Competitive Speed" | "Elite Speed" | "World Class" {
  const pct = (worldClass / time) * 100;
  return pct >= 95 ? "World Class" : pct >= 80 ? "Elite Speed" : pct >= 60 ? "Competitive Speed" : "Building Speed";
}

/** Six context rules, first match wins. They can only soften the day. */
export type SpeedFocus = { key: string; label: string; maxEffort: boolean; repCap: number | null };
export function speedFocus(ctx: {
  minorParentConcern?: boolean; lowerBodyInjury?: boolean; highLoadOrLowReadiness?: boolean;
  asymmetryOver10?: boolean; inSeason?: boolean; speedPriority?: boolean;
}): SpeedFocus {
  if (ctx.minorParentConcern) return { key: "parent_concern", label: "Easy running only today — no all-out sprints.", maxEffort: false, repCap: 4 };
  if (ctx.lowerBodyInjury) return { key: "injury", label: "Easy running only — protect the injured area.", maxEffort: false, repCap: null };
  if (ctx.highLoadOrLowReadiness) return { key: "deload", label: "Lighter speed day — your body needs it.", maxEffort: true, repCap: 3 };
  if (ctx.asymmetryOver10) return { key: "symmetry", label: "Single-leg balance focus — even out both sides.", maxEffort: true, repCap: null };
  if (ctx.inSeason) return { key: "freshness", label: "Stay fresh for games — quality reps only.", maxEffort: true, repCap: 4 };
  return ctx.speedPriority
    ? { key: "max_velocity", label: "Top-speed focus today.", maxEffort: true, repCap: null }
    : { key: "acceleration", label: "First-step speed focus today.", maxEffort: true, repCap: null };
}

/** Group logged sprint times (wk_session_logs kind=sprint_time) into sessions, oldest first. */
export function sessionsFromLogs(rows: { plan_date: string; distance_feet_completed: number | null; metrics: any }[]): SpeedSessionLite[] {
  const by = new Map<string, SpeedSessionLite>();
  const rpe = new Map<string, number>();
  for (const r of rows) if (r.metrics?.kind === "speed_rpe" && Number(r.metrics?.rpe) >= 1) rpe.set(r.plan_date, Number(r.metrics.rpe));
  for (const r of rows) {
    const t = Number(r.metrics?.sprint_time_s), yd = Math.round(Number(r.distance_feet_completed) / 3);
    if (r.metrics?.kind !== "sprint_time" || !(t > 0) || !(yd > 0)) continue;
    const s = by.get(r.plan_date) ?? { date: r.plan_date, rpe: null, times: {} };
    s.times[yd] = s.times[yd] ? Math.min(s.times[yd], t) : t;
    by.set(r.plan_date, s);
  }
  for (const [d, v] of rpe) by.set(d, { ...(by.get(d) ?? { date: d, times: {} }), rpe: v } as SpeedSessionLite);
  return [...by.values()].sort((a, b) => a.date.localeCompare(b.date));
}
export function bestsOf(sessions: SpeedSessionLite[]): Record<string, number> {
  const b: Record<string, number> = {};
  for (const s of sessions) for (const [d, t] of Object.entries(s.times)) if (b[d] == null || t < b[d]) b[d] = t;
  return b;
}
/** Nearest world-class reference for a distance in yards (only exact sport distances count). */
export function worldClassFor(sport: "baseball" | "softball", yd: number): number | null {
  const w = Object.values(WORLD_CLASS[sport]).find((x) => x.yd === yd);
  return w ? w.s : null;
}

/* ---------- Barefoot gates (owner, Round 9, 2026-10-07) ----------
 * Health first, slow progress. To move up a stage ALL must hold: minimum sessions at the
 * current stage, pain-free days IN A ROW (no foot/ankle/shin/Achilles/calf pain in any
 * check-in), readiness at the stage's level, and a passed readiness test at this stage.
 * Same gates for every age (no shortcuts). Any such pain drops one stage and resets that
 * stage's sessions, pain-free days and test.
 * Readiness test (guided, barefoot, grass or turf): all five must pass, else retest in 7 days.
 *   1 single-leg balance 30 s each foot, 2 of 3 tries; 2 full-range calf raises, no pain —
 *   20/side (13+), 15/side (under 13); 3 20 quiet pogo hops, no pain; 4 2×20 yd A-skips,
 *   no pain; 5 next morning's check-in shows none of those pains.
 */
export const BAREFOOT_STAGES = ["Foundation", "Introduction", "Integration", "Advanced"] as const;
export const BAREFOOT_PAIN_AREAS = ["Foot", "Ankle", "Shin", "Achilles", "Calf"];
export const isBarefootPain = (areas: string[]) =>
  areas.some((a) => BAREFOOT_PAIN_AREAS.some((p) => String(a).toLowerCase().includes(p.toLowerCase())));
export interface BarefootGateConfig { sessions: number[]; painFreeDays: number[]; readinessMin: number[]; retestDays: number }
export const BAREFOOT_GATE: BarefootGateConfig = { sessions: [12, 10, 10], painFreeDays: [21, 28, 42], readinessMin: [60, 60, 65], retestDays: 7 };
export const calfRaiseTarget = (age: number | null) => (age != null && age < 13 ? 15 : 20);
export type BarefootEvent =
  | { kind: "session"; date: string }
  | { kind: "healthy_day"; date: string }
  | { kind: "test_pass"; date: string } // items 1–4 passed; item 5 = next check-in after this date
  | { kind: "test_fail"; date: string }
  | { kind: "stage_up"; date: string; to: number } // recorded when a move-up happened (readiness was checked that day)
  | { kind: "pain"; date: string; areas: string[] };
export interface BarefootState {
  stage: number; sessions: number; healthyDays: number; testPassed: boolean;
  testPending: boolean; retestOn: string | null; missing: string[];
  /** True when this evaluation moved the player up — the caller records a stage_up event. */
  advancedToday: boolean;
}

const dDiff = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
const dAdd = (a: string, n: number) => new Date(Date.parse(`${a}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** `today` = the date being evaluated; pain-free days in a row = full days since the stage's
 *  last reset (pain or move-up) or the first check-in, whichever is later. */
export function barefootState(events: BarefootEvent[] /* oldest first */, readiness: number | null, today?: string, cfg: BarefootGateConfig = BAREFOOT_GATE): BarefootState {
  const evs = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const now = today ?? evs[evs.length - 1]?.date ?? new Date().toISOString().slice(0, 10);
  let stage = 0, sessions = 0, test = false;
  let streakFrom: string | null = null; // first pain-free day of the current streak
  let pendingTest: string | null = null; // items 1–4 passed, waiting on next check-in
  let retestOn: string | null = null;
  const reset = (from: string | null) => { sessions = 0; test = false; pendingTest = null; streakFrom = from; };
  const streak = (at: string) => (streakFrom ? Math.max(0, dDiff(streakFrom, at)) : 0);
  const canAdvance = (at: string, r: number | null) =>
    stage < BAREFOOT_STAGES.length - 1 && sessions >= cfg.sessions[stage] && streak(at) >= cfg.painFreeDays[stage]
    && test && r != null && r >= cfg.readinessMin[stage];
  for (const e of evs) {
    if (e.kind === "pain") {
      if (isBarefootPain(e.areas)) { stage = Math.max(0, stage - 1); reset(dAdd(e.date, 1)); if (pendingTest) retestOn = dAdd(e.date, cfg.retestDays); }
      continue;
    }
    if (e.kind === "healthy_day") {
      if (!streakFrom) streakFrom = e.date;
      if (pendingTest && e.date > pendingTest) { test = true; pendingTest = null; } // item 5 passed
    } else if (e.kind === "session") sessions++;
    else if (e.kind === "test_pass") { if (!retestOn || e.date >= retestOn) { pendingTest = e.date; retestOn = null; } }
    else if (e.kind === "stage_up") { if (e.to === stage + 1) { stage++; reset(e.date); } }
    else if (e.kind === "test_fail") { pendingTest = null; retestOn = dAdd(e.date, cfg.retestDays); }
    // Readiness is only known for today; earlier move-ups never happen on past events.
  }
  let advancedToday = false;
  if (canAdvance(now, readiness)) { stage++; reset(now); advancedToday = true; }
  const missing: string[] = [];
  if (stage < BAREFOOT_STAGES.length - 1) {
    const need = cfg.painFreeDays[stage], have = streak(now);
    if (sessions < cfg.sessions[stage]) missing.push(`${cfg.sessions[stage] - sessions} more sessions at this level`);
    if (have < need) missing.push(`${need - have} more pain-free days in a row`);
    if (!test) missing.push(pendingTest ? "a pain-free check-in the morning after your readiness test" : retestOn && now < retestOn ? `retake the readiness test on or after ${retestOn}` : "pass the barefoot readiness test");
    if (readiness == null || readiness < cfg.readinessMin[stage]) missing.push(`readiness of ${cfg.readinessMin[stage]} or more`);
  }
  return { stage, sessions, healthyDays: streak(now), testPassed: test, testPending: !!pendingTest, retestOn, missing, advancedToday };
}
