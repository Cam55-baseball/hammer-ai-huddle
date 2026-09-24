import { offseasonBreakDays, type BreakSignals } from "./youthThrowing.ts";
/**
 * Ramp Law v1 (docs/wic/ramp-law-v1.md) — every discipline, every athlete.
 * Pure and deterministic. Decides ramp LENGTH, step order, gates and the
 * throwing break/build calendar. Never authors a dose: the constraints it
 * returns (envelope floor, class cap, tier drop) are labels for the card builder.
 */

export const RAMP_LAW_VERSION = "ramp_law_v1";

export type RampDiscipline = "throwing" | "lifting" | "speed" | "bat_speed" | "conditioning" | "jumps";
export const RAMP_DISCIPLINES: RampDiscipline[] = ["throwing", "lifting", "speed", "bat_speed", "conditioning", "jumps"];

export interface RampProfile {
  age: number | null;
  isPitcher: boolean;
  growthMode: boolean;
  /** Pain in this discipline's area in the last 90 days. */
  painLast90: Partial<Record<RampDiscipline, boolean>>;
  /** Never trained this discipline before. */
  firstTime: Partial<Record<RampDiscipline, boolean>>;
  /** Elite or professional with a clean history. */
  eliteClean: boolean;
  /** Learned tolerance factor (±20%), only when the learning switch is on. */
  tolerance?: number;
}

export type RampBand = "none" | "short" | "doubling" | "structured";
export function bandFor(D: number): RampBand {
  if (D <= 2) return "none";
  if (D <= 7) return "short";
  if (D <= 28) return "doubling";
  return "structured";
}

/** §4 — the largest applicable factor (elite ×0.9 only when nothing else applies). */
export function personalFactor(d: RampDiscipline, p: RampProfile): { factor: number; reasons: string[] } {
  const reasons: string[] = [];
  if (p.age !== null && p.age >= 13 && p.age <= 15) reasons.push("age 13 to 15");
  if (p.growthMode) reasons.push("growth mode");
  if (p.painLast90[d]) reasons.push("pain in this area in the last 90 days");
  if (p.firstTime[d]) reasons.push("first time in this discipline");
  let factor = reasons.length ? 1.25 : p.eliteClean ? 0.9 : 1;
  if (!reasons.length && p.eliteClean) reasons.push("elite with a clean history");
  if (p.tolerance) factor *= Math.min(1.2, Math.max(0.8, p.tolerance));
  return { factor, reasons };
}

interface BandSpec { base: number; min: number; max: number | null }
/** §1 / §2 / §3 base lengths. `max` is the stated range or ceiling. */
function spec(d: RampDiscipline, D: number, isPitcher: boolean): BandSpec | null {
  const band = bandFor(D);
  if (band === "none") return null;
  if (band === "doubling") return { base: Math.max(7, 2 * D), min: 7, max: null };
  if (band === "short") {
    switch (d) {
      case "throwing": return { base: 3, min: 3, max: 4 };
      case "lifting": return { base: 1, min: 1, max: 1 };
      case "speed": return { base: 1, min: 1, max: 2 };
      case "bat_speed": return { base: 2, min: 2, max: 2 };
      case "conditioning": return null;
      case "jumps": return { base: 1, min: 1, max: 1 };
    }
  }
  switch (d) {
    case "throwing": return isPitcher ? { base: 42, min: 42, max: 56 } : { base: 28, min: 28, max: 35 };
    case "lifting": return { base: 14, min: 14, max: 21 };
    case "speed": return { base: 14, min: 14, max: null };
    case "bat_speed": return { base: 14, min: 14, max: 21 };
    case "conditioning": return { base: 14, min: 14, max: null };
    case "jumps": return { base: 14, min: 14, max: null };
  }
}

/**
 * v1.2 §D throwing ramp table, still in force: v1.3 never shortens it.
 * Returns the v1.2 minimum for a throwing break of D days.
 */
export function v12ThrowingFloor(D: number, isPitcher: boolean): number {
  if (D <= 7) return D <= 2 ? 0 : 3;
  if (D <= 21) return Math.max(7, D);
  if (D <= 56) return Math.max(Math.ceil(1.5 * D), isPitcher ? 28 : 21);
  return isPitcher ? 42 : 28;
}

