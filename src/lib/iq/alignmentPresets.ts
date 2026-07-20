/**
 * Factory presets for defensive alignments.
 * Owner can override any of these in the alignments editor.
 *
 * Baseball rules (from the owner spec, 1 step ≈ 2.5 ft):
 *   Standard:
 *     3B — 7 steps toward 2B, 7 steps back from bag
 *     1B — 5 steps toward 2B, 5 steps back from bag
 *     SS — 45 ft off 2B toward 3B, 3 steps back
 *     2B — 45 ft off 2B toward 1B, 3 steps back
 *     CF — 3 steps opposite the pitcher from 2B (RHH → right of 2B), deep
 *     LF — RHH: 3 steps right of 3B–2B line, deep. LHH: aligned with 1B/2B.
 *     RF — RHH: aligned with 2B/3B. LHH: 3 steps left of that.
 *   DP Depth: middle IF 4 in from bag / 3 back; corners 5↔5
 *
 * Softball scales linearly with baseDist (60/90 ≈ 0.67).
 */

import type { DefensiveAnchors, FieldSport, StepAnchor } from "./fieldModel";
import { mirrorAnchor } from "./fieldModel";

type PresetKey =
  | "standard" | "dp_depth" | "no_doubles" | "corners_in"
  | "infield_in" | "guard_lines" | "shift_pull" | "first_and_third" | "wheel";

export interface PresetSeed {
  sport: FieldSport;
  preset_key: PresetKey;
  label: string;
  anchors_vs_rhh: DefensiveAnchors;
  anchors_vs_lhh: DefensiveAnchors;
  is_default: boolean;
}

// ---------- shared helpers ----------
const scaleForSoftball = 60 / 90; // proportional step-count scaling

function sc(sport: FieldSport, n: number) {
  return sport === "softball" ? Math.round(n * scaleForSoftball) : n;
}
function scFt(sport: FieldSport, ft: number) {
  return sport === "softball" ? Math.round(ft * scaleForSoftball) : ft;
}

// ---------- STANDARD ----------
function standardRHH(sport: FieldSport): DefensiveAnchors {
  return {
    P: { kind: "mound" },
    C: { kind: "plate" },
    "3B": { kind: "corner_bag", bag: "3B", towardSecond: sc(sport, 7), backFromBag: sc(sport, 7) },
    "1B": { kind: "corner_bag", bag: "1B", towardSecond: sc(sport, 5), backFromBag: sc(sport, 5) },
    SS:   { kind: "middle_bag", fromBag: "2B", towardBag: "3B", feetFromFromBag: scFt(sport, 45), backSteps: sc(sport, 3) },
    "2B": { kind: "middle_bag", fromBag: "2B", towardBag: "1B", feetFromFromBag: scFt(sport, 45), backSteps: sc(sport, 3) },
    // CF: RHH => 3 steps RIGHT of 2B (away from pitcher's line of sight)
    CF: { kind: "outfield", lateralStepsRightOfSecond:  sc(sport, 3),  depthStepsFromHome: sc(sport, 100) },
    // LF: RHH => 3 steps right of the 3B/2B baseline projection
    LF: { kind: "outfield", lateralStepsRightOfSecond: -sc(sport, 22), depthStepsFromHome: sc(sport, 95) },
    // RF: RHH => lined up with 2B/3B extension
    RF: { kind: "outfield", lateralStepsRightOfSecond:  sc(sport, 25), depthStepsFromHome: sc(sport, 95) },
  };
}
function standardLHH(sport: FieldSport): DefensiveAnchors {
  // Mirror outfield lateral rule; corner OFs shift per spec:
  //   LF vs LHH: aligned with 1B/2B (small right shift toward CF)
  //   RF vs LHH: 3 steps LEFT of 2B/3B extension
  const base = standardRHH(sport);
  return {
    ...base,
    CF: { kind: "outfield", lateralStepsRightOfSecond: -sc(sport, 3),  depthStepsFromHome: sc(sport, 100) },
    LF: { kind: "outfield", lateralStepsRightOfSecond: -sc(sport, 25), depthStepsFromHome: sc(sport, 95) },
    RF: { kind: "outfield", lateralStepsRightOfSecond:  sc(sport, 22), depthStepsFromHome: sc(sport, 95) },
  };
}

// ---------- DERIVED PRESETS (deltas from standard) ----------
type Mut = (a: DefensiveAnchors) => DefensiveAnchors;

