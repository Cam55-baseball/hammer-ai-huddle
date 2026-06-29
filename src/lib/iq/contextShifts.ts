// Contextual positioning layer for Game IQ 101.
// Computes deterministic positional shifts for each defensive role based on
// real-game context: batter speed, swing side, tendency, next pitch, weather.
// Shifts are expressed as (dx, dy) percentages on the same 100×100 diamond
// grid used by IqDiamond.HOME_POS. Positive dy = deeper (toward CF wall).

import type { IqActorRole } from "./types";

export type ContextAxis = "batter_speed" | "swing_side" | "tendency" | "next_pitch" | "weather" | "baserunner_speed" | "outs";

export const CONTEXT_AXIS_LABELS: Record<ContextAxis, string> = {
  batter_speed: "Batter speed",
  swing_side: "Swing side",
  tendency: "Tendency",
  next_pitch: "Next pitch",
  weather: "Weather",
  baserunner_speed: "Baserunner speed",
  outs: "Outs",
};

export type ContextOption = { value: string; label: string; emoji?: string; softballOnly?: boolean };

export const CONTEXT_VALUES: Record<ContextAxis, ContextOption[]> = {
  batter_speed: [
    { value: "plus_runner", label: "Plus runner" },
    { value: "average", label: "Average" },
    { value: "plodder", label: "Plodder" },
  ],
  swing_side: [
    { value: "rhh", label: "RHH" },
    { value: "lhh", label: "LHH" },
    { value: "switch", label: "Switch" },
  ],
  tendency: [
    { value: "pull", label: "Pull" },
    { value: "spray", label: "Spray" },
    { value: "oppo", label: "Oppo" },
    { value: "bunt_threat", label: "Bunt threat" },
    { value: "slap", label: "Slap", softballOnly: true },
  ],
  next_pitch: [
    { value: "fb_in", label: "FB in" },
    { value: "fb_away", label: "FB away" },
    { value: "breaking_low", label: "Breaking low" },
    { value: "changeup", label: "Changeup" },
    { value: "rise_ball", label: "Rise", softballOnly: true },
    { value: "drop_ball", label: "Drop", softballOnly: true },
  ],
  weather: [
    { value: "wind_in", label: "Wind in" },
    { value: "wind_out_rf", label: "Wind out → RF" },
    { value: "wind_out_lf", label: "Wind out → LF" },
    { value: "wet_infield", label: "Wet infield" },
    { value: "sun_lf", label: "Sun in LF" },
    { value: "sun_rf", label: "Sun in RF" },
    { value: "hot_dry_carry", label: "Hot / dry (carry)" },
  ],
};

export function getContextValues(
  sport: "baseball" | "softball" | "both" | string | undefined,
): Record<ContextAxis, ContextOption[]> {
  const isSoftball = sport === "softball";
  if (isSoftball) return CONTEXT_VALUES;
  const out = {} as Record<ContextAxis, ContextOption[]>;
  (Object.keys(CONTEXT_VALUES) as ContextAxis[]).forEach((axis) => {
    out[axis] = CONTEXT_VALUES[axis].filter((v) => !v.softballOnly);
  });
  return out;
}


export interface ContextSelection {
  batter_speed?: string;
  swing_side?: string;
  tendency?: string;
  next_pitch?: string;
  weather?: string;
}

export interface RoleShift {
  dx: number;
  dy: number;
  notes: string[];
}