export interface RampLength {
  discipline: RampDiscipline;
  daysOff: number;
  band: RampBand;
  days: number;
  factor: number;
  reasons: string[];
  /** Constraints the card builder must honour while the ramp runs (labels only). */
  constraints: string[];
  /** Set when v1.2 §D asks for longer than the v1.3 ceiling — the longer wins. */
  ceilingConflict: string | null;
}

const CONSTRAINTS: Record<RampDiscipline, Record<Exclude<RampBand, "none">, string[]>> = {
  throwing: {
    short: ["catch play only", "distance before intent"],
    doubling: ["distance, then volume, then intent"],
    structured: ["interval throwing only for the first 2 to 3 weeks", "then flat ground once a week", "pitchers: mound once a week building to twice"],
  },
  lifting: {
    short: ["first session at the envelope floor"],
    doubling: ["class capped at Moderate", "no new methods or tiers"],
    structured: ["capacity first, then strength, then speed-strength"],
  },
  speed: {
    short: ["build-up runs at 85 to 90%"],
    doubling: ["distance before intent", "48 hours between max-velocity days"],
    structured: ["acceleration, then max velocity, then change of direction"],
  },
  bat_speed: {
    short: ["reduced swing volume"],
    doubling: ["dry swings, then tee, then front toss, then live"],
    structured: ["no overload or underload bats until two clean weeks"],
  },
  conditioning: {
    short: [],
    doubling: ["aerobic and tempo first"],
    structured: ["repeat-sprint work last"],
  },
  jumps: {
    short: ["drop one tier for the first session"],
    doubling: ["back one tier, earn it forward again"],
    structured: ["restart at Tier 1 or U1 and earn upward"],
  },
};

export function rampLength(d: RampDiscipline, D: number, p: RampProfile): RampLength {
  const band = bandFor(D);
  const s = spec(d, D, p.isPitcher);
  if (!s) return { discipline: d, daysOff: D, band, days: 0, factor: 1, reasons: [], constraints: [], ceilingConflict: null };
  const { factor, reasons } = personalFactor(d, p);
  let days = Math.ceil(s.base * factor - 1e-9);
  days = Math.max(days, s.min);
  if (s.max !== null) days = Math.min(days, s.max);
  let ceilingConflict: string | null = null;
  if (d === "throwing") {
    const floor = v12ThrowingFloor(D, p.isPitcher);
    if (floor > days) {
      if (s.max !== null && floor > s.max) {
        ceilingConflict = `v1.2 asks for ${floor} days after ${D} days off; Ramp Law caps this at ${s.max}. The longer one is used until the owner decides.`;
      }
      days = floor;
    }
  }
  return { discipline: d, daysOff: D, band, days, factor, reasons, constraints: CONSTRAINTS[d][band as Exclude<RampBand, "none">], ceilingConflict };
}

// ---------------------------------------------------------------- steps

export type RampVar = "distance" | "volume" | "intent";
export interface Step { index: number; day: number; changes: RampVar; distancePct: number; volumePct: number; intentPct: number }

/**
 * Steps sized to the ramp, ≥ 48 hours apart, one variable per step: distance,
 * then volume, then intent. Short ramps top out at 80% intent (§1).
 */
export function rampSteps(days: number, band: RampBand): Step[] {
  if (days <= 0) return [];
  const n = Math.max(1, Math.floor((days - 1) / 2) + 1);
  const topIntent = band === "short" ? 80 : 100;
  const intentLadder = band === "short" ? [60, 80] : [60, 70, 80, 90, 100];
  let nI = Math.min(intentLadder.length, Math.max(1, n - 2));
  if (n === 1) nI = 0;
  const rest = n - nI;
  const nD = Math.max(n >= 2 ? 1 : 1, Math.ceil(rest / 2));
  const nV = Math.max(0, rest - nD);
  const pickI = nI >= intentLadder.length ? intentLadder : Array.from({ length: nI }, (_, i) => intentLadder[Math.round(((i + 1) * (intentLadder.length - 1)) / nI)] ?? topIntent);
  const out: Step[] = [];
  let dist = 50, vol = 50, inten = 50;
  const push = (c: RampVar) => out.push({ index: out.length, day: out.length * 2, changes: c, distancePct: dist, volumePct: vol, intentPct: inten });
  for (let i = 1; i <= nD; i++) { dist = Math.round(50 + (50 * i) / nD); push("distance"); }
  for (let i = 1; i <= nV; i++) { vol = Math.round(50 + (50 * i) / nV); push("volume"); }
  for (const v of pickI) { inten = v; push("intent"); }
  return out.slice(0, n);
}

