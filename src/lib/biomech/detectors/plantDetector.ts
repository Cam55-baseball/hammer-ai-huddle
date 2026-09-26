/**
 * Phase 26 — D-PLANT detector skeleton (front-foot first-contact frame).
 *
 * Per `canonical-build-plan.md §2 D-PLANT`: "Front-foot first-contact /
 * full-plant detector per `arch §Event anchors`; min confidence 0.7" with
 * canonical missingness `front_foot_first_contact_missing`.
 *
 * This module is the deterministic extractor SHAPE. Real implementation
 * requires D-POSE non-stub. Until then the detector emits canonical
 * missingness rather than fabricating a frame index.
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
  /** Vertical body height in normalised-y units. null/absent → refuse. */
  readonly body_height_y?: number | null;
}

/**
 * Noise gate. Before the landing frame the front ankle must have been raised
 * ≥ 0.10 body heights above where it lands (a stride). Still-clip ankle range
 * was ≤ 0.047 body heights (docs/landmark-noise-floors.md), so anything
 * smaller is noise, not a foot strike.
 */
export const MIN_STRIDE_RISE_BODY = 0.1;

export interface PlantDetectionResult {
  readonly frame_index: number | null;
  readonly missingness: MissingnessRecord | null;
  readonly source_detector: string;
  readonly source_model: string;
}

export function detectFrontFootStrike(
  poseFrames: readonly PlantPoseFrame[],
): PlantDetectionResult {
  if (LANDMARK_MODEL_VERSION.endsWith("@0.0.0-stub")) {
    return {
      frame_index: null,
      missingness: missingness(
        MISSINGNESS_REASONS.POSE_MODEL_IS_STUB,
        "D-PLANT",
      ),
      source_detector: DETECTOR_VERSION,
      source_model: LANDMARK_MODEL_VERSION,
    };
  }

  const visible = poseFrames.filter(
    (f): f is PlantPoseFrame & { front_ankle_y: number } =>
      f.front_ankle_y != null && Number.isFinite(f.front_ankle_y),
  );

  if (visible.length === 0) {
    return {
      frame_index: null,
      missingness: missingness(
        MISSINGNESS_REASONS.FRONT_FOOT_FIRST_CONTACT_MISSING,
        "D-PLANT",
      ),
      source_detector: DETECTOR_VERSION,
      source_model: LANDMARK_MODEL_VERSION,
    };
  }

  // First-contact = first frame at which the front ankle reaches its max
  // y-coordinate (lowest point in frame). Deterministic earliest-wins.
  let best = visible[0];
  for (let i = 1; i < visible.length; i++) {
    const f = visible[i];
    if (f.front_ankle_y > best.front_ankle_y) best = f;
  }

  const heights = poseFrames
    .map((f) => f.body_height_y)
    .filter((h): h is number => h != null && Number.isFinite(h) && h > 0)
    .sort((a, b) => a - b);
  const bodyH = heights.length ? heights[Math.floor((heights.length - 1) / 2)] : null;
  const before = visible.filter((f) => f.frame_index < best.frame_index);
  const preMin = before.length ? Math.min(...before.map((f) => f.front_ankle_y)) : null;
  if (bodyH == null || preMin == null || (best.front_ankle_y - preMin) / bodyH < MIN_STRIDE_RISE_BODY) {
    return {
      frame_index: null,
      missingness: missingness(MISSINGNESS_REASONS.ANCHOR_NOT_DETECTED, "D-PLANT"),
      source_detector: DETECTOR_VERSION,
      source_model: LANDMARK_MODEL_VERSION,
    };
  }

  return {
    frame_index: best.frame_index,
    missingness: null,
    source_detector: DETECTOR_VERSION,
    source_model: LANDMARK_MODEL_VERSION,
  };
}
