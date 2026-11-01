/**
 * Owner Nov 1 round 6 Part 2 — PITCHER RETURN AFTER 14+ DAYS OFF.
 * flat ground → shortbox → bullpens. A step moves on only after a GREEN week, with at
 * least 1 week in the step (2 weeks after 30+ days off). The first bullpen is short
 * (about 20–25 pitches). Pure; shared by the app and the server. It only reshapes
 * existing pitching work; every arm-ledger, Pitch Smart, age, windmill and injury rule
 * still decides downstream and may only remove work.
 */
import { shortboxFeet, type Sport } from "./roleCycle.ts";

export type ReturnStep = "flat" | "shortbox" | "bullpen" | "done";
export const RETURN_GAP_DAYS = 14;
export const LONG_LAYOFF_DAYS = 30;
export const FIRST_BULLPEN_MAX = 25;
export const FIRST_BULLPEN_MIN = 20;

export interface ReturnProgram {
  id?: string;
  sport: Sport;
  started_on: string;
  days_off: number | null;
  long_layoff: boolean;
  step: ReturnStep;
  step_started_on: string;
  prescribed_dates: string[];
  first_bullpen_on: string | null;
  completed_on: string | null;
  source: "history" | "answer";
}

const DAY = 86_400_000;
const ms = (d: string) => Date.parse(`${d}T12:00:00Z`);
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) => Math.round((ms(b) - ms(a)) / DAY);
export const mondayOf = (d: string) => { const t = new Date(ms(d)); return iso(t.getTime() - ((t.getUTCDay() + 6) % 7) * DAY); };
const addDays = (d: string, n: number) => iso(ms(d) + n * DAY);

/**
 * Start a return program when the player has been off 14+ days.
 * History (last real pitching date) wins; the "Where are you starting from?" answer is used
 * only when there is no pitching history at all.
 */
export function startReturn(i: {
  today: string; sport: Sport; lastPitchDate: string | null;
  answer: string | null; latest: Pick<ReturnProgram, "started_on" | "completed_on"> | null;
}): ReturnProgram | null {
  if (i.latest && !i.latest.completed_on) return null; // one at a time
  if (i.lastPitchDate) {
    const gap = daysBetween(i.lastPitchDate, i.today);
    if (gap < RETURN_GAP_DAYS) return null;
    if (i.latest && i.latest.started_on > i.lastPitchDate) return null; // this layoff already had its return
    return fresh(i.today, i.sport, gap, gap >= LONG_LAYOFF_DAYS, "history");
  }
  if (i.latest) return null;
  if (i.answer === "14+") return fresh(i.today, i.sport, null, false, "answer");
  if (i.answer === "Never") return fresh(i.today, i.sport, null, true, "answer");
  return null;
}
function fresh(today: string, sport: Sport, daysOff: number | null, long: boolean, source: ReturnProgram["source"]): ReturnProgram {
  return { sport, started_on: today, days_off: daysOff, long_layoff: long, step: "flat", step_started_on: today, prescribed_dates: [], first_bullpen_on: null, completed_on: null, source };
}

export const weeksPerStep = (p: Pick<ReturnProgram, "long_layoff">) => (p.long_layoff ? 2 : 1);

export interface ReturnDay { date: string; readiness: number | null; pain: boolean }

/**
 * Green week for the return (owner thresholds): ≥85% of the prescribed pitching days done,
 * ≥5 GOOD check-in days (≥60%), no LOW day (<40%), no pain flag.
 */
export function returnWeekGreen(weekStart: string, prescribed: readonly string[], pitchedDates: ReadonlySet<string>, checkIns: readonly ReturnDay[], readyAt: number | null): boolean {
  if (readyAt == null) return false; // step-up check off → hold
  const end = addDays(weekStart, 6);
  const due = prescribed.filter((d) => d >= weekStart && d <= end);
  if (!due.length) return false;
  const done = due.filter((d) => pitchedDates.has(d)).length / due.length;
  const days = checkIns.filter((c) => c.date >= weekStart && c.date <= end);
  if (days.some((c) => c.pain)) return false;
  if (days.some((c) => c.readiness != null && c.readiness < 0.4)) return false;
  const good = days.filter((c) => c.readiness != null && c.readiness >= readyAt).length;
  return done >= 0.85 && good >= 5;
}

/**
 * Move a step on: at least weeksPerStep FULL Mon–Sun weeks inside the step, and the most
 * recent finished week green. One step at a time. Bullpen step ends once a bullpen is logged.
 */
