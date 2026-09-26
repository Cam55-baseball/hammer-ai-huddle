/**
 * Pose-derived event anchors — D-STILL, D-FIRST-MOVE, D-RELEASE (pose-only
 * tier), D-LOAD-APEX, D-SWING-START, D-P4, D-FINISH.
 *
 * Shape copied from metrics/tempoSec.ts: pure, deterministic, canonical
 * missingness, no model in the value path. Input is the PERSISTED landmark
 * series — pose is never re-run here. Same series in → identical anchors out.
 *
 * NOT wired into any tile. Real per-detector versions live in
 * detectorVersions.ts; the global DETECTOR_VERSION stub is untouched.
 *
 * direction_sign: +1 when "toward the target / pitcher" is +x in the image,
 * −1 when it is −x. Callers must derive it from handedness + camera side; this
 * module never assumes it.
 */
import type { LandmarkSeries } from "../pose/landmarkSeriesFormat";
import { MISSINGNESS_REASONS as R, missingness, type MissingnessRecord, type MissingnessReason } from "../metrics/missingness";
import { detectorVersion, type DetectorId } from "../detectorVersions";
import {
  LM, FPS_FLOOR, FPS_T_MID, aggregateSpeed, angleDeg, bodyScale, derivative, framesFor,
  median, mid, point, round4, round6, smooth, tierFactor, track, uncertaintyMs,
} from "./poseKinematics";

/* ---------------- fixed constants (part of each version string) ---------------- */
/** Aggregate body speed under this (body-heights/s) is "still". */
export const STILL_SPEED = 0.35;
/** A still run must last at least this long. */
export const STILL_MIN_SEC = 0.25;
/** First movement must persist this many consecutive frames. */
export const PERSIST_FRAMES = 2;
/** Release fusion: signals agree when within this many frames. */
export const RELEASE_AGREE_FRAMES = 2;
/** Elbow / brake search half-window around the wrist-speed peak. */
export const RELEASE_SEARCH_SEC = 0.2;
/** Braking onset = first frame reaching this fraction of peak deceleration. */
export const BRAKE_FRACTION = 0.5;
/** Load apex must sit at least this far (body-heights) behind stance hands. */
export const LOAD_MIN_DISPLACEMENT = 0.02;
/** Swing start: forward hand acceleration threshold, body-heights/s². */
export const SWING_ACCEL = 6;
/** P4: back-elbow forward speed threshold, body-heights/s. */
export const P4_ELBOW_SPEED = 0.15;

export interface AnchorResult {
  readonly anchor: string;
  readonly detector_id: DetectorId;
  readonly detector_version: string;
  readonly frame_index: number | null;
  readonly t_seconds: number | null;
  /** 0..1; null when missing. Uncalibrated — a detector-internal certainty. */
  readonly confidence: number | null;
  readonly anchor_uncertainty_ms: number | null;
  readonly missingness: MissingnessRecord | null;
  readonly diagnostics: Readonly<Record<string, unknown>>;
}

function miss(anchor: string, id: DetectorId, reason: MissingnessReason, diagnostics: Record<string, unknown> = {}): AnchorResult {
  return {
    anchor, detector_id: id, detector_version: detectorVersion(id), frame_index: null, t_seconds: null,
    confidence: null, anchor_uncertainty_ms: null, missingness: missingness(reason, "D-ANCHOR"), diagnostics,
  };
}

function hit(
  series: LandmarkSeries, anchor: string, id: DetectorId, k: number, confidence: number,
  uncertaintyFrames: number, diagnostics: Record<string, unknown>,
): AnchorResult {
  const f = series.frames[k];
  return {
    anchor, detector_id: id, detector_version: detectorVersion(id), frame_index: f.frame_index,
    t_seconds: round6(f.timestamp_seconds), confidence: round4(Math.max(0, Math.min(1, confidence))),
    anchor_uncertainty_ms: uncertaintyMs(series.header.fps_true, uncertaintyFrames), missingness: null, diagnostics,
  };
}

