/**
 * Pose-only hitting tiles (rebuild, 2026-09-27). Pattern: tempoSec.ts — pure,
 * explicit inputs, canonical missingness, no model in the value path,
 * byte-identical across runs.
 *
 * Rules carried from the pitching block:
 *  - Stance Lock is the baseline (never a time window). No lock → refuse.
 *  - Robust statistics: 3-frame medians at an anchor, window medians for a
 *    baseline — never max−min of raw samples.
 *  - Every floor is MEASURED on the still clip 15d75bc9 (p99 of the same
 *    statistic over all still frames). Provisional: one subject, 29.97 fps.
 *  - No owner number → value reported UNGRADED (verdict null). Never invented.
 *  - Coordinates are rotated by the stance roll and expressed as % of stature;
 *    + is toward the pitcher (direction_sign).
 *  - Per-tile camera requirement (camera/cameraView.ts) is enforced here.
 */
import type { LandmarkSeries, LandmarkSeriesFrame } from "../pose/landmarkSeriesFormat";
import { MISSINGNESS_REASONS as R, missingness, type MissingnessRecord, type MissingnessReason } from "./missingness";
import { uncalibrated, missingConfidence, type ConfidenceRecord } from "./confidence";
import { detectLoadApex, detectSwingStart, detectSwingPeak } from "../anchors/poseEvents";
import { frontFootPlantFromSeries } from "./hittingOwnerTiles";
import { deriveDirectionSign, type Handedness } from "../side/strideSide";
import { LM, pointPx, median, mid, round4, type Pt } from "../anchors/poseKinematics";
import { detectStanceLock, unroll, headCentroidPx, type StanceLock } from "../anchors/stanceLock";
import { smooth } from "../anchors/poseKinematics";
import { detectCameraView, checkCameraRequirement, type CameraViewResult } from "../camera/cameraView";

export const HITTING_POSE_TILES_VERSION = "hitting_pose_tiles@1.2.0-grip-gate-head-discipline";

/**
 * Grip gate for hand_load. Both hands are on one bat handle, so the wrists sit
 * within a few inches (~5% of stature). If they read further apart than this,
 * the midpoint is not "the hands" — it moves when the wrists converge, not
 * when the hands load. Reasoned bound (hands-together ≈5% + 2× the 2.3% wrist
 * floor, rounded up), not fitted to any clip.
 */
export const HAND_GRIP_MAX_SEP_PCT = 15;
/** Still clip 15d75bc9 — see docs/landmark-noise-floors.md (head discipline). */
export const HEAD_PULL_NOISE_FLOOR_PCT = 0.75; // still max 0.733 (p99 0.52), 0.7 s windows, worst side
export const HEAD_YAW_JERK_NOISE_FLOOR = 47; // %stature/s², still max 46.70 (p99 42.92)

/** Still clip 15d75bc9, p99 of |median3 − clip median|, % of stature (0.80). */
export const HIP_LOAD_NOISE_FLOOR_PCT = 0.8;
/** Still clip 15d75bc9, p99 of |median3(rear wrist − rear shoulder) − clip median|, % of stature; worst side (left wrist 2.28, right 0.96). */
export const HANDS_OUTSIDE_NOISE_FLOOR_PCT = 2.3;

/** Still clip 15d75bc9, p99 of |median3(hands-mid forward) − clip median|, % of stature (1.35; vertical 2.72). */
export const HAND_LOAD_NOISE_FLOOR_PCT = 1.35;

export const HITTING_POSE_STANDARDS = {
  hand_load: { source: "none_supplied", note: "ungraded — owner number needed (rearward hand travel, % of stature)" },
  p2_timing: { pass: "hand load finished by pitcher peak knee lift", source: "owner_coaching_standard" },
  p3_timing: { target_ms: 0, note: "front foot fully down at pitcher release", source: "owner_coaching_standard" },
  hip_load: { source: "none_supplied", note: "ungraded — owner number needed" },
  hands_outside_shoulders_at_landing: { pass: "rear wrist behind the rear shoulder (toward the catcher) at full plant", source: "owner_coaching_standard" },
  stride_direction: { target_deg: 15, reference: "square line to the pitcher", source: "owner_coaching_standard" },
  head_discipline: { source: "none_supplied", note: "ungraded — body only: late head pull (primary) + head-turn smoothness; does not verify where the eyes look" },
} as const;

