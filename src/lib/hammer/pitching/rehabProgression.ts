/**
 * Rehab / return-to-throwing progression — pure catalog.
 *
 * Conservative interval-throwing progressions for TJ (24 wk) and generic
 * shoulder return (12 wk). Every stage clamps mound work OFF and gates on
 * an explicit "cleared through stage" ack from the athlete. The engine
 * never advances the athlete — only surfaces where they are.
 */

export type RehabProgram = "tj_return" | "shoulder_return" | "generic";

export interface RehabStage {
  readonly week: number;
  readonly label: string;
  readonly maxDistanceFt: number;
  readonly moundAllowed: boolean;
  readonly focus: string;
}

export const TJ_RETURN: ReadonlyArray<RehabStage> = [
  { week: 1,  label: "Passive ROM only",             maxDistanceFt: 0,   moundAllowed: false, focus: "No throwing — soft-tissue + scapular activation." },
  { week: 6,  label: "Toss initiation",              maxDistanceFt: 30,  moundAllowed: false, focus: "30 ft, 25 throws, 3x/wk. Zero effort past 50%." },
  { week: 10, label: "45–60 ft interval",            maxDistanceFt: 60,  moundAllowed: false, focus: "45 ft → 60 ft, 3 sets of 25, EOD." },
  { week: 14, label: "90 ft build",                  maxDistanceFt: 90,  moundAllowed: false, focus: "90 ft crow-hops, EASS bands daily." },
  { week: 18, label: "120–150 ft long toss",         maxDistanceFt: 150, moundAllowed: false, focus: "Long-toss ladder. Down-phase throws only." },
  { week: 20, label: "Flat-ground pitch tunnels",    maxDistanceFt: 60,  moundAllowed: false, focus: "Flat-ground bullpen, 25 pitches @ 75%." },
  { week: 22, label: "Half-mound bullpen",           maxDistanceFt: 60,  moundAllowed: true,  focus: "Half-effort mound, 20 pitches FB only." },
  { week: 24, label: "Full bullpen · no BP",         maxDistanceFt: 60,  moundAllowed: true,  focus: "35 pitch pen with breaking balls layered in." },
];

export const SHOULDER_RETURN: ReadonlyArray<RehabStage> = [
  { week: 1, label: "Rest + isometric",  maxDistanceFt: 0,   moundAllowed: false, focus: "No throwing. Isometrics + T/Y/W band work." },
  { week: 3, label: "30 ft interval",    maxDistanceFt: 30,  moundAllowed: false, focus: "20 throws @ 30 ft, EOD." },
  { week: 5, label: "60 ft interval",    maxDistanceFt: 60,  moundAllowed: false, focus: "45 → 60 ft ladders, 30 throws." },
  { week: 7, label: "90 ft ladder",      maxDistanceFt: 90,  moundAllowed: false, focus: "Long-toss ladder to 90 ft." },
  { week: 9, label: "Flat-ground bullpen", maxDistanceFt: 60, moundAllowed: false, focus: "25 flat-ground pitches, 70% effort." },
  { week: 11, label: "Half-mound bullpen", maxDistanceFt: 60, moundAllowed: true,  focus: "20-pitch half-effort mound." },
  { week: 12, label: "Return-to-competition", maxDistanceFt: 60, moundAllowed: true, focus: "Progress bullpen volume 5 pitches/wk." },
];

export const GENERIC_RETURN: ReadonlyArray<RehabStage> = [
  { week: 1, label: "Prehab week",       maxDistanceFt: 0,  moundAllowed: false, focus: "No throwing. Recovery + mobility." },
  { week: 2, label: "Catch play",        maxDistanceFt: 45, moundAllowed: false, focus: "45 ft catch play, 30 throws." },
  { week: 3, label: "Long toss",         maxDistanceFt: 90, moundAllowed: false, focus: "Long-toss ladder. No mound." },
  { week: 4, label: "Flat + light pen",  maxDistanceFt: 60, moundAllowed: true,  focus: "20-pitch pen at 75%." },
];

export function progressionFor(program: RehabProgram): ReadonlyArray<RehabStage> {
  switch (program) {
    case "tj_return":       return TJ_RETURN;
    case "shoulder_return": return SHOULDER_RETURN;
    case "generic":         return GENERIC_RETURN;
  }
}

/** Resolves the stage the athlete is currently in based on their week-in-program. */
export function currentStage(program: RehabProgram, weekInProgram: number): RehabStage {
  const list = progressionFor(program);
  let stage = list[0];
  for (const s of list) {
    if (weekInProgram >= s.week) stage = s;
  }
  return stage;
}