/** Common preconditions: fps, pose presence, scale. */
function prep(series: LandmarkSeries, anchor: string, id: DetectorId, minFps = FPS_FLOOR) {
  const fps = series.header.fps_true;
  if (!Number.isFinite(fps) || fps < minFps) return { err: miss(anchor, id, R.INSUFFICIENT_TEMPORAL_RESOLUTION, { fps }) };
  if (series.header.subject_track_reliable === false) return { err: miss(anchor, id, R.POSE_NOT_DETECTED, { reason: "subject_track_unreliable" }) };
  if (!series.frames.some((f) => f.pose_detected)) return { err: miss(anchor, id, R.POSE_NOT_DETECTED) };
  const scale = bodyScale(series);
  if (scale == null) return { err: miss(anchor, id, R.LANDMARK_OCCLUDED, { reason: "no_body_scale" }) };
  const speed = smooth(aggregateSpeed(series, scale), 1);
  return { fps, scale, speed };
}

/* ================= D-STILL ================= */
export interface StillRun { readonly start: number; readonly end: number } // series positions, inclusive

export function stillRuns(speed: readonly (number | null)[], minLen: number, from = 0): StillRun[] {
  const out: StillRun[] = [];
  let s = -1;
  for (let k = from; k <= speed.length; k++) {
    const v = k < speed.length ? speed[k] : null;
    const still = v != null && v < STILL_SPEED;
    if (still && s < 0) s = k;
    if (!still && s >= 0) {
      if (k - s >= minLen) out.push({ start: s, end: k - 1 });
      s = -1;
    }
  }
  return out;
}

/**
 * isStill over an inclusive FRAME-INDEX range. true/false when every frame is
 * observed; null when any frame in the range is unobserved (never guessed).
 */
export function isStill(series: LandmarkSeries, range: readonly [number, number]): boolean | null {
  const scale = bodyScale(series);
  if (scale == null) return null;
  const speed = smooth(aggregateSpeed(series, scale), 1);
  let any = false;
  for (let k = 0; k < series.frames.length; k++) {
    const fi = series.frames[k].frame_index;
    if (fi < range[0] || fi > range[1]) continue;
    const v = speed[k];
    if (v == null) return null;
    any = true;
    if (v >= STILL_SPEED) return false;
  }
  return any ? true : null;
}

export function detectStill(series: LandmarkSeries): AnchorResult {
  const A = "stance_start_frame", ID = "D-STILL" as const;
  const p = prep(series, A, ID);
  if ("err" in p) return p.err!;
  const minLen = framesFor(p.fps, STILL_MIN_SEC, 3);
  const runs = stillRuns(p.speed, minLen);
  const observed = p.speed.filter((v) => v != null).length / Math.max(1, series.frames.length);
  if (runs.length === 0) return miss(A, ID, observed < 0.6 ? R.LANDMARK_OCCLUDED : R.ANCHOR_NOT_DETECTED, { min_len: minLen, observed_fraction: round4(observed) });
  const r = runs[0];
  const len = r.end - r.start + 1;
  const conf = Math.min(1, len / (2 * minLen)) * tierFactor(p.fps) * Math.min(1, observed / 0.8);
  return hit(series, A, ID, r.start, conf, 1, { run_len_frames: len, min_len: minLen, runs: runs.length, observed_fraction: round4(observed) });
}

/* ================= D-FIRST-MOVE ================= */
export function detectFirstMove(series: LandmarkSeries): AnchorResult {
  const A = "first_movement_frame", ID = "D-FIRST-MOVE" as const;
  const p = prep(series, A, ID);
  if ("err" in p) return p.err!;
  const minLen = framesFor(p.fps, STILL_MIN_SEC, 3);
  const runs = stillRuns(p.speed, minLen);
  if (runs.length === 0) return miss(A, ID, R.ANCHOR_NOT_DETECTED, { reason: "no_prior_stillness" });
  for (const r of runs) {
    const k = r.end + 1;
    let ok = true, gap = false;
    for (let j = 0; j < PERSIST_FRAMES; j++) {
      const v = p.speed[k + j];
      if (v == null) { gap = true; ok = false; break; }
      if (v < STILL_SPEED) { ok = false; break; }
    }
    if (ok) {
      const conf = 0.8 * tierFactor(p.fps) * Math.min(1, (r.end - r.start + 1) / (2 * minLen)) + 0.2;
      return hit(series, A, ID, k, conf, 1, { still_run_len: r.end - r.start + 1 });
    }
    if (gap) return miss(A, ID, R.LANDMARK_OCCLUDED, { at_frame: series.frames[k]?.frame_index ?? null });
  }
  return miss(A, ID, R.ANCHOR_NOT_DETECTED, { reason: "never_left_stillness" });
}