// Default shift table: keyed (axis -> value -> role -> {dx,dy,note}).
// Values are PERCENT POINTS on the 100×100 IqDiamond grid.
// Positive dy = deeper; positive dx = toward 1B foul line.
type ShiftMap = Partial<Record<IqActorRole, { dx?: number; dy?: number; note?: string }>>;
const SHIFTS: Record<ContextAxis, Record<string, ShiftMap>> = {
  batter_speed: {
    plus_runner: {
      "1B": { dx: 0, dy: -3, note: "Cheat in — bunt/slap threat from a burner." },
      "3B": { dx: 0, dy: -4, note: "Crash in two steps; expect bunt." },
      "SS": { dx: -2, dy: -2, note: "Tighten up the middle for the swinging bunt." },
      "2B": { dx: 2, dy: -2, note: "Pinch the middle, get the routine grounder fast." },
      "P":  { dy: -1, note: "Land balanced — be ready to field the bunt." },
    },
    plodder: {
      "1B": { dy: 3, note: "Play deeper, plenty of time on routine ground balls." },
      "3B": { dy: 4, note: "Back up — no bunt threat from a slow runner." },
      "SS": { dy: 3, note: "Deeper to extend your range." },
      "2B": { dy: 3, note: "Deeper to extend your range." },
    },
    average: {},
  },
  swing_side: {
    lhh: {
      "1B": { dx: 1, dy: 1, note: "Pull-side shift — get off the line one step." },
      "2B": { dx: 3, dy: 1, note: "Slide toward the hole, LHH pulls right side." },
      "SS": { dx: 5, dy: -1, note: "Shift toward second; expect pull-side ground ball." },
      "3B": { dx: -2, dy: 1, note: "Cheat into the 5/6 hole — LHH rarely pulls a hard 3B grounder." },
      "RF": { dx: 4, dy: 2, note: "Pull-side; play deeper and toward the line." },
      "LF": { dx: 4, dy: -3, note: "Oppo gap — pinch toward LCF." },
      "CF": { dx: 3, dy: 0, note: "Shade two steps toward RCF." },
    },
    rhh: {
      "1B": { dx: -1, dy: 1, note: "Pinch the hole, RHH pulls 3-4." },
      "2B": { dx: -3, dy: -1, note: "Closer to the bag; double-play depth." },
      "SS": { dx: -3, dy: 1, note: "Hole side, pull-side ground ball." },
      "3B": { dx: -2, dy: 1, note: "Guard the line on a pull hitter." },
      "LF": { dx: -4, dy: 2, note: "Pull-side; play deeper toward the line." },
      "RF": { dx: -4, dy: -3, note: "Oppo gap — pinch toward RCF." },
      "CF": { dx: -3, dy: 0, note: "Shade two steps toward LCF." },
    },
    switch: {},
  },
  tendency: {
    pull: {
      "SS": { dx: -3, dy: 1, note: "Heavy pull shift on RHH; mirror for LHH." },
      "2B": { dx: 3, dy: 1, note: "Heavy pull side on LHH; mirror for RHH." },
      "LF": { dx: -3, dy: 2, note: "Pull-side OF cheat." },
      "RF": { dx: 3, dy: 2, note: "Pull-side OF cheat." },
    },
    oppo: {
      "SS": { dx: 4, dy: 2, note: "Oppo hitter — slide toward second, play deeper." },
      "2B": { dx: -4, dy: 2, note: "Oppo hitter — slide toward second, play deeper." },
      "LF": { dx: 4, dy: 0, note: "Inside-out swing — guard the LCF gap." },
      "RF": { dx: -4, dy: 0, note: "Inside-out swing — guard the RCF gap." },
    },
    spray: {
      "CF": { dy: 2, note: "Play straight up and a half-step deeper." },
    },
    bunt_threat: {
      "1B": { dy: -5, note: "Crash hard, two-step charge on contact." },
      "3B": { dy: -6, note: "Crash hard, two-step charge on contact." },
      "P":  { dy: -1, note: "Land balanced toward the third-base side." },
      "C":  { dy: -2, note: "Quick to the front edge of the plate." },
    },
    slap: {
      "3B": { dy: -5, note: "Slap-and-run — charge the topped roller." },
      "SS": { dx: -2, dy: -2, note: "Cheat in and toward the 5-6 hole." },
      "P":  { dy: -2, note: "Be the third infielder up the middle." },
    },
  },
  next_pitch: {
    fb_in: {
      "SS": { dx: -2, dy: 0, note: "FB in to RHH — expect pull." },
      "2B": { dx: 2, dy: 0, note: "FB in to LHH — expect pull." },
    },
    fb_away: {
      "SS": { dx: 2, dy: 0, note: "FB away to RHH — expect oppo / up the middle." },
      "2B": { dx: -2, dy: 0, note: "FB away to LHH — expect oppo / up the middle." },
      "CF": { dy: 1, note: "Away pitch — slightly deeper for the line drive." },
    },
    breaking_low: {
      "3B": { dy: -2, note: "Breaking ball down — expect a chopper." },
      "1B": { dy: -2, note: "Breaking ball down — expect a chopper." },
      "P":  { dy: -1, note: "Be ready for a one-hopper back through the box." },
    },
    changeup: {
      "SS": { dy: -1, note: "Changeup — out-front contact, expect weak pull." },
      "2B": { dy: -1, note: "Changeup — out-front contact, expect weak pull." },
    },
    rise_ball: {
      "LF": { dy: 3, note: "Rise ball — hitter under it, fly ball coming." },
      "CF": { dy: 3, note: "Rise ball — hitter under it, fly ball coming." },
      "RF": { dy: 3, note: "Rise ball — hitter under it, fly ball coming." },
    },
    drop_ball: {
      "3B": { dy: -2, note: "Drop ball — ground ball coming, charge soft contact." },
      "SS": { dy: -2, note: "Drop ball — ground ball coming." },
      "2B": { dy: -2, note: "Drop ball — ground ball coming." },
      "1B": { dy: -2, note: "Drop ball — ground ball coming." },
    },
  },
  weather: {
    wind_in: {
      "LF": { dy: -4, note: "Wind blowing in — play 3-4 steps shallower." },
      "CF": { dy: -4, note: "Wind blowing in — play 3-4 steps shallower." },
      "RF": { dy: -4, note: "Wind blowing in — play 3-4 steps shallower." },
    },
    wind_out_rf: {
      "RF": { dy: 5, note: "Wind out to RF — extra carry, play deeper and toward the line." },
      "CF": { dx: 2, dy: 3, note: "Wind out to RF — shade RCF, play deeper." },
    },
    wind_out_lf: {
      "LF": { dy: 5, note: "Wind out to LF — extra carry, play deeper and toward the line." },
      "CF": { dx: -2, dy: 3, note: "Wind out to LF — shade LCF, play deeper." },
    },
    wet_infield: {
      "SS": { dy: -2, note: "Wet grass kills hops — close ground sooner." },
      "2B": { dy: -2, note: "Wet grass kills hops — close ground sooner." },
      "3B": { dy: -2, note: "Wet grass — charge soft contact." },
      "1B": { dy: -2, note: "Wet grass — charge soft contact." },
      "P":  { note: "Block balls with body — wet grip risks bad throws." },
    },
    sun_lf: {
      "LF": { dx: -1, dy: -1, note: "Sun in your eyes — pre-set glove to shield." },
      "CF": { dx: -2, note: "Help your LF on anything in the LCF sun line." },
    },
    sun_rf: {
      "RF": { dx: 1, dy: -1, note: "Sun in your eyes — pre-set glove to shield." },
      "CF": { dx: 2, note: "Help your RF on anything in the RCF sun line." },
    },
    hot_dry_carry: {
      "LF": { dy: 3, note: "Hot dry air — ball carries 5-10 ft farther." },
      "CF": { dy: 3, note: "Hot dry air — ball carries 5-10 ft farther." },
      "RF": { dy: 3, note: "Hot dry air — ball carries 5-10 ft farther." },
    },
  },
};

export function computeRoleShifts(
  selection: ContextSelection,
  roles: IqActorRole[],
): Record<string, RoleShift> {
  const out: Record<string, RoleShift> = {};
  for (const role of roles) {
    let dx = 0, dy = 0;
    const notes: string[] = [];
    (Object.keys(selection) as ContextAxis[]).forEach((axis) => {
      const value = selection[axis];
      if (!value) return;
      const map = SHIFTS[axis]?.[value];
      const entry = map?.[role];
      if (!entry) return;
      dx += entry.dx ?? 0;
      dy += entry.dy ?? 0;
      if (entry.note) notes.push(entry.note);
    });
    out[role] = { dx, dy, notes };
  }
  return out;
}

export const NEUTRAL_SELECTION: ContextSelection = {};
