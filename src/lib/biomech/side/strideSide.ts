/**
 * Single source of truth: athlete side → which foot strides.
 *
 * Hitting: a right-handed hitter strides with the LEFT foot (front foot = left),
 * a left-handed hitter with the RIGHT foot.
 * Pitching / throwing: a right-handed thrower strides with the LEFT foot, a
 * left-handed thrower with the RIGHT foot.
 * So in every module: side "R" → left ankle is the front (lift + plant) foot,
 * side "L" → right ankle.
 *
 * There is NO default. An unknown side means the front foot is unknown and the
 * foot anchors must refuse — defaulting to right-handed was the root cause of
 * the D-PLANT bug (the detector watched the back foot of every right-handed
 * hitter, and the lift and plant were read from different feet).
 */
import type { LandmarkSeries } from "../pose/landmarkSeriesFormat";

export type Handedness = "L" | "R";
/** Profile value: single side, switch/ambidextrous ("S"), or not recorded. */
export type ProfileSide = Handedness | "S" | null;

export const BLAZEPOSE_LEFT_ANKLE = 27;
export const BLAZEPOSE_RIGHT_ANKLE = 28;

export function frontAnkleIndex(side: Handedness): 27 | 28 {
  return side === "R" ? BLAZEPOSE_LEFT_ANKLE : BLAZEPOSE_RIGHT_ANKLE;
}
export function rearAnkleIndex(side: Handedness): 27 | 28 {
  return side === "R" ? BLAZEPOSE_RIGHT_ANKLE : BLAZEPOSE_LEFT_ANKLE;
}
export function frontSideName(side: Handedness): "left" | "right" {
  return side === "R" ? "left" : "right";
}

export type ClipSideResolution =
  | { status: "known"; side: Handedness; source: "profile" | "clip_choice" }
  | { status: "needs_choice"; case: "switch" | "not_recorded" };

/**
 * Owner rule (2026-09-27):
 *  1. profile single side → use it, unless the athlete overrode it for this clip
 *  2. switch / ambidextrous → a per-clip choice is REQUIRED
 *  3. nothing recorded → ask (and the caller saves the answer to the profile)
 */
export function resolveClipSide(profile: ProfileSide, clipChoice: Handedness | null): ClipSideResolution {
  if (clipChoice === "L" || clipChoice === "R") return { status: "known", side: clipChoice, source: "clip_choice" };
  if (profile === "L" || profile === "R") return { status: "known", side: profile, source: "profile" };
  return { status: "needs_choice", case: profile === "S" ? "switch" : "not_recorded" };
}

/**
 * direction_sign (+1 = the pitcher / target is +x in the image) derived from
 * the known side and the clip: the front foot sits on the target side of the
 * rear foot. Median over observed stance frames. null when the ankles are not
 * observed or are not separated by at least MIN_SEPARATION (normalised x).
 */
export const MIN_ANKLE_SEPARATION = 0.02;
export function deriveDirectionSign(series: LandmarkSeries, side: Handedness): 1 | -1 | null {
  const fi = frontAnkleIndex(side), ri = rearAnkleIndex(side);
  const d: number[] = [];
  for (const f of series.frames) {
    if (!f.pose_detected) continue;
    const vf = f.visibility?.[fi] ?? 0, vr = f.visibility?.[ri] ?? 0;
    if (vf < 0.5 || vr < 0.5) continue;
    const xf = f.normalized[fi * 3], xr = f.normalized[ri * 3];
    if (!Number.isFinite(xf) || !Number.isFinite(xr)) continue;
    d.push(xf - xr);
  }
  if (d.length === 0) return null;
  const s = [...d].sort((a, b) => a - b);
  const m = s[Math.floor((s.length - 1) / 2)];
  if (Math.abs(m) < MIN_ANKLE_SEPARATION) return null;
  return m > 0 ? 1 : -1;
}