type Key = keyof typeof HITTING_POSE_STANDARDS;
export interface HittingPoseTileResult {
  readonly key: Key;
  readonly value: number | null;
  readonly unit: "percent_stature" | "degrees" | "ms" | "boolean";
  readonly uncertainty: number | null;
  readonly verdict: "pass" | "fail" | null;
  readonly missingness: MissingnessRecord | null;
  readonly confidence: ConfidenceRecord;
  readonly standard: (typeof HITTING_POSE_STANDARDS)[Key];
  readonly lineage: Readonly<Record<string, unknown>>;
}
const UNIT: Record<Key, HittingPoseTileResult["unit"]> = { hand_load: "percent_stature", p2_timing: "boolean", p3_timing: "ms", hip_load: "percent_stature", hands_outside_shoulders_at_landing: "percent_stature", stride_direction: "degrees", head_discipline: "percent_stature" };
const mr = (r: MissingnessReason) => missingness(r, "D-METRIC");
const refuse = (key: Key, rec: MissingnessRecord, lineage: Record<string, unknown>): HittingPoseTileResult =>
  ({ key, value: null, unit: UNIT[key], uncertainty: null, verdict: null, missingness: rec, confidence: missingConfidence(), standard: HITTING_POSE_STANDARDS[key], lineage });

const rearHip = (side: Handedness) => (side === "R" ? LM.R_HIP : LM.L_HIP);
const rearShoulder = (side: Handedness) => (side === "R" ? LM.R_SHOULDER : LM.L_SHOULDER);
const rearWrist = (side: Handedness) => (side === "R" ? LM.R_WRIST : LM.L_WRIST);

/** Forward (toward pitcher) coordinate, stance-unrolled, % of stature. */
function fwd(series: LandmarkSeries, p: Pt | null, lock: StanceLock, dir: 1 | -1): number | null {
  const st = lock.baseline?.stature_px;
  if (!p || !st) return null;
  return (unroll(p, lock.baseline!.roll_deg).x * dir * 100) / st;
}
export function hipMidFwd(series: LandmarkSeries, f: LandmarkSeriesFrame, lock: StanceLock, dir: 1 | -1) {
  return fwd(series, mid(pointPx(series, f, LM.L_HIP), pointPx(series, f, LM.R_HIP)), lock, dir);
}
/** Rear wrist minus rear shoulder, forward axis. Negative = wrist behind the shoulder (outside). */
export function wristVsShoulderFwd(series: LandmarkSeries, f: LandmarkSeriesFrame, lock: StanceLock, dir: 1 | -1, side: Handedness) {
  const w = fwd(series, pointPx(series, f, rearWrist(side)), lock, dir), s = fwd(series, pointPx(series, f, rearShoulder(side)), lock, dir);
  return w == null || s == null ? null : w - s;
}
function med3(series: LandmarkSeries, k: number, g: (f: LandmarkSeriesFrame) => number | null) {
  const xs = [k - 1, k, k + 1].map((j) => (series.frames[j] ? g(series.frames[j]) : null)).filter((x): x is number => x != null);
  return xs.length >= 2 ? median(xs) : null;
}
function lockMedian(series: LandmarkSeries, lock: StanceLock, g: (f: LandmarkSeriesFrame) => number | null) {
  const xs: number[] = [];
  for (let k = lock.start_k!; k <= lock.end_k!; k++) { const v = g(series.frames[k]); if (v != null) xs.push(v); }
  return median(xs);
}

/* hip_load — hip-mid forward drift from Stance Lock to D-LOAD-APEX. − = drifted back (loaded into the rear hip). */
function computeHipLoad(series: LandmarkSeries, side: Handedness, dir: 1 | -1, lock: StanceLock): HittingPoseTileResult {
  const K: Key = "hip_load";
  const apex = detectLoadApex(series, dir);
  if (apex.frame_index == null) return refuse(K, apex.missingness ?? mr(R.ANCHOR_NOT_DETECTED), { reason: `load_apex_missing:${String(apex.diagnostics.reason ?? "")}` });
  const k = series.frames.findIndex((f) => f.frame_index === apex.frame_index);
  if (k <= lock.end_k!) return refuse(K, mr(R.ANCHOR_NOT_DETECTED), { reason: "load_apex_inside_stance_lock", apex_frame: apex.frame_index });
  const g = (f: LandmarkSeriesFrame) => hipMidFwd(series, f, lock, dir);
  const b = lockMedian(series, lock, g), a = med3(series, k, g);
  if (b == null || a == null) return refuse(K, mr(R.LANDMARK_OCCLUDED), { reason: "hips_unobserved_in_lock_or_at_apex" });
  const v = a - b;
  if (Math.abs(v) < HIP_LOAD_NOISE_FLOOR_PCT) return refuse(K, mr(R.INSUFFICIENT_TEMPORAL_RESOLUTION), { reason: "below_still_clip_noise_floor", raw: round4(v), floor: HIP_LOAD_NOISE_FLOOR_PCT });
  return { key: K, value: round4(v), unit: "percent_stature", uncertainty: HIP_LOAD_NOISE_FLOOR_PCT, verdict: null, missingness: null, confidence: uncalibrated(), standard: HITTING_POSE_STANDARDS[K],
    lineage: { apex_frame: apex.frame_index, lock_frames: [lock.start_frame, lock.end_frame], note: "ungraded — no owner number" } };
}

