/**
 * Arm readiness v1.2 §D — the highest standard in the app. Pure, deterministic.
 * Decides throwing breaks, the throwing ramp after a break, the ramp's gated
 * steps, when high intent unlocks, and when the arm is behind the body.
 * It never authors a dose and never touches Pitch Smart caps
 * (src/lib/hammer/pitching/restDays.ts stays the single source for those).
 */

export const ARM_READINESS_VERSION = "arm_readiness_v1";

export interface ArmProfile {
  age: number | null;
  isPitcher: boolean;
  /** Last season's innings / pitch count (null = not logged). */
  lastSeasonInnings: number | null;
  lastSeasonPitches: number | null;
  /** Arm pain reports in the last 12 months. */
  armPainReports12mo: number;
  /** Current arm tank (0–100, higher = more fatigue), null = not measured. */
  armTank: number | null;
  /** Velocity trend (mph per 4 weeks), null = not measured. */
  velocityTrend: number | null;
  /** Previous ramps that needed a repeated step. */
  priorRampRepeats: number;
  priorRamps: number;
}

// ---------------------------------------------------------------- ramp length

/** §D ramp table, from the break length. */
export function baseRampDays(breakDays: number, isPitcher: boolean): { min: number; max: number } {
  const b = Math.max(0, Math.round(breakDays));
  if (b <= 7) return { min: 3, max: 5 };
  if (b <= 21) return { min: Math.max(7, b), max: Math.max(7, b) };
  if (b <= 56) {
    const r = Math.ceil(1.5 * b);
    const m = Math.max(r, isPitcher ? 28 : 21);
    return { min: m, max: m };
  }
  return isPitcher ? { min: 42, max: 56 } : { min: 28, max: 28 };
}

/**
 * Case by case: the athlete's own history can only LENGTHEN the ramp, never
 * shorten it below the table. Each factor adds a step of caution; missing data
 * adds nothing and is listed so staff can see it.
 */
export function rampDaysFor(breakDays: number, p: ArmProfile): { days: number; reasons: string[]; missing: string[] } {
  const base = baseRampDays(breakDays, p.isPitcher);
  let days = base.min;
  if (breakDays <= 7) days = base.max; // short breaks: use the top of 3–5 for arms with any flag below
  const reasons: string[] = [];
  const missing: string[] = [];
  let extra = 0;
  if (p.age === null) missing.push("age");
  else if (p.age < 15) { extra += 0.2; reasons.push("young arm"); }
  if (p.armPainReports12mo > 0) { extra += 0.2; reasons.push("arm pain in the last year"); }
  if (p.priorRamps > 0 && p.priorRampRepeats > 0) { extra += 0.15; reasons.push("needed extra time on a past ramp"); }
  if (p.isPitcher && p.lastSeasonPitches !== null && p.lastSeasonPitches > 1500) { extra += 0.1; reasons.push("heavy pitch count last season"); }
  if (p.lastSeasonPitches === null && p.lastSeasonInnings === null) missing.push("last season's pitch counts");
  if (p.armTank === null) missing.push("arm tank");
  else if (p.armTank >= 70) { extra += 0.1; reasons.push("arm tank is high"); }
  if (p.velocityTrend === null) missing.push("velocity trend");
  if (breakDays <= 7 && extra === 0) days = base.min + 1; // 4 of 3–5 with no flags
  days = Math.ceil(days * (1 + extra));
  if (breakDays > 56 && p.isPitcher) days = Math.min(Math.max(days, base.min), base.max);
  return { days: Math.max(days, base.min), reasons, missing };
}

// ---------------------------------------------------------------- break scheduling

export interface BreakPlan {
  breakDays: number;
  rampDays: number;
  breakStart: string;
  rampStart: string;
  rampEnd: string;
  /** The ramp finishes this many days before the next known game (≥ 7). */
  bufferDays: number | null;
  shortenedBreak: boolean;
  reason: string | null;
  /** Young arm owed yearly rest the calendar couldn't give — staff flag. */
  annualRestOwed: boolean;
  noRoom: boolean;
}

const BUFFER = 7;