/* ================= D-RELEASE — POSE-ONLY TIER ================= */
export interface ReleaseOptions { readonly throwing_side: "left" | "right" }

export function detectReleasePoseOnly(series: LandmarkSeries, opts: ReleaseOptions): AnchorResult {
  const A = "pitcher_release_frame", ID = "D-RELEASE-POSE" as const;
  const p = prep(series, A, ID, FPS_T_MID);
  if ("err" in p) return p.err!;
  const L = opts.throwing_side === "left";
  const [S, E, W] = L ? [LM.L_SHOULDER, LM.L_ELBOW, LM.L_WRIST] : [LM.R_SHOULDER, LM.R_ELBOW, LM.R_WRIST];
  const fr = series.frames;
  const wx = track(series, (f) => point(f, W), "x", p.scale);
  const wy = track(series, (f) => point(f, W), "y", p.scale);
  const vx = derivative(series, wx), vy = derivative(series, wy);
  const wSpeed = smooth(vx.map((v, k) => (v != null && vy[k] != null ? Math.hypot(v, vy[k]!) : null)), 1);
  // Signal 1: peak wrist speed (earliest on tie).
  let s1 = -1;
  wSpeed.forEach((v, k) => { if (v != null && (s1 < 0 || v > wSpeed[s1]!)) s1 = k; });
  if (s1 < 0) return miss(A, ID, R.LANDMARK_OCCLUDED, { reason: "throwing_wrist_unobserved" });
  const half = framesFor(p.fps, RELEASE_SEARCH_SEC, 3);
  const lo = Math.max(0, s1 - half), hi = Math.min(fr.length - 1, s1 + half);
  // Signal 2: max elbow extension in window.
  let s2 = -1, s2v = -1;
  for (let k = lo; k <= hi; k++) {
    const a = angleDeg(point(fr[k], S), point(fr[k], E), point(fr[k], W));
    if (a != null && a > s2v) { s2v = a; s2 = k; }
  }
  // Signal 3: braking onset after the peak.
  const acc = derivative(series, wSpeed);
  let minAcc = 0;
  for (let k = s1 + 1; k <= hi; k++) if (acc[k] != null && acc[k]! < minAcc) minAcc = acc[k]!;
  let s3 = -1;
  if (minAcc < 0) for (let k = s1 + 1; k <= hi; k++) if (acc[k] != null && acc[k]! <= BRAKE_FRACTION * minAcc) { s3 = k; break; }
  const sig = [s1, s2, s3].filter((k) => k >= 0);
  // Best agreeing subset (≥2 within ±RELEASE_AGREE_FRAMES).
  let best: number[] = [];
  for (let i = 0; i < sig.length; i++) {
    const grp = sig.filter((k) => Math.abs(k - sig[i]) <= RELEASE_AGREE_FRAMES);
    const spread = Math.max(...grp) - Math.min(...grp);
    if (spread <= RELEASE_AGREE_FRAMES * 2 && (grp.length > best.length || (grp.length === best.length && spread < Math.max(...best) - Math.min(...best)))) best = grp;
  }
  const diag = {
    tier: "pose_only",
    signal_frames: { wrist_speed_peak: fr[s1]?.frame_index ?? null, elbow_extension_max: s2 >= 0 ? fr[s2].frame_index : null, brake_onset: s3 >= 0 ? fr[s3].frame_index : null },
    elbow_extension_deg: s2 >= 0 ? round4(s2v) : null,
    note: "Pose-only tier. A ball-assisted tier (ball leaves hand) will be more precise; this does not claim that precision.",
  };
  if (best.length < 2) return miss(A, ID, R.ANCHOR_NOT_DETECTED, { ...diag, agreeing: best.length });
  const k = median(best)!;
  const spread = Math.max(...best) - Math.min(...best);
  const conf = (best.length === 3 ? 0.85 : 0.6) * (1 - spread / (2 * RELEASE_AGREE_FRAMES + 1)) * tierFactor(p.fps);
  // Signals 1 and 3 are physically coupled (braking follows the speed peak),
  // so a 1+3 agreement is weaker evidence than one that includes the elbow.
  const elbow_confirmed = best.includes(s2);
  return hit(series, A, ID, k, elbow_confirmed ? conf : conf * 0.8, Math.max(1, spread), { ...diag, agreeing: best.length, spread_frames: spread, elbow_confirmed });
}