/* hand_load — hands-mid forward travel, Stance Lock → D-LOAD-APEX. − = hands loaded back toward the catcher. */
export function handsMidFwd(series: LandmarkSeries, f: LandmarkSeriesFrame, lock: StanceLock, dir: 1 | -1) {
  return fwd(series, mid(pointPx(series, f, LM.L_WRIST), pointPx(series, f, LM.R_WRIST)), lock, dir);
}
export function wristSepPct(series: LandmarkSeries, f: LandmarkSeriesFrame, lock: StanceLock) {
  const a = pointPx(series, f, LM.L_WRIST), b = pointPx(series, f, LM.R_WRIST), st = lock.baseline?.stature_px;
  return a && b && st ? (Math.hypot(a.x - b.x, a.y - b.y) * 100) / st : null;
}
function computeHandLoad(series: LandmarkSeries, dir: 1 | -1, lock: StanceLock): HittingPoseTileResult {
  const K: Key = "hand_load";
  const apex = detectLoadApex(series, dir);
  if (apex.frame_index == null) return refuse(K, apex.missingness ?? mr(R.ANCHOR_NOT_DETECTED), { reason: `load_apex_missing:${String(apex.diagnostics.reason ?? "")}` });
  const k = series.frames.findIndex((f) => f.frame_index === apex.frame_index);
  if (k <= lock.end_k!) return refuse(K, mr(R.ANCHOR_NOT_DETECTED), { reason: "load_apex_inside_stance_lock", apex_frame: apex.frame_index });
  const g = (f: LandmarkSeriesFrame) => handsMidFwd(series, f, lock, dir);
  const out = (f: LandmarkSeriesFrame) => [LM.L_WRIST, LM.R_WRIST].some((i) => { const x = f.normalized[i * 3], y = f.normalized[i * 3 + 1]; return !(x >= 0 && x <= 1 && y >= 0 && y <= 1); });
  for (let j = lock.start_k!; j <= lock.end_k!; j++) if (out(series.frames[j])) return refuse(K, mr(R.OUT_OF_FRAME), { reason: "wrist_outside_image_in_stance_lock", frame: series.frames[j].frame_index });
  for (const j of [k - 1, k, k + 1]) if (series.frames[j] && out(series.frames[j])) return refuse(K, mr(R.OUT_OF_FRAME), { reason: "wrist_outside_image_at_apex", frame: series.frames[j].frame_index });
  const sep = (f: LandmarkSeriesFrame) => wristSepPct(series, f, lock);
  const sL = lockMedian(series, lock, sep), sA = med3(series, k, sep);
  if (sL == null || sA == null) return refuse(K, mr(R.HANDS_NOT_DETECTED), { reason: "wrists_unobserved_in_lock_or_at_apex" });
  if (sL > HAND_GRIP_MAX_SEP_PCT || sA > HAND_GRIP_MAX_SEP_PCT) return refuse(K, mr(R.HANDS_NOT_DETECTED), { reason: "hands_not_together_on_handle", wrist_sep_pct_lock: round4(sL), wrist_sep_pct_apex: round4(sA), max: HAND_GRIP_MAX_SEP_PCT, message: "The two wrists read too far apart to be one grip — the hand midpoint would move when the hands come together, not when they load." });
  const b = lockMedian(series, lock, g), a = med3(series, k, g);
  if (b == null || a == null) return refuse(K, mr(R.HANDS_NOT_DETECTED), { reason: "wrists_unobserved_in_lock_or_at_apex" });
  const v = a - b;
  if (Math.abs(v) < HAND_LOAD_NOISE_FLOOR_PCT) return refuse(K, mr(R.INSUFFICIENT_TEMPORAL_RESOLUTION), { reason: "below_still_clip_noise_floor", raw: round4(v), floor: HAND_LOAD_NOISE_FLOOR_PCT });
  return { key: K, value: round4(v), unit: "percent_stature", uncertainty: HAND_LOAD_NOISE_FLOOR_PCT, verdict: null, missingness: null, confidence: uncalibrated(), standard: HITTING_POSE_STANDARDS[K],
    lineage: { apex_frame: apex.frame_index, lock_frames: [lock.start_frame, lock.end_frame], wrist_sep_pct_lock: round4(sL), wrist_sep_pct_apex: round4(sA), note: "ungraded — no owner number; UNVERIFIED until the owner checks it against the video" } };
}

