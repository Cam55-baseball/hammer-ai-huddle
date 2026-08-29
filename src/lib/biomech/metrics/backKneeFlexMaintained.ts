/**
 * `back_knee_flex_maintained_pass` (Hitting tile, pose-only).
 *
 * Philosophy-doc check: the back knee must still carry meaningful flexion at
 * contact. A back leg that has straightened by contact has pushed the athlete
 * off the rear side rather than turning against it.
 *
 * Pure body geometry — hip, knee and ankle on the back side, measured in the
 * image plane at the contact frame:
 *
 *   knee_angle_deg = angle(hip → knee → ankle)
 *
 * 180° is a locked-out leg. The tile passes when the angle stays at or below
 * `BACK_KNEE_FLEX_MAX_ANGLE_DEG` (i.e. flexion is maintained).
 *
 * The back side is derived from the pose, not from a handedness input: the back
 * leg is the one further from the direction the hitter's hips face at contact,
 * which in the image plane is the rear ankle — the one on the opposite side of
 * the hips from the front foot. Front foot is the more-forward ankle (larger
 * horizontal distance from the hip midpoint in the stride direction), and the
 * stride direction is itself read from the ankle spread, so no convention is
 * invented.
 *
 * Returned as 1 / 0 rather than a boolean so the shared stability guard
 * (`runGuardedMetric`) applies unchanged.
 *
 * NOT LIVE. Hitting output is suppressed by `RELEASE1_HITTING_SUPPRESSED` and
 * this metric stays in `RELEASE1_HIDDEN_METRICS`; nothing on the athlete path
 * reads this module.
 */

import {
  MISSINGNESS_REASONS,
  missingness,
  type MissingnessRecord,
} from "./missingness";
import { uncalibrated, type ConfidenceRecord } from "./confidence";

/** Kill switch — MUST stay false until the tile is approved. */
export const MEDIAPIPE_BACK_KNEE_FLEX_ENABLED = false as const;

export const LEFT_HIP_INDEX = 23 as const;
export const RIGHT_HIP_INDEX = 24 as const;
export const LEFT_KNEE_INDEX = 25 as const;
export const RIGHT_KNEE_INDEX = 26 as const;
export const LEFT_ANKLE_INDEX = 27 as const;
export const RIGHT_ANKLE_INDEX = 28 as const;

export const MIN_BACK_KNEE_VISIBILITY = 0.5;

/**
 * Above this knee angle the back leg is treated as straightened. Starting
 * estimate from the philosophy doc's "keep flexion through contact" language —
 * tune against real graded clips before any flip; it is not a settled constant.
 */
export const BACK_KNEE_FLEX_MAX_ANGLE_DEG = 155;

export interface BackKneeLandmark {
  readonly x: number;
  readonly y: number;
  readonly visibility: number;
}

export interface BackKneeFlexInputs {
  /** 33 BlazePose landmarks at the contact frame, normalized [0,1]. */
  readonly landmarks: readonly BackKneeLandmark[];
  readonly contact_frame_index: number | null;
  readonly frame_width: number;
  readonly frame_height: number;
}

