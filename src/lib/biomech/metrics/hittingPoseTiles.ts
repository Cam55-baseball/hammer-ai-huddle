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
import { detectLoadApex } from "../anchors/poseEvents";
import { frontFootPlantFromSeries } from "./hittingOwnerTiles";
import { deriveDirectionSign, type Handedness } from "../side/strideSide";
import { LM, pointPx, median, mid, round4, type Pt } from "../anchors/poseKinematics";
import { detectStanceLock, unroll, type StanceLock } from "../anchors/stanceLock";
import { detectCameraView, checkCameraRequirement, type CameraViewResult } from "../camera/cameraView";

export const HITTING_POSE_TILES_VERSION = "hitting_pose_tiles@1.0.0-hip-load-hands-outside-stride-direction";

/** Still clip 15d75bc9, p99 of |median3 − lock median|, % of stature. */
export const HIP_LOAD_NOISE_FLOOR_PCT = 0.6;
/** Still clip 15d75bc9, p99 of |median3(rear wrist − rear shoulder) − lock median|, % of stature. */
export const HANDS_OUTSIDE_NOISE_FLOOR_PCT = 0.9;

export const HITTING_POSE_STANDARDS = {
  hip_load: { source: "none_supplied", note: "ungraded — owner number needed" },
  hands_outside_shoulders_at_landing: { pass: "rear wrist behind the rear shoulder (toward the catcher) at full plant", source: "owner_coaching_standard" },
  stride_direction: { target_deg: 15, reference: "square line to the pitcher", source: "owner_coaching_standard" },
} as const;

type Key = keyof typeof HITTING_POSE_STANDARDS;
export interface HittingPoseTileResult {
  readonly key: Key;
  readonly value: number | null;
  readonly unit: "percent_stature" | "degrees";
  readonly uncertainty: number | null;
  readonly verdict: "pass" | "fail" | null;
  readonly missingness: MissingnessRecord | null;
  readonly confidence: ConfidenceRecord;
  readonly standard: (typeof HITTING_POSE_STANDARDS)[Key];
  readonly lineage: Readonly<Record<string, unknown>>;
}
const UNIT: Record<Key, HittingPoseTileResult["unit"]> = { hip_load: "percent_stature", hands_outside_shoulders_at_landing: "percent_stature", stride_direction: "degrees" };
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
    ({ hip_load: refuse("hip_load", rec, l), hands_outside_shoulders_at_landing: refuse("hands_outside_shoulders_at_landing", rec, l) });
  const gate = (r: HittingPoseTileResult) => {
    const g = checkCameraRequirement(r.key, cam.view);
    if (g.ok) return g.detail ? { ...r, lineage: { ...r.lineage, camera_view: g.detail } } : r;
    return refuse(r.key, mr(R.CALIBRATION_UNAVAILABLE), { reason: g.detail, message: g.message });
  };
  const stride = gate(refuse("stride_direction", mr(R.CALIBRATION_UNAVAILABLE), {}));
  const base = { version: HITTING_POSE_TILES_VERSION, camera_view: cam as CameraViewResult, stride_direction: stride };
  if (!o.side) return { ...base, ...all(mr(R.ANCHOR_NOT_DETECTED), { reason: "batting_side_unknown" }) };
  const dir = deriveDirectionSign(series, o.side);
  if (dir == null) return { ...base, ...all(mr(R.ANCHOR_NOT_DETECTED), { reason: "direction_sign_underivable" }) };
  const lock = detectStanceLock(series);
  if (!lock.ok || !lock.baseline?.stature_px) return { ...base, ...all(lock.missingness ?? mr(R.ANCHOR_NOT_DETECTED), { reason: lock.detail ?? "stance_lock_missing" }) };
  return { ...base, hip_load: gate(computeHipLoad(series, o.side, dir, lock)), hands_outside_shoulders_at_landing: gate(computeHandsOutside(series, o.side, dir, lock)) };
}