/* head discipline (saved key eyes_tracking) — D-SWING-START → D-SWING-PEAK. Body only.
 * (c) late head pull: change in head-centroid minus rear-shoulder, forward axis, % stature. + = head moved toward the pitcher off the back shoulder.
 * (a) head-turn smoothness: median |2nd difference| × fps² of the zero-phase-smoothed nose-minus-ear-mid forward offset (yaw proxy), %stature/s².
 * Ball alignment is NOT here — DelayCam spec. */
export function headVsRearShoulderFwd(series: LandmarkSeries, f: LandmarkSeriesFrame, lock: StanceLock, dir: 1 | -1, side: Handedness) {
  const h = fwd(series, headCentroidPx(series, f), lock, dir), s = fwd(series, pointPx(series, f, rearShoulder(side)), lock, dir);
  return h == null || s == null ? null : h - s;
}
export function headYawFwd(series: LandmarkSeries, f: LandmarkSeriesFrame, lock: StanceLock, dir: 1 | -1) {
  const n = fwd(series, pointPx(series, f, 0), lock, dir), e = fwd(series, mid(pointPx(series, f, 7), pointPx(series, f, 8)), lock, dir);
  return n == null || e == null ? null : n - e;
}
export function yawJerk(series: LandmarkSeries, k0: number, k1: number, lock: StanceLock, dir: 1 | -1): number | null {
  const y = smooth(series.frames.map((f) => headYawFwd(series, f, lock, dir)), 1);
  const fps = series.header.fps_true ?? 0, d: number[] = [];
  for (let k = k0 + 1; k < k1; k++) { const a = y[k - 1], b = y[k], c = y[k + 1]; if (a != null && b != null && c != null) d.push(Math.abs(a - 2 * b + c) * fps * fps); }
  return d.length >= 3 ? median(d) : null;
}
function computeHeadDiscipline(series: LandmarkSeries, side: Handedness, dir: 1 | -1, lock: StanceLock): HittingPoseTileResult {
  const K: Key = "head_discipline";
  const ss = detectSwingStart(series, dir);
  if (ss.frame_index == null) return refuse(K, ss.missingness ?? mr(R.ANCHOR_NOT_DETECTED), { reason: "swing_start_missing" });
  const pk = detectSwingPeak(series, dir, ss);
  if (pk.frame_index == null) return refuse(K, pk.missingness ?? mr(R.ANCHOR_NOT_DETECTED), { reason: `swing_peak_missing:${String(pk.diagnostics.reason ?? "")}` });
  const k0 = series.frames.findIndex((f) => f.frame_index === ss.frame_index), k1 = series.frames.findIndex((f) => f.frame_index === pk.frame_index);
  const g = (f: LandmarkSeriesFrame) => headVsRearShoulderFwd(series, f, lock, dir, side);
  const a = med3(series, k0, g), b = med3(series, k1, g);
  if (a == null || b == null) return refuse(K, mr(R.LANDMARK_OCCLUDED), { reason: "head_or_rear_shoulder_unobserved" });
  const pull = b - a, jerk = yawJerk(series, k0, k1, lock, dir);
  const jerkOut = jerk == null ? { value: null, reason: "head_unobserved_in_window" } : jerk < HEAD_YAW_JERK_NOISE_FLOOR ? { value: null, reason: "below_still_clip_noise_floor", raw: round4(jerk) } : { value: round4(jerk) };
  const lin = { swing_start_frame: ss.frame_index, swing_peak_frame_not_contact: pk.frame_index, head_turn_jerk_pct_s2: jerkOut, jerk_floor: HEAD_YAW_JERK_NOISE_FLOOR, pull_floor: HEAD_PULL_NOISE_FLOOR_PCT, sign: "+ = head moved toward the pitcher off the back shoulder", note: "ungraded — no owner number" };
  if (Math.abs(pull) < HEAD_PULL_NOISE_FLOOR_PCT) return refuse(K, mr(R.INSUFFICIENT_TEMPORAL_RESOLUTION), { ...lin, reason: "head_pull_within_still_clip_noise_floor", raw: round4(pull) });
  return { key: K, value: round4(pull), unit: "percent_stature", uncertainty: HEAD_PULL_NOISE_FLOOR_PCT, verdict: null, missingness: null, confidence: uncalibrated(), standard: HITTING_POSE_STANDARDS[K], lineage: lin };
}