export interface Gate { painFree: boolean; soreness: number | null }
export const SORENESS_THRESHOLD = 3;
/** A failed gate repeats the step; nothing skips ahead. */
export function advance(current: number, g: Gate, total: number): { step: number; repeated: boolean } {
  const pass = g.painFree && g.soreness !== null && g.soreness < SORENESS_THRESHOLD;
  if (!pass) return { step: current, repeated: true };
  return { step: Math.min(current + 1, total - 1), repeated: false };
}

// ---------------------------------------------------------------- throwing break

/**
 * Step 27 B — Hammers offseason-to-off-days ratio: 4 no-throw days per month of
 * downtime; under 18 the ratio may rise to 5–8 from the athlete's own signals.
 * (The fixed annual rest rule was removed by owner order.)
 */
export function throwingBreakDays(downtimeDays: number, age: number | null, signals: Omit<BreakSignals, "age"> = {}): { days: number; perMonth: number; rule: string; reasons: string[] } {
  const b = offseasonBreakDays(downtimeDays, { age, ...signals });
  return { days: b.days, perMonth: b.perMonth, rule: b.rule, reasons: b.reasons };
}

// ---------------------------------------------------------------- throwing build calendar

export type ThrowDay = "rest" | "catch" | "flat" | "mound";
export interface BuildDay { day: number; kind: ThrowDay; note?: string }

export function isYoung(age: number | null): boolean {
  return age === null || age <= 15;
}

/**
 * Day-by-day throwing build. Young athletes (15 and under, or unknown age):
 * no consecutive throwing days for the first two weeks. Everyone: never three
 * in a row. Structured builds: catch play only for the first 2–3 weeks, then
 * flat ground once a week, then (pitchers) mound once a week building to twice,
 * finishing with a ~20–25 pitch mound day.
 */
export function throwingBuild(days: number, band: RampBand, age: number | null, isPitcher: boolean): BuildDay[] {
  const out: BuildDay[] = [];
  const young = isYoung(age);
  const early = 14;
  let streak = 0;
  const catchOnlyDays = band === "structured" ? Math.min(21, Math.max(14, Math.round(days * 0.4))) : days;
  for (let d = 0; d < days; d++) {
    const mustRest = streak >= 2 || (young && d < early && streak >= 1);
    if (mustRest) { out.push({ day: d, kind: "rest" }); streak = 0; continue; }
    let kind: ThrowDay = "catch";
    if (band === "structured" && d >= catchOnlyDays) {
      const wk = Math.floor((d - catchOnlyDays) / 7);
      const dow = (d - catchOnlyDays) % 7;
      if (dow === 1) kind = "flat";
      if (isPitcher && d >= catchOnlyDays + 7 && (dow === 3 || (wk >= 2 && dow === 5))) kind = "mound";
    }
    out.push({ day: d, kind });
    streak++;
  }
  if (isPitcher && band === "structured") {
    for (let i = out.length - 1; i >= 0; i--) if (out[i].kind !== "rest") { out[i] = { ...out[i], kind: "mound", note: "about 20 to 25 pitches off the mound" }; break; }
  }
  return out;
}

export function maxThrowStreak(b: BuildDay[]): number {
  let m = 0, s = 0;
  for (const d of b) { s = d.kind === "rest" ? 0 : s + 1; m = Math.max(m, s); }
  return m;
}

// ---------------------------------------------------------------- calendar placement

export interface PlacedRamp {
  discipline: RampDiscipline;
  start: string;
  /** Ramp session dates — game days are skipped, never used. */
  dates: string[];
  end: string;
  days: number;
}

