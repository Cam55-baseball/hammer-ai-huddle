/**
 * D-PLANT (tempo path) — front-foot strike frame.
 *
 * A plant is a POSITION + LOAD event, not a small inter-frame time delta: the
 * front foot comes down, stops moving and stays down. At 24–30 fps that is
 * still observable; what a low rate costs is WHICH millisecond, which is
 * carried as `anchor_uncertainty_ms` (one frame interval). This detector
 * never refuses on frame rate alone.
 *
 * Search (deterministic, earliest frame wins):
 *   after_lift path — given the peak-leg-lift frame of the SAME foot, the plant
 *     is the first later frame where the foot is back down (within
 *     DOWN_TOL_BODY of its stance height) and settled: it stays within
 *     SETTLE_TOL_BODY of that position for SETTLE_SEC of real time.
 *   onset path — no lift supplied (e.g. a slide stride with no vertical lift):
 *     stride onset = first frame the foot is ≥ MIN_STRIDE_RISE_BODY away from its
 *     stance position (2-D when x is supplied); the plant is the first settled,
 *     down frame at/after onset.
 *
 * Noise gate: the foot must move ≥ MIN_STRIDE_RISE_BODY (0.10 body heights)
 * from stance — still-clip ankle range was ≤ 0.047 body heights
 * (docs/landmark-noise-floors.md), so the still clip refuses.
 *
 * Previous version (replaced 2026-09-27) took the single lowest ankle frame
 * in the WHOLE clip and required a rise before it. Combined with a fixed
 * right-ankle "front foot", it watched the back foot of every right-handed
 * hitter and refused on both 24 fps real clips.
 */

import { LANDMARK_MODEL_VERSION, DETECTOR_VERSION } from "../versions";
import {
  MISSINGNESS_REASONS,
  missingness,
  type MissingnessRecord,
} from "../metrics/missingness";

export interface PlantPoseFrame {
  readonly frame_index: number;
  /** Normalised front-foot ankle y-coordinate. null = not visible. */
  readonly front_ankle_y: number | null;
  /** Normalised front-foot ankle x-coordinate. Optional; enables in-frame + 2-D checks. */
  readonly front_ankle_x?: number | null;
  /** Vertical body height in normalised-y units. null/absent → refuse. */
  readonly body_height_y?: number | null;
}

export const MIN_STRIDE_RISE_BODY = 0.1;
/** Foot must be back within this of its stance height (body heights) to count as down. */
export const DOWN_TOL_BODY = 0.1;
/** Settled = stays within this of the plant position (body heights). Still-clip ankle range 0.047. */
export const SETTLE_TOL_BODY = 0.05;
/** Settled must hold this long in real time. */
export const SETTLE_SEC = 0.15;
/** Settle window in frames when the rate is unknown. */
export const SETTLE_FRAMES_UNKNOWN_FPS = 3;
/** Stance = the first quarter of observed frames. */
export const STANCE_FRACTION = 0.25;
/** A foot within this of the image edge is out of frame, not observed. */
export const EDGE_MARGIN = 0.005;

export interface PlantOptions {
  /** Peak-leg-lift frame of the same foot. Enables the after_lift path. */
  readonly after_frame_index?: number | null;
  /** True frame rate; only used for the settle window and uncertainty. */
  readonly fps?: number | null;
}

export interface PlantDetectionResult {
  readonly frame_index: number | null;
  readonly missingness: MissingnessRecord | null;
  readonly source_detector: string;
  readonly source_model: string;
  /** One frame interval in ms; null when the rate is unknown or no plant. */
  readonly anchor_uncertainty_ms: number | null;
  readonly path: "after_lift" | "onset" | null;
  /** Plain reason for a refusal — survives to the record. */
  readonly detail: string | null;
}

export function inFrame(x: number | null | undefined): boolean {
  return x == null || (x >= EDGE_MARGIN && x <= 1 - EDGE_MARGIN);
}

export function oneFrameMs(fps: number | null | undefined): number | null {
  return fps != null && Number.isFinite(fps) && fps > 0 ? Math.round((1000 / fps) * 10_000) / 10_000 : null;
}

