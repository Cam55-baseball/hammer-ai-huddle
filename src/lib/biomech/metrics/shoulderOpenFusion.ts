/**
 * Early shoulder opening from ONE side-on camera — five-signal fusion (2026-09-27).
 *
 * Measured on the still clip 15d75bc9 (p99 of |median3 − Stance Lock median|,
 * worst of both throwing sides). Provisional: one subject, 29.97 fps.
 *
 *  S1 far-shoulder visibility  — EXCLUDED. MediaPipe visibility is saturated at
 *     ~1.00 for both shoulders on the still clip AND through the full swing of
 *     914cf54c (shoulder width fell 12% of stature, visibility never < 0.996).
 *     The model does not report occlusion; the signal carries no information.
 *  S2 shoulder/hip width ratio — floor 0.062 (4.0% of 1.54) ≈ 15.9° equivalent.
 *  S3 torso triangle area      — floor 0.15 %stature² (4.1% of 3.67) ≈ 16.4°.
 *  (width alone, reference)    — floor 0.59 %stature (2.8% of 20.8) ≈ 13.7°.
 *     S2, S3 and width are all cosine-type: flattest at closed. They share the
 *     shoulder landmarks, so they count as ONE vote ("width family").
 *  S4 shoulder-mid vs hip-mid horizontal offset — floor 0.69 %stature. Directly
 *     observed in 2-D and SIGNED; gives the direction width cannot.
 *  S5 glove wrist vs shoulder midpoint — floor 2.05 %stature. Opening direction
 *     (glove pulls back toward the throwing side) is an ASSUMPTION until a real
 *     pitching clip confirms it.
 *
 * Fusion: fail = ≥2 independent votes (width family, S4, S5) agree on opening
 * beyond their own floors. Pass = every signal within its floor at plant (closed
 * to within the width detection limit). Anything else = signals disagree →
 * missingness. Still clip: 0/328 frames with two agreeing votes either side.
 */
import type { LandmarkSeries, LandmarkSeriesFrame } from "../pose/landmarkSeriesFormat";
import { LM, pointPx, mid, median, round4, type Pt } from "../anchors/poseKinematics";
import { unroll, type StanceLock } from "../anchors/stanceLock";
import type { Handedness } from "../side/strideSide";

export const SHOULDER_FUSION_VERSION = "shoulder_open_fusion@1.0.0-width-offset-glove";
export const SHOULDER_FUSION_FLOORS = {
  s1_far_visibility: { floor: 0.0002, used: false, why: "visibility saturated at ~1.0 on still and swing clips — no occlusion information" },
  width_pct: 0.59, s2_ratio: 0.062, s3_area: 0.15, s4_offset_pct: 0.69, s5_glove_pct: 2.05,
} as const;
/** Detection limit of the pass verdict, degrees (width family: acos(1 − 0.59/20.84)). */
export const SHOULDER_FUSION_DETECTION_LIMIT_DEG = 13.7;

type Sig = { width: number | null; ratio: number | null; area: number | null; s4: number | null; s5: number | null };

export function shoulderSignals(series: LandmarkSeries, f: LandmarkSeriesFrame, lock: StanceLock, dir: 1 | -1, side: Handedness): Sig {
  const st = lock.baseline!.stature_px!, roll = lock.baseline!.roll_deg;
  const P = (i: number): Pt | null => { const p = pointPx(series, f, i); return p ? unroll(p, roll) : null; };
  const ls = P(LM.L_SHOULDER), rs = P(LM.R_SHOULDER), lh = P(LM.L_HIP), rh = P(LM.R_HIP);
  const sw = ls && rs ? Math.hypot(ls.x - rs.x, ls.y - rs.y) : null, hw = lh && rh ? Math.hypot(lh.x - rh.x, lh.y - rh.y) : null;
  const sm = mid(ls, rs), hm = mid(lh, rh);
  const glove = P(side === "R" ? LM.L_WRIST : LM.R_WRIST);
  return {
    width: sw ? (sw * 100) / st : null,
    ratio: sw && hw ? sw / hw : null,
    area: ls && rs && hm ? (Math.abs((rs.x - ls.x) * (hm.y - ls.y) - (hm.x - ls.x) * (rs.y - ls.y)) / 2 / (st * st)) * 100 : null,
    s4: sm && hm ? ((sm.x - hm.x) * dir * 100) / st : null,
    s5: glove && sm ? ((glove.x - sm.x) * dir * 100) / st : null,
  };
}

