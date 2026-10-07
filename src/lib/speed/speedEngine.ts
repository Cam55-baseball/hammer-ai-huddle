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

/* ---------- Barefoot gate (Round 8 Step 3c, owner rule) ----------
 * Four parts must ALL hold to move up a stage: sessions in this stage, healthy (pain-free)
 * days in this stage, a passed readiness test in this stage, and readiness at/above threshold.
 * Any barefoot-linked foot/ankle/shin/Achilles/calf pain drops one stage and resets that
 * stage's session and healthy-day counts (and its test) to zero. Never progresses on sessions alone.
 * Healthy-day counts and the readiness-test definition await the owner: while null, nobody advances.
 */
export const BAREFOOT_STAGES = ["Foundation", "Introduction", "Integration", "Advanced"] as const;
export const BAREFOOT_PAIN_AREAS = ["Foot", "Ankle", "Shin", "Achilles", "Calf"];
export interface BarefootGateConfig { sessions: number[]; healthyDays: (number | null)[]; readinessMin: number }
/** Sessions per stage from Speed Lab (10 / 15 / 20 cumulative). Healthy days: owner to set. */
export const BAREFOOT_GATE: BarefootGateConfig = { sessions: [10, 5, 5], healthyDays: [null, null, null], readinessMin: 60 };
export type BarefootEvent =
  | { kind: "session"; date: string }
  | { kind: "healthy_day"; date: string }
  | { kind: "test_pass"; date: string }
  | { kind: "pain"; date: string; areas: string[] };
export interface BarefootState { stage: number; sessions: number; healthyDays: number; testPassed: boolean; missing: string[] }

export function barefootState(events: BarefootEvent[] /* oldest first */, readiness: number | null, cfg: BarefootGateConfig = BAREFOOT_GATE): BarefootState {
  let stage = 0, sessions = 0, healthy = 0, test = false;
  const reset = () => { sessions = 0; healthy = 0; test = false; };
  const canAdvance = () => {
    if (stage >= BAREFOOT_STAGES.length - 1) return false;
    const hd = cfg.healthyDays[stage];
    return sessions >= cfg.sessions[stage] && hd != null && healthy >= hd && test && readiness != null && readiness >= cfg.readinessMin;
  };
  for (const e of events) {
    if (e.kind === "pain") {
      if (e.areas.some((a) => BAREFOOT_PAIN_AREAS.includes(a))) { stage = Math.max(0, stage - 1); reset(); }
      continue;
    }
    if (e.kind === "session") sessions++;
    else if (e.kind === "healthy_day") healthy++;
    else test = true;
    if (canAdvance()) { stage++; reset(); }
  }
  const missing: string[] = [];
  if (stage < BAREFOOT_STAGES.length - 1) {
    const hd = cfg.healthyDays[stage];
    if (sessions < cfg.sessions[stage]) missing.push(`${cfg.sessions[stage] - sessions} more sessions at this level`);
    if (hd == null) missing.push("pain-free day count not set yet");
    else if (healthy < hd) missing.push(`${hd - healthy} more pain-free days`);
    if (!test) missing.push("pass the readiness test");
    if (readiness == null || readiness < cfg.readinessMin) missing.push(`readiness of ${cfg.readinessMin} or more`);
  }
  return { stage, sessions, healthyDays: healthy, testPassed: test, missing };
}