function med(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)];
}

export function detectFrontFootStrike(
  poseFrames: readonly PlantPoseFrame[],
  opts: PlantOptions = {},
): PlantDetectionResult {
  const base = { source_detector: DETECTOR_VERSION, source_model: LANDMARK_MODEL_VERSION };
  const refuse = (reason: MissingnessRecord["missing_reason"], detail: string, path: PlantDetectionResult["path"] = null): PlantDetectionResult => ({
    ...base, frame_index: null, missingness: missingness(reason, "D-PLANT"), anchor_uncertainty_ms: null, path, detail,
  });

  if (LANDMARK_MODEL_VERSION.endsWith("@0.0.0-stub")) return refuse(MISSINGNESS_REASONS.POSE_MODEL_IS_STUB, "pose_model_is_stub");

  const vis = poseFrames.filter(
    (f): f is PlantPoseFrame & { front_ankle_y: number } =>
      f.front_ankle_y != null && Number.isFinite(f.front_ankle_y) && inFrame(f.front_ankle_x),
  );
  if (vis.length === 0) return refuse(MISSINGNESS_REASONS.FRONT_FOOT_FIRST_CONTACT_MISSING, "front_ankle_never_observed");

  const bodyH = med(poseFrames.map((f) => f.body_height_y).filter((h): h is number => h != null && Number.isFinite(h) && h > 0));
  if (bodyH == null) return refuse(MISSINGNESS_REASONS.LANDMARK_OCCLUDED, "body_height_unobserved");

  const hasX = vis.every((f) => f.front_ankle_x != null && Number.isFinite(f.front_ankle_x));
  const stance = vis.slice(0, Math.max(3, Math.ceil(vis.length * STANCE_FRACTION)));
  const baseY = med(stance.map((f) => f.front_ankle_y))!;
  const baseX = hasX ? med(stance.map((f) => f.front_ankle_x as number))! : 0;
  const dist = (f: PlantPoseFrame & { front_ankle_y: number }, x0: number, y0: number) =>
    hasX ? Math.hypot((f.front_ankle_x as number) - x0, f.front_ankle_y - y0) : Math.abs(f.front_ankle_y - y0);

  let start: number;
  let path: "after_lift" | "onset";
  if (opts.after_frame_index != null) {
    path = "after_lift";
    start = vis.findIndex((f) => f.frame_index > (opts.after_frame_index as number));
    if (start < 0) return refuse(MISSINGNESS_REASONS.ANCHOR_NOT_DETECTED, "no_observed_frames_after_lift", path);
  } else {
    path = "onset";
    start = vis.findIndex((f) => dist(f, baseX, baseY) / bodyH >= MIN_STRIDE_RISE_BODY);
    if (start < 0) return refuse(MISSINGNESS_REASONS.ANCHOR_NOT_DETECTED, "no_stride_movement_above_noise", path);
  }

  const fps = opts.fps;
  const n = fps != null && Number.isFinite(fps) && fps > 0 ? Math.max(2, Math.ceil(fps * SETTLE_SEC)) : SETTLE_FRAMES_UNKNOWN_FPS;
  for (let k = start; k + n - 1 < vis.length; k++) {
    const f = vis[k];
    if ((baseY - f.front_ankle_y) / bodyH > DOWN_TOL_BODY) continue; // still up
    let ok = true;
    for (let j = 1; j < n; j++) {
      const g = vis[k + j];
      if (g.frame_index !== f.frame_index + j) { ok = false; break; } // gap: not observed as settled
      if (dist(g, hasX ? (f.front_ankle_x as number) : 0, f.front_ankle_y) / bodyH > SETTLE_TOL_BODY) { ok = false; break; }
    }
    if (ok) {
      return { ...base, frame_index: f.frame_index, missingness: null, anchor_uncertainty_ms: oneFrameMs(fps), path, detail: null };
    }
  }
  return refuse(MISSINGNESS_REASONS.ANCHOR_NOT_DETECTED, path === "after_lift" ? "foot_never_settled_after_lift" : "foot_never_settled_after_stride_onset", path);
}