function addDays(iso: string, n: number) {
  return new Date(Date.parse(iso + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);
}

/** Lays a ramp on the calendar from `start`, skipping game days (a ramp never overlaps a game). */
export function placeRamp(discipline: RampDiscipline, start: string, days: number, gameDates: ReadonlyArray<string>): PlacedRamp {
  const games = new Set(gameDates);
  const dates: string[] = [];
  let d = start;
  while (dates.length < days) { if (!games.has(d)) dates.push(d); d = addDays(d, 1); }
  return { discipline, start, dates, end: dates[dates.length - 1] ?? start, days };
}

/**
 * A calendar squeeze shortens the block BEFORE the ramp, never the ramp.
 * Returns the block's new length and the reason when it had to give way.
 */
export function squeeze(blockDays: number, rampDays: number, availableDays: number): { blockDays: number; rampDays: number; reason: string | null } {
  if (blockDays + rampDays <= availableDays) return { blockDays, rampDays, reason: null };
  const b = Math.max(0, availableDays - rampDays);
  return { blockDays: b, rampDays, reason: b === 0 ? "No room for the block — the ramp runs in full first." : `Block shortened to ${b} days so the ramp runs in full.` };
}

// ---------------------------------------------------------------- plain words

const TAIL: Record<RampDiscipline, string> = {
  throwing: "distance first, intent later",
  lifting: "lighter first, strength later",
  speed: "build-ups first, top speed later",
  bat_speed: "easy swings first, live later",
  conditioning: "steady work first, sprints last",
  jumps: "earning your level back",
};
const NAME: Record<RampDiscipline, string> = {
  throwing: "Throwing", lifting: "Lifting", speed: "Speed", bat_speed: "Bat speed", conditioning: "Conditioning", jumps: "Jumps",
};

/** §5 — "Throwing build, day 6 of 16 — distance first, intent later." */
export function rampLine(d: RampDiscipline, dayIndex: number, total: number): string {
  return `${NAME[d]} build, day ${dayIndex + 1} of ${total} — ${TAIL[d]}.`;
}

// ---------------------------------------------------------------- learned tolerance

export interface ToleranceState { version: number; factor: number; enabled: boolean }
/** ±20% from 1.0, at most 5% a week, versioned, auto-disabled if outcomes get worse. */
export function stepTolerance(prev: ToleranceState, lastRampRepeats: number, lastRampSteps: number, outcomesWorse: boolean): ToleranceState {
  if (!prev.enabled) return prev;
  if (outcomesWorse) return { version: prev.version + 1, factor: 1, enabled: false };
  const rate = lastRampSteps ? lastRampRepeats / lastRampSteps : 0;
  const dir = rate > 0.25 ? 1 : rate === 0 ? -1 : 0;
  if (!dir) return prev;
  const next = Math.min(1.2, Math.max(0.8, prev.factor * (1 + 0.05 * dir)));
  const bounded = Math.min(prev.factor * 1.05, Math.max(prev.factor * 0.95, next));
  if (bounded === prev.factor) return prev;
  return { version: prev.version + 1, factor: Math.round(bounded * 10000) / 10000, enabled: true };
}

// ---------------------------------------------------------------- all ramps for one athlete

export interface ActiveRamp extends RampLength { dayIndex: number; line: string; placed: PlacedRamp; steps: Step[] }

/**
 * Ramps that are running today. `sinceReturn` = days since the athlete came
 * back in that discipline after D days off (0 = first day back).
 */
export function activeRamps(args: {
  today: string;
  gap: Partial<Record<RampDiscipline, { daysOff: number; returnedOn: string } | null>>;
  profile: RampProfile;
  gameDates: ReadonlyArray<string>;
}): ActiveRamp[] {
  const out: ActiveRamp[] = [];
  for (const d of RAMP_DISCIPLINES) {
    const g = args.gap[d];
    if (!g) continue;
    const len = rampLength(d, g.daysOff, args.profile);
    if (!len.days) continue;
    const placed = placeRamp(d, g.returnedOn, len.days, args.gameDates);
    const idx = placed.dates.indexOf(args.today);
    if (idx < 0) continue;
    out.push({ ...len, dayIndex: idx, line: rampLine(d, idx, len.days), placed, steps: rampSteps(len.days, len.band) });
  }
  return out;
}