/* ================= hitting helpers ================= */
function handsForward(series: LandmarkSeries, scale: number, dir: 1 | -1) {
  return track(series, (f) => mid(point(f, LM.L_WRIST), point(f, LM.R_WRIST)), "x", scale).map((v) => (v == null ? null : v * dir));
}

/* ================= D-LOAD-APEX ================= */
export function detectLoadApex(series: LandmarkSeries, direction_sign: 1 | -1 | null): AnchorResult {
  const A = "hand_load_apex", ID = "D-LOAD-APEX" as const;
  if (direction_sign !== 1 && direction_sign !== -1) return miss(A, ID, R.ANCHOR_NOT_DETECTED, { reason: "direction_sign_unknown" });
  const p = prep(series, A, ID);
  if ("err" in p) return p.err!;
  const fwd = smooth(handsForward(series, p.scale, direction_sign), 1);
  const v = derivative(series, fwd);
  const still = detectStill(series);
  const startK = still.frame_index != null ? series.frames.findIndex((f) => f.frame_index === still.frame_index) : 0;
  const baseVals = fwd.slice(startK, startK + framesFor(p.fps, STILL_MIN_SEC, 3)).filter((x): x is number => x != null);
  const base = median(baseVals);
  if (base == null) return miss(A, ID, R.LANDMARK_OCCLUDED, { reason: "stance_hands_unobserved" });
  // Candidates: rearward velocity (v<0) turns forward (v>0) and stays forward 2 frames.
  let bestK = -1;
  for (let k = startK + 1; k < fwd.length - PERSIST_FRAMES; k++) {
    if (v[k] == null || v[k]! >= 0) continue;
    if (!(v[k + 1] != null && v[k + 1]! > 0 && v[k + 2] != null && v[k + 2]! > 0)) continue;
    const disp = base - (fwd[k] ?? base);
    if (disp < LOAD_MIN_DISPLACEMENT) continue;
    if (bestK < 0 || fwd[k]! < fwd[bestK]!) bestK = k;
  }
  if (bestK < 0) return miss(A, ID, R.ANCHOR_NOT_DETECTED, { reason: "no_confirmed_rear_extremum" });
  const disp = base - fwd[bestK]!;
  const conf = Math.min(1, disp / (4 * LOAD_MIN_DISPLACEMENT)) * 0.9 * tierFactor(p.fps) + 0.1;
  return hit(series, A, ID, bestK, conf, 1, { rear_displacement_body_heights: round4(disp) });
}

/* ================= D-SWING-START ================= */
export function detectSwingStart(series: LandmarkSeries, direction_sign: 1 | -1 | null, loadApex?: AnchorResult): AnchorResult {
  const A = "swing_start_frame", ID = "D-SWING-START" as const;
  const apex = loadApex ?? detectLoadApex(series, direction_sign);
  if (apex.frame_index == null) return miss(A, ID, R.ANCHOR_NOT_DETECTED, { reason: "hand_load_apex_missing", upstream: apex.missingness?.missing_reason });
  const p = prep(series, A, ID);
  if ("err" in p) return p.err!;
  const fwd = smooth(handsForward(series, p.scale, direction_sign!), 1);
  const v = derivative(series, fwd);
  const a = derivative(series, v);
  const k0 = series.frames.findIndex((f) => f.frame_index === apex.frame_index);
  for (let k = k0 + 1; k < fwd.length - 1; k++) {
    const ok = [k, k + 1].every((j) => a[j] != null && a[j]! > SWING_ACCEL && v[j] != null && v[j]! > 0);
    if (ok) return hit(series, A, ID, k, 0.7 * tierFactor(p.fps), 1, { accel_body_heights_s2: round4(a[k]!), tier: "pose_only" });
    if (a[k] == null) return miss(A, ID, R.LANDMARK_OCCLUDED, { at_frame: series.frames[k].frame_index });
  }
  return miss(A, ID, R.ANCHOR_NOT_DETECTED, { reason: "no_forward_acceleration" });
}