export interface ShoulderFusion {
  readonly verdict: "pass" | "fail" | null;
  readonly value_deg: number | null;
  readonly votes: Readonly<Record<string, "open" | "closed" | "within_floor" | "unobserved">>;
  readonly deltas: Readonly<Record<string, number | null>>;
  readonly agreeing: number;
  readonly available: number;
  readonly reason: string | null;
}

export function fuseShoulderOpen(series: LandmarkSeries, lock: StanceLock, plant_k: number, dir: 1 | -1, side: Handedness): ShoulderFusion {
  const g = (k: number) => shoulderSignals(series, series.frames[k], lock, dir, side);
  const keys = ["width", "ratio", "area", "s4", "s5"] as const;
  const base: Record<string, number | null> = {};
  for (const key of keys) { const xs: number[] = []; for (let k = lock.start_k!; k <= lock.end_k!; k++) { const v = g(k)[key]; if (v != null) xs.push(v); } base[key] = median(xs); }
  const at: Record<string, number | null> = {};
  for (const key of keys) { const xs = [plant_k - 1, plant_k, plant_k + 1].filter((j) => series.frames[j]).map((j) => g(j)[key]).filter((x): x is number => x != null); at[key] = xs.length >= 2 ? median(xs) : null; }
  const d = (key: string) => (base[key] == null || at[key] == null ? null : at[key]! - base[key]!);
  const F = SHOULDER_FUSION_FLOORS;
  const dw = d("width"), dr = d("ratio"), da = d("area"), d4 = d("s4"), d5 = d("s5");
  // width family: a drop beyond floor in width AND in at least one of ratio/area-consistent direction
  const widthVote = dw == null ? "unobserved" : -dw > F.width_pct ? "open" : Math.abs(dw) <= F.width_pct ? "within_floor" : "closed";
  const s4Vote = d4 == null ? "unobserved" : d4 > F.s4_offset_pct ? "open" : d4 < -F.s4_offset_pct ? "closed" : "within_floor";
  const s5Vote = d5 == null ? "unobserved" : -d5 > F.s5_glove_pct ? "open" : d5 > F.s5_glove_pct ? "closed" : "within_floor";
  const votes = { s1_far_visibility: "unobserved", width_family: widthVote, s4_offset: s4Vote, s5_glove: s5Vote } as const;
  const vs = [widthVote, s4Vote, s5Vote];
  const available = vs.filter((v) => v !== "unobserved").length;
  const open = vs.filter((v) => v === "open").length, within = vs.filter((v) => v === "within_floor").length;
  const angle = dw != null && base.width ? (Math.acos(Math.max(-1, Math.min(1, at.width! / base.width))) * 180) / Math.PI : null;
  const deltas = { width_pct: r(dw), ratio: r(dr), area: r(da), s4_offset_pct: r(d4), s5_glove_pct: r(d5) };
  if (available < 2) return { verdict: null, value_deg: null, votes, deltas, agreeing: open, available, reason: "fewer_than_two_signals_observed" };
  if (open >= 2) return { verdict: "fail", value_deg: angle == null ? null : round4(angle), votes, deltas, agreeing: open, available, reason: null };
  if (within === available) return { verdict: "pass", value_deg: angle == null ? null : round4(angle), votes, deltas, agreeing: within, available, reason: null };
  return { verdict: null, value_deg: null, votes, deltas, agreeing: open, available, reason: "signals_disagree" };
}
const r = (v: number | null) => (v == null ? null : round4(v));