function add(iso: string, n: number) {
  return new Date(Date.parse(iso + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);
}
function diff(a: string, b: string) {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
}

/**
 * A break is scheduled only when the ramp after it finishes ≥ 7 days before the
 * next known game. If both don't fit, the BREAK shortens — never the ramp. The
 * ramp is recomputed for each shorter break (a shorter break needs a shorter ramp).
 */
export function scheduleBreak(args: {
  start: string;
  desiredBreakDays: number;
  nextGame: string | null;
  profile: ArmProfile;
  annualRestMet: boolean;
}): BreakPlan {
  const { start, nextGame, profile } = args;
  const mk = (b: number, shortened: boolean, reason: string | null, noRoom = false): BreakPlan => {
    const r = rampDaysFor(b, profile).days;
    const rampStart = add(start, b);
    const rampEnd = add(rampStart, r - 1);
    const young = profile.age !== null && profile.age < 19;
    return {
      breakDays: b, rampDays: r, breakStart: start, rampStart, rampEnd,
      bufferDays: nextGame ? diff(rampEnd, nextGame) - 1 : null,
      shortenedBreak: shortened, reason, noRoom,
      annualRestOwed: shortened && young && !args.annualRestMet,
    };
  };
  const want = Math.max(0, Math.round(args.desiredBreakDays));
  if (!nextGame) return mk(want, false, null);
  const fits = (b: number) => {
    const r = rampDaysFor(b, profile).days;
    return diff(start, nextGame) - (b + r) >= BUFFER + 1 || (diff(add(add(start, b), r - 1), nextGame) - 1 >= BUFFER);
  };
  if (fits(want)) return mk(want, false, null);
  for (let b = want - 1; b >= 0; b--) {
    if (fits(b)) {
      return mk(b, true, `Break shortened to ${b} day${b === 1 ? "" : "s"} so the full throwing ramp still finishes a week before the next game.`);
    }
  }
  return mk(0, want > 0, "No room for a break before the next game — the throwing ramp runs in full and the break waits.", true);
}

// ---------------------------------------------------------------- inside the ramp

export type RampVariable = "distance" | "volume" | "intent";
export interface RampStep {
  index: number;
  changes: RampVariable;
  distancePct: number;
  volumePct: number;
  intentPct: number;
}

export const INTENT_STEPS = [60, 70, 80, 90, 100] as const;

/** Distance first, then volume, then intent — exactly one thing changes per step. */
export function buildRampSteps(): RampStep[] {
  const steps: RampStep[] = [];
  let d = 40, v = 40, i = 50;
  const push = (c: RampVariable) => steps.push({ index: steps.length, changes: c, distancePct: d, volumePct: v, intentPct: i });
  for (const nd of [60, 80, 100]) { d = nd; push("distance"); }
  for (const nv of [60, 80, 100]) { v = nv; push("volume"); }
  for (const ni of INTENT_STEPS) { i = ni; push("intent"); }
  return steps;
}

export interface GateInput {
  painFree48h: boolean;
  /** Next-day soreness 0–10. */
  soreness: number | null;
  armTank: number | null;
  prevVolumeCompleted: boolean;
}
export const SORENESS_LIMIT = 3;
export const ARM_TANK_LINE = 70;

export function gatePasses(g: GateInput): { pass: boolean; failed: string[] } {
  const failed: string[] = [];
  if (!g.painFree48h) failed.push("not pain-free for 48 hours");
  if (g.soreness === null) failed.push("next-day soreness not logged");
  else if (g.soreness >= SORENESS_LIMIT) failed.push("next-day soreness too high");
  if (g.armTank !== null && g.armTank >= ARM_TANK_LINE) failed.push("arm tank above its line");
  if (!g.prevVolumeCompleted) failed.push("previous step's volume not completed");
  return { pass: failed.length === 0, failed };
}

/** A failed gate repeats the step; it never skips ahead. Full intent only after full distance with no pain. */
export function nextStep(current: number, g: GateInput, steps = buildRampSteps()): { step: number; repeated: boolean; failed: string[] } {
  const res = gatePasses(g);
  if (!res.pass) return { step: current, repeated: true, failed: res.failed };
  const n = Math.min(current + 1, steps.length - 1);
  if (steps[n].intentPct === 100 && (steps[n].distancePct < 100 || !g.painFree48h)) return { step: current, repeated: true, failed: ["full distance not reached"] };
  return { step: n, repeated: false, failed: [] };
}

// ---------------------------------------------------------------- high intent

/** Bullpens at max, pulldowns, velocity days: only after the full ramp plus two clean weeks at high intent. */
export function highIntentUnlocked(args: { rampComplete: boolean; cleanHighIntentWeeks: number }): boolean {
  return args.rampComplete && args.cleanHighIntentWeeks >= 2;
}

/**
 * Velocity must be earned by the arm. If body markers (strength/speed/power)
 * rise faster than arm-capacity markers, hold high-intent throwing.
 * Rates are % change over the same window. Missing arm data holds too.
 */
export function armBehindBody(bodyRatePct: number | null, armRatePct: number | null): { hold: boolean; message: string | null } {
  if (bodyRatePct === null) return { hold: false, message: null };
  if (armRatePct === null) {
    return { hold: bodyRatePct > 0, message: bodyRatePct > 0 ? "Your body is getting stronger. We keep building your arm before any max-effort throwing." : null };
  }
  if (bodyRatePct > armRatePct) {
    return { hold: true, message: "Your body is getting stronger faster than your arm. We keep building your arm first, and max-effort throwing waits." };
  }
  return { hold: false, message: null };
}

/** Year-round: capacity and deceleration work never switch off for a thrower. */
export const YEAR_ROUND_ARM_WORK = ["Arm capacity", "Deceleration (cuff, scap, forearm, wrist)"] as const;

export const WHY_ARM =
  "Hammers trains the arm as part of the whole chain. Hips and trunk deliver the force, the springy tissue of the arm stores and returns it, and the shoulder blade, cuff and forearm slow it down. So we build the arm step by step, all year.";
