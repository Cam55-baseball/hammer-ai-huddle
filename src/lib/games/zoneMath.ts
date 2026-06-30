/**
 * zoneMath — canonical 3×3 zone IDs + sport-aware labels for hot/cold maps.
 *
 * Zone IDs follow MLB convention (1..9, reading left→right, top→bottom from
 * the umpire's view = catcher's view):
 *   1 2 3
 *   4 5 6
 *   7 8 9
 *
 * For a RHB, "in" = right column (3,6,9); for a LHB, "in" = left column (1,4,7).
 * Softball uses the same grid but with rise-emphasis at the top row.
 */

import type { Sport } from "./archetypes";

export type ZoneId = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
export const ALL_ZONES: ZoneId[] = ["1","2","3","4","5","6","7","8","9"];

export const ZONE_LABELS_BASEBALL: Record<ZoneId, string> = {
  "1": "Up-Glove",  "2": "Up-Mid",     "3": "Up-Arm",
  "4": "Mid-Glove", "5": "Heart",      "6": "Mid-Arm",
  "7": "Low-Glove", "8": "Low-Mid",    "9": "Low-Arm",
};

export const ZONE_LABELS_SOFTBALL: Record<ZoneId, string> = {
  "1": "Rise-Glove", "2": "Rise-Mid", "3": "Rise-Arm",
  "4": "Belt-Glove", "5": "Belt",     "6": "Belt-Arm",
  "7": "Drop-Glove", "8": "Drop-Mid", "9": "Drop-Arm",
};

export function zoneLabels(sport: Sport): Record<ZoneId, string> {
  return sport === "softball" ? ZONE_LABELS_SOFTBALL : ZONE_LABELS_BASEBALL;
}

/** Per-batter-side aliases — translates "inner third" cues into actual zone IDs. */
export function batterSideZones(bats: "L" | "R") {
  const isR = bats === "R";
  return {
    inner: isR ? (["3","6","9"] as ZoneId[]) : (["1","4","7"] as ZoneId[]),
    outer: isR ? (["1","4","7"] as ZoneId[]) : (["3","6","9"] as ZoneId[]),
    middle: ["2","5","8"] as ZoneId[],
    upper: ["1","2","3"] as ZoneId[],
    middleHeight: ["4","5","6"] as ZoneId[],
    lower: ["7","8","9"] as ZoneId[],
    heart: ["5"] as ZoneId[],
  };
}

/**
 * Compute per-zone hot/cold scores from a flat list of pitches with results.
 *
 * Scoring (simple, transparent): swing-and-miss = -1, hard contact = +1,
 * called strike = -0.25, ball = 0. Returns -1..+1 normalized per zone with
 * sample size. The AI uses this as numerical input rather than re-deriving.
 */
export interface PitchPoint {
  zone?: ZoneId | string | null;
  result?: string | null;        // "ball" | "called_strike" | "swing_miss" | "foul" | "in_play"
  contact_quality?: string | null; // "barrel" | "solid" | "weak" | "mishit"
}

export interface ZoneScore {
  zone: ZoneId;
  score: number;     // -1..+1
  n: number;
}

export function computeZoneScores(pitches: PitchPoint[]): ZoneScore[] {
  const buckets: Record<ZoneId, { sum: number; n: number }> = Object.fromEntries(
    ALL_ZONES.map((z) => [z, { sum: 0, n: 0 }])
  ) as any;
  for (const p of pitches) {
    const z = String(p.zone ?? "").trim() as ZoneId;
    if (!ALL_ZONES.includes(z)) continue;
    let v = 0;
    if (p.result === "swing_miss") v = -1;
    else if (p.result === "called_strike") v = -0.25;
    else if (p.result === "in_play") {
      if (p.contact_quality === "barrel") v = 1;
      else if (p.contact_quality === "solid") v = 0.5;
      else if (p.contact_quality === "weak") v = -0.4;
      else if (p.contact_quality === "mishit") v = -0.6;
      else v = 0.2;
    } else if (p.result === "foul") v = -0.1;
    buckets[z].sum += v;
    buckets[z].n += 1;
  }
  return ALL_ZONES.map((z) => {
    const b = buckets[z];
    return { zone: z, n: b.n, score: b.n === 0 ? 0 : b.sum / b.n };
  });
}

/** Pick the top-K hot and cold zones from a score list. */
export function pickHotCold(scores: ZoneScore[], k = 3) {
  const ranked = [...scores].filter((s) => s.n >= 2).sort((a, b) => b.score - a.score);
  return {
    hot: ranked.slice(0, k).filter((s) => s.score > 0.1).map((s) => s.zone),
    cold: ranked.slice(-k).filter((s) => s.score < -0.1).map((s) => s.zone),
  };
}