const applyMiddleDP: Mut = (a) => ({
  ...a,
  SS:   { kind: "middle_bag", fromBag: "2B", towardBag: "3B", feetFromFromBag: 10, backSteps: -3 } as StepAnchor, // 4 in, 3 back → tighter
  "2B": { kind: "middle_bag", fromBag: "2B", towardBag: "1B", feetFromFromBag: 10, backSteps: -3 } as StepAnchor,
});
const applyCornersFive: Mut = (a) => ({
  ...a,
  "3B": { kind: "corner_bag", bag: "3B", towardSecond: 5, backFromBag: 5 },
  "1B": { kind: "corner_bag", bag: "1B", towardSecond: 5, backFromBag: 5 },
});
const applyNoDoubles: Mut = (a) => {
  const o = { ...a };
  (["LF","CF","RF"] as const).forEach((r) => {
    const cur = o[r]; if (cur?.kind !== "outfield") return;
    o[r] = { ...cur, depthStepsFromHome: cur.depthStepsFromHome + 8,
             lateralStepsRightOfSecond: cur.lateralStepsRightOfSecond +
               (r === "LF" ? -4 : r === "RF" ? 4 : 0) };
  });
  return o;
};
const applyCornersIn: Mut = (a) => ({
  ...a,
  "3B": { kind: "corner_bag", bag: "3B", towardSecond: 0, backFromBag: -3 },
  "1B": { kind: "corner_bag", bag: "1B", towardSecond: 0, backFromBag: -3 },
});
const applyInfieldIn: Mut = (a) => ({
  ...a,
  "3B": { kind: "corner_bag", bag: "3B", towardSecond: 3, backFromBag: -5 },
  "1B": { kind: "corner_bag", bag: "1B", towardSecond: 3, backFromBag: -5 },
  SS:   { kind: "middle_bag", fromBag: "2B", towardBag: "3B", feetFromFromBag: 25, backSteps: -6 },
  "2B": { kind: "middle_bag", fromBag: "2B", towardBag: "1B", feetFromFromBag: 25, backSteps: -6 },
});
const applyGuardLines: Mut = (a) => ({
  ...a,
  "3B": { kind: "corner_bag", bag: "3B", towardSecond: 2, backFromBag: 5 },
  "1B": { kind: "corner_bag", bag: "1B", towardSecond: 2, backFromBag: 5 },
});
const applyShiftPullRHH: Mut = (a) => ({
  ...a,
  // 2B in short LF area (rare "reverse shift" — for RHH pull hitters)
  "2B": { kind: "middle_bag", fromBag: "2B", towardBag: "3B", feetFromFromBag: 25, backSteps: 4 },
  SS:   { kind: "middle_bag", fromBag: "2B", towardBag: "3B", feetFromFromBag: 55, backSteps: 6 },
});
const applyShiftPullLHH: Mut = (a) => ({
  ...a,
  SS:   { kind: "middle_bag", fromBag: "2B", towardBag: "1B", feetFromFromBag: 25, backSteps: 4 },
  "2B": { kind: "middle_bag", fromBag: "2B", towardBag: "1B", feetFromFromBag: 55, backSteps: 6 },
});
const applyFirstAndThird: Mut = (a) => ({
  ...a,
  SS:   { kind: "middle_bag", fromBag: "2B", towardBag: "3B", feetFromFromBag: 20, backSteps: 0 },
  "2B": { kind: "middle_bag", fromBag: "2B", towardBag: "1B", feetFromFromBag: 20, backSteps: 0 },
});
const applyWheel: Mut = (a) => ({
  ...a,
  "3B": { kind: "corner_bag", bag: "3B", towardSecond: 0, backFromBag: -6 }, // charging
  SS:   { kind: "middle_bag", fromBag: "3B", towardBag: "2B", feetFromFromBag: 5, backSteps: 0 }, // covers 3rd
  "2B": { kind: "middle_bag", fromBag: "2B", towardBag: "1B", feetFromFromBag: 5, backSteps: 0 }, // covers 2nd
});

// ---------- Compose per-sport seed list ----------
export function seedPresets(sport: FieldSport): PresetSeed[] {
  const std_R = standardRHH(sport);
  const std_L = standardLHH(sport);

  const make = (
    key: PresetKey, label: string, mut: Mut, isDefault = false,
  ): PresetSeed => ({
    sport, preset_key: key, label,
    anchors_vs_rhh: mut(std_R),
    anchors_vs_lhh: mut(std_L),
    is_default: isDefault,
  });

  return [
    { sport, preset_key: "standard" as const, label: "Standard",
      anchors_vs_rhh: std_R, anchors_vs_lhh: std_L, is_default: true } satisfies PresetSeed,
    make("dp_depth",         "Double-play depth",   (a) => applyMiddleDP(applyCornersFive(a))),
    make("no_doubles",       "No-doubles (late/lead)", applyNoDoubles),
    make("corners_in",       "Corners in (bunt/squeeze)", applyCornersIn),
    make("infield_in",       "Infield in (cut R3)", applyInfieldIn),
    make("guard_lines",      "Guard the lines (late)", applyGuardLines),
    make("shift_pull",       "Shift — pull side",  (a) => a), // handedness handled below
    make("first_and_third",  "1st & 3rd", applyFirstAndThird),
    make("wheel",            "Wheel (bunt coverage)", applyWheel),
  ].map((p) => {
    if (p.preset_key !== "shift_pull") return p;
    return {
      ...p,
      anchors_vs_rhh: applyShiftPullRHH(std_R),
      anchors_vs_lhh: applyShiftPullLHH(std_L),
    };
  });
}

/** Auto-mirror helper for legacy presets that only have one hand defined. */
export function autoMirror(anchors: DefensiveAnchors): DefensiveAnchors {
  const out: DefensiveAnchors = {};
  (Object.keys(anchors) as (keyof DefensiveAnchors)[]).forEach((k) => {
    const a = anchors[k]; if (!a) return;
    out[k as keyof DefensiveAnchors] = mirrorAnchor(a);
  });
  return out;
}