/**
 * p2_timing / p3_timing need the PITCHER's peak knee lift / release. The
 * upload pose series tracks one subject (the hitter), so the pitcher is never
 * in the measured track. Refuse honestly — never infer pitcher timing.
 */
function pitcherTimingRefusals() {
  return {
    p2_timing: refuse("p2_timing", mr(R.ANCHOR_NOT_DETECTED), { reason: "pitcher_not_in_frame:peak_knee_lift_unobservable", message: "Needs the pitcher in the same clip. This clip tracks only the hitter." }),
    p3_timing: refuse("p3_timing", mr(R.PITCHER_RELEASE_FRAME_MISSING), { reason: "pitcher_not_in_frame:release_unobservable", message: "Needs the pitcher in the same clip. This clip tracks only the hitter." }),
  };
}

/* hands_outside_shoulders_at_landing — rear wrist vs rear shoulder at full plant. */
function computeHandsOutside(series: LandmarkSeries, side: Handedness, dir: 1 | -1, lock: StanceLock): HittingPoseTileResult {
  const K: Key = "hands_outside_shoulders_at_landing";
  const { plant } = frontFootPlantFromSeries(series, side);
  if (plant.frame_index == null) return refuse(K, plant.missingness ?? mr(R.FRONT_FOOT_FULL_PLANT_MISSING), { reason: `plant_missing:${plant.detail ?? ""}` });
  const k = series.frames.findIndex((f) => f.frame_index === plant.frame_index);
  const v = med3(series, k, (f) => wristVsShoulderFwd(series, f, lock, dir, side));
  if (v == null) return refuse(K, mr(R.LANDMARK_OCCLUDED), { reason: "rear_wrist_or_shoulder_unobserved_at_plant" });
  if (Math.abs(v) < HANDS_OUTSIDE_NOISE_FLOOR_PCT) return refuse(K, mr(R.INSUFFICIENT_TEMPORAL_RESOLUTION), { reason: "wrist_on_shoulder_line_within_noise", raw: round4(v), floor: HANDS_OUTSIDE_NOISE_FLOOR_PCT });
  return { key: K, value: round4(v), unit: "percent_stature", uncertainty: HANDS_OUTSIDE_NOISE_FLOOR_PCT, verdict: v < 0 ? "pass" : "fail", missingness: null, confidence: uncalibrated(), standard: HITTING_POSE_STANDARDS[K],
    lineage: { plant_frame: plant.frame_index, sign: "negative = wrist behind rear shoulder (outside)" } };
}

export function runHittingPoseTiles(series: LandmarkSeries, o: { side: Handedness | null }) {
  const cam = detectCameraView(series);
  const all = (rec: MissingnessRecord, l: Record<string, unknown>) =>
    ({ hip_load: refuse("hip_load", rec, l), hand_load: refuse("hand_load", rec, l), head_discipline: refuse("head_discipline", rec, l), hands_outside_shoulders_at_landing: refuse("hands_outside_shoulders_at_landing", rec, l) });
  const gate = (r: HittingPoseTileResult) => {
    const g = checkCameraRequirement(r.key, cam.view);
    if (g.ok) return g.detail ? { ...r, lineage: { ...r.lineage, camera_view: g.detail } } : r;
    return refuse(r.key, mr(R.CALIBRATION_UNAVAILABLE), { reason: g.detail, message: g.message });
  };
  const stride = gate(refuse("stride_direction", mr(R.CALIBRATION_UNAVAILABLE), {}));
  const base = { version: HITTING_POSE_TILES_VERSION, camera_view: cam as CameraViewResult, stride_direction: stride, ...pitcherTimingRefusals() };
  if (!o.side) return { ...base, ...all(mr(R.ANCHOR_NOT_DETECTED), { reason: "batting_side_unknown" }) };
  const dir = deriveDirectionSign(series, o.side);
  if (dir == null) return { ...base, ...all(mr(R.ANCHOR_NOT_DETECTED), { reason: "direction_sign_underivable" }) };
  const lock = detectStanceLock(series);
  if (!lock.ok || !lock.baseline?.stature_px) return { ...base, ...all(lock.missingness ?? mr(R.ANCHOR_NOT_DETECTED), { reason: lock.detail ?? "stance_lock_missing" }) };
  return { ...base, hip_load: gate(computeHipLoad(series, o.side, dir, lock)), hand_load: gate(computeHandLoad(series, dir, lock)), head_discipline: gate(computeHeadDiscipline(series, o.side, dir, lock)), hands_outside_shoulders_at_landing: gate(computeHandsOutside(series, o.side, dir, lock)) };
}