/* ================= D-P4 ================= */
export function detectP4(series: LandmarkSeries, direction_sign: 1 | -1 | null, front_foot_full_plant_frame: number | null): AnchorResult {
  const A = "p4_start_frame", ID = "D-P4" as const;
  if (direction_sign !== 1 && direction_sign !== -1) return miss(A, ID, R.ANCHOR_NOT_DETECTED, { reason: "direction_sign_unknown" });
  if (front_foot_full_plant_frame == null) return miss(A, ID, R.FRONT_FOOT_FULL_PLANT_MISSING);
  const p = prep(series, A, ID);
  if ("err" in p) return p.err!;
  // Back elbow = the elbow whose shoulder sits further from the pitcher at stance.
  const lsx: number[] = [], rsx: number[] = [];
  for (const f of series.frames) { const l = point(f, LM.L_SHOULDER), r = point(f, LM.R_SHOULDER); if (l && r) { lsx.push(l.x * direction_sign); rsx.push(r.x * direction_sign); } }
  const ml = median(lsx), mr = median(rsx);
  if (ml == null || mr == null) return miss(A, ID, R.LANDMARK_OCCLUDED, { reason: "shoulders_unobserved" });
  const backElbow = ml < mr ? LM.L_ELBOW : LM.R_ELBOW;
  const ev = derivative(series, smooth(track(series, (f) => point(f, backElbow), "x", p.scale).map((x) => (x == null ? null : x * direction_sign)), 1));
  const hv = derivative(series, smooth(handsForward(series, p.scale, direction_sign), 1));
  const k0 = series.frames.findIndex((f) => f.frame_index >= front_foot_full_plant_frame);
  if (k0 < 0) return miss(A, ID, R.ANCHOR_NOT_DETECTED, { reason: "plant_outside_series" });
  for (let k = k0; k < series.frames.length - 1; k++) {
    const ok = [k, k + 1].every((j) => ev[j] != null && ev[j]! > P4_ELBOW_SPEED && hv[j] != null && hv[j]! < ev[j]!);
    if (ok) return hit(series, A, ID, k, 0.7 * tierFactor(p.fps), 1, { back_elbow: backElbow === LM.L_ELBOW ? "left" : "right", elbow_fwd_speed: round4(ev[k]!) });
  }
  return miss(A, ID, R.ANCHOR_NOT_DETECTED, { reason: "back_elbow_never_led_hands_after_plant" });
}

/* ================= D-FINISH ================= */
export function detectFinish(series: LandmarkSeries): AnchorResult {
  const A = "finish_frame", ID = "D-FINISH" as const;
  const p = prep(series, A, ID);
  if ("err" in p) return p.err!;
  const ang = series.frames.map((f) => { const l = point(f, LM.L_SHOULDER), r = point(f, LM.R_SHOULDER); return l && r ? Math.atan2(r.y - l.y, r.x - l.x) : null; });
  const w = smooth(derivative(series, ang).map((x) => { if (x == null) return null; let d = x / p.fps; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d * p.fps); }), 1);
  let pk = -1;
  w.forEach((v, k) => { if (v != null && (pk < 0 || v > w[pk]!)) pk = k; });
  if (pk < 0) return miss(A, ID, R.LANDMARK_OCCLUDED, { reason: "shoulders_unobserved" });
  const minLen = framesFor(p.fps, STILL_MIN_SEC, 3);
  const runs = stillRuns(p.speed, minLen, pk + 1);
  if (runs.length === 0) return miss(A, ID, R.ANCHOR_NOT_DETECTED, { reason: "no_return_to_stillness", peak_rotation_frame: series.frames[pk].frame_index });
  return hit(series, A, ID, runs[0].start, 0.75 * tierFactor(p.fps), 1, { peak_rotation_frame: series.frames[pk].frame_index, peak_rotation_rad_s: round4(w[pk]!) });
}

/** Run every built anchor. D-COIL is deliberately absent (awaiting owner sign-off). */
export function detectAllPoseEvents(series: LandmarkSeries, o: { direction_sign: 1 | -1 | null; throwing_side: "left" | "right"; front_foot_full_plant_frame: number | null }) {
  const load = detectLoadApex(series, o.direction_sign);
  return {
    still: detectStill(series), first_move: detectFirstMove(series),
    release_pose: detectReleasePoseOnly(series, { throwing_side: o.throwing_side }),
    load_apex: load, swing_start: detectSwingStart(series, o.direction_sign, load),
    p4: detectP4(series, o.direction_sign, o.front_foot_full_plant_frame), finish: detectFinish(series),
  };
}