export interface BackKneeFlexResult {
  /** 1 = flexion maintained, 0 = back leg straightened. */
  readonly value: number | null;
  readonly pass: boolean | null;
  readonly unit: "pass";
  readonly missingness: MissingnessRecord | null;
  readonly confidence: ConfidenceRecord;
  readonly lineage: {
    readonly contact_frame_index: number | null;
    readonly back_side: "left" | "right" | null;
    readonly knee_angle_deg: number | null;
    readonly threshold_deg: number;
    readonly min_visibility: number | null;
  };
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

function angleDeg(
  ax: number, ay: number,
  bx: number, by: number,
  cx: number, cy: number,
): number | null {
  const v1x = ax - bx;
  const v1y = ay - by;
  const v2x = cx - bx;
  const v2y = cy - by;
  const m1 = Math.hypot(v1x, v1y);
  const m2 = Math.hypot(v2x, v2y);
  if (m1 < 1e-6 || m2 < 1e-6) return null;
  const cos = Math.min(1, Math.max(-1, (v1x * v2x + v1y * v2y) / (m1 * m2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function computeBackKneeFlexMaintained(
  inputs: BackKneeFlexInputs,
): BackKneeFlexResult {
  const { landmarks, contact_frame_index, frame_width, frame_height } = inputs;

  const emptyLineage: BackKneeFlexResult["lineage"] = {
    contact_frame_index,
    back_side: null,
    knee_angle_deg: null,
    threshold_deg: BACK_KNEE_FLEX_MAX_ANGLE_DEG,
    min_visibility: null,
  };

  const miss = (
    reason: (typeof MISSINGNESS_REASONS)[keyof typeof MISSINGNESS_REASONS],
    emitted_by: MissingnessRecord["emitted_by"],
    lineage: BackKneeFlexResult["lineage"] = emptyLineage,
  ): BackKneeFlexResult => ({
    value: null,
    pass: null,
    unit: "pass",
    missingness: missingness(reason, emitted_by),
    confidence: { status: "missing", value: null, certificate_hash: null },
    lineage,
  });

  if (contact_frame_index == null) {
    return miss(MISSINGNESS_REASONS.CONTACT_FRAME_MISSING, "D-ANCHOR");
  }
  if (
    !Number.isFinite(frame_width) ||
    !Number.isFinite(frame_height) ||
    frame_width <= 0 ||
    frame_height <= 0
  ) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE");
  }

  const lHip = landmarks?.[LEFT_HIP_INDEX];
  const rHip = landmarks?.[RIGHT_HIP_INDEX];
  const lAnkle = landmarks?.[LEFT_ANKLE_INDEX];
  const rAnkle = landmarks?.[RIGHT_ANKLE_INDEX];
  if (!lHip || !rHip || !lAnkle || !rAnkle) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE");
  }

  const hipMidX = (lHip.x + rHip.x) / 2;

  // Stride direction = whichever ankle sits further from the hip midline.
  // The front foot is that ankle; the back leg is the other one. Derived from
  // the pose, never from a handedness input.
  const lSpread = Math.abs(lAnkle.x - hipMidX);
  const rSpread = Math.abs(rAnkle.x - hipMidX);
  if (Math.abs(lSpread - rSpread) < 1e-6) {
    // Feet symmetric about the hips — no stride resolved, so "back leg" is
    // undefined. That is a pose failure, not a coin flip.
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE");
  }
  const backSide: "left" | "right" = lSpread > rSpread ? "right" : "left";

  const hip = backSide === "left" ? lHip : rHip;
  const knee = landmarks[backSide === "left" ? LEFT_KNEE_INDEX : RIGHT_KNEE_INDEX];
  const ankle = backSide === "left" ? lAnkle : rAnkle;

  if (!knee) return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE");

  const minVis = Math.min(hip.visibility, knee.visibility, ankle.visibility);
  if (minVis < MIN_BACK_KNEE_VISIBILITY) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE", {
      ...emptyLineage,
      back_side: backSide,
      min_visibility: round6(minVis),
    });
  }

  const deg = angleDeg(
    hip.x * frame_width, hip.y * frame_height,
    knee.x * frame_width, knee.y * frame_height,
    ankle.x * frame_width, ankle.y * frame_height,
  );

  if (deg == null) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE", {
      ...emptyLineage,
      back_side: backSide,
      min_visibility: round6(minVis),
    });
  }

  const pass = deg <= BACK_KNEE_FLEX_MAX_ANGLE_DEG;

  return {
    value: pass ? 1 : 0,
    pass,
    unit: "pass",
    missingness: null,
    confidence: uncalibrated(),
    lineage: {
      contact_frame_index,
      back_side: backSide,
      knee_angle_deg: round6(deg),
      threshold_deg: BACK_KNEE_FLEX_MAX_ANGLE_DEG,
      min_visibility: round6(minVis),
    },
  };
}