export function advanceReturn(p: ReturnProgram, today: string, green: (weekStart: string) => boolean, bullpenLoggedSince: (from: string) => string | null): ReturnProgram {
  if (p.completed_on) return p;
  if (p.step === "bullpen") {
    const first = p.first_bullpen_on ?? bullpenLoggedSince(p.step_started_on);
    return first ? { ...p, first_bullpen_on: first, step: "done", completed_on: today } : p;
  }
  const thisWeek = mondayOf(today);
  const firstFull = mondayOf(p.step_started_on) === p.step_started_on ? p.step_started_on : addDays(mondayOf(p.step_started_on), 7);
  const fullWeeks: string[] = [];
  for (let w = firstFull; w < thisWeek; w = addDays(w, 7)) fullWeeks.push(w);
  if (fullWeeks.length < weeksPerStep(p)) return p;
  if (!green(fullWeeks[fullWeeks.length - 1])) return p;
  return { ...p, step: p.step === "flat" ? "shortbox" : "bullpen", step_started_on: today };
}

export function returnBecause(p: ReturnProgram, sport: Sport): string {
  const need = weeksPerStep(p) === 2 ? "2 weeks and a green week" : "a week and a green week";
  const place = sport === "softball" ? "circle" : "mound";
  if (p.step === "flat") return `Because: you've been off pitching ${p.days_off ? `${p.days_off} days` : "for 2+ weeks"}, so you start back on flat ground (no ${place}). You move to shortbox after ${need}.`;
  if (p.step === "shortbox") return `Because: you're coming back from time off. Shortbox (${shortboxFeet(sport)} ft) comes before full ${sport === "softball" ? "circle sessions" : "bullpens"}. You move on after ${need}.`;
  if (p.step === "bullpen") return `Because: your first ${sport === "softball" ? "circle session" : "bullpen"} back is short — about ${FIRST_BULLPEN_MIN}–${FIRST_BULLPEN_MAX} pitches.`;
  return "";
}

type Drill = { name: string; dosage?: string; armEvent?: { kind: string; count: number; intent?: string; estimated?: boolean }; pitchTags?: { moundType?: string | null; feet?: number | null; intensity?: string | null } | null; [k: string]: unknown };
const MOUND_NAME = /bullpen|mound|circle|side session|shortbox|live/i;
/** A pitch row thrown from a mound/circle or shortbox (not flat ground). */
export function isMoundRow(d: Drill): boolean {
  if (d.armEvent?.kind !== "pitch") return false;
  const t = d.pitchTags?.moundType;
  if (t) return t !== "flat_ground";
  return MOUND_NAME.test(d.name);
}

/**
 * Reshape today's pitching rows for the return step. Pitch counts never go UP; the arm guard
 * runs afterwards and may only cut. Flat: mound/circle rows become flat-ground pitching.
 * Shortbox: they become shortbox at 2/3 distance, light. Bullpen (first one): capped at 25.
 */
export function applyReturnStep<D extends Drill>(drills: D[], p: ReturnProgram | null, sport: Sport): { drills: D[]; because: string[] } {
  if (!p || p.step === "done") return { drills, because: [] };
  let changed = false;
  const out = drills.map((d) => {
    if (!isMoundRow(d)) return d;
    changed = true;
    const count = d.armEvent!.count;
    if (p.step === "flat") {
      return { ...d, name: "Flat-ground pitching (no " + (sport === "softball" ? "circle" : "mound") + ")", dosage: `${count} pitches, easy to medium`,
        pitchTags: { ...(d.pitchTags ?? {}), moundType: "flat_ground", intensity: "catch_light" }, armEvent: { ...d.armEvent!, intent: "low" }, returnStep: "flat" } as D;
    }
    if (p.step === "shortbox") {
      const ft = shortboxFeet(sport);
      return { ...d, name: `Shortbox (${ft} ft)`, dosage: `${count} pitches, light — pitches in the zone`,
        pitchTags: { ...(d.pitchTags ?? {}), moundType: sport === "softball" ? "shortbox_circle" : "shortbox", feet: ft, intensity: "catch_light" }, armEvent: { ...d.armEvent!, intent: "low" }, returnStep: "shortbox" } as D;
    }
    const capped = Math.min(count, FIRST_BULLPEN_MAX);
    return { ...d, dosage: `${capped} pitches (first one back — short)`, armEvent: { ...d.armEvent!, count: capped }, returnStep: "first_bullpen" } as D;
  });
  // Bullpen step: only the first mound row today counts as the short first bullpen; later mound rows come out.
  let final = out;
  if (p.step === "bullpen") {
    let seen = false;
    final = out.filter((d) => { if (!isMoundRow(d)) return true; if (seen) return false; seen = true; return true; });
  }
  return { drills: final, because: changed ? [returnBecause(p, sport)] : [] };
}
