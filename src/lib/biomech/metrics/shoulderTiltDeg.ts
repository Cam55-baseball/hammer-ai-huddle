/**
 * MediaPipe-backed `shoulder_tilt_deg` (Baseball Pitching tile).
 *
 * Definition: absolute angle, in degrees, of the line joining the left and
 * right shoulder landmarks relative to image horizontal, evaluated at the
 * release frame.
 *
 *   shoulder_tilt_deg = |atan2(dy, dx)| in degrees, folded into [0, 90]
 *
 * Pure deterministic function over BlazePose landmarks produced by
 * `src/lib/biomech/pose/poseRunner.ts`. Same inputs → byte-identical output.
 * Never fabricates a value: absent or low-visibility shoulder landmarks emit
 * canonical missingness.
 *
 * NOT LIVE. The athlete-facing tile still reads the AI-vision value until
 * this path is explicitly approved. Flip `MEDIAPIPE_SHOULDER_TILT_ENABLED`
 * to switch it over — nothing else reads this module today.
 */

import {
  MISSINGNESS_REASONS,
  missingness,
  type MissingnessRecord,
} from "./missingness";
import { uncalibrated, type ConfidenceRecord } from "./confidence";

/** Kill switch — MUST stay false until the swap is approved. */
export const MEDIAPIPE_SHOULDER_TILT_ENABLED = false as const;

/** BlazePose landmark indices. */
export const LEFT_SHOULDER_INDEX = 11 as const;
export const RIGHT_SHOULDER_INDEX = 12 as const;

/** Minimum landmark visibility for both shoulders to be trusted. */
export const MIN_SHOULDER_VISIBILITY = 0.5;

export interface ShoulderTiltLandmark {
  readonly x: number;
  readonly y: number;
  readonly visibility: number;
}

export interface ShoulderTiltInputs {
  /** 33 BlazePose landmarks at the release frame, normalized [0,1]. */
  readonly landmarks: readonly ShoulderTiltLandmark[];
  /** Frame the landmarks came from — lineage only. */
  readonly release_frame_index: number | null;
  /** Pixel width/height, needed to undo normalization before the angle. */
  readonly frame_width: number;
  readonly frame_height: number;
}

export interface ShoulderTiltResult {
  readonly value: number | null;
  readonly unit: "degrees";
  readonly missingness: MissingnessRecord | null;
  readonly confidence: ConfidenceRecord;
  readonly lineage: {
    readonly release_frame_index: number | null;
    readonly left_shoulder_visibility: number | null;
    readonly right_shoulder_visibility: number | null;
    readonly dx_px: number | null;
    readonly dy_px: number | null;
  };
}

function roundToSixDecimals(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

export function computeShoulderTiltDeg(
  inputs: ShoulderTiltInputs,
): ShoulderTiltResult {
  const { landmarks, release_frame_index, frame_width, frame_height } = inputs;

  const left = landmarks?.[LEFT_SHOULDER_INDEX];
  const right = landmarks?.[RIGHT_SHOULDER_INDEX];

  const baseLineage = {
    release_frame_index,
    left_shoulder_visibility: left?.visibility ?? null,
    right_shoulder_visibility: right?.visibility ?? null,
    dx_px: null as number | null,
    dy_px: null as number | null,
  };

  const missingResult = (
    reason: (typeof MISSINGNESS_REASONS)[keyof typeof MISSINGNESS_REASONS],
    emittedBy: MissingnessRecord["emitted_by"],
  ): ShoulderTiltResult => ({
    value: null,
    unit: "degrees",
    missingness: missingness(reason, emittedBy),
    confidence: { status: "missing", value: null, certificate_hash: null },
    lineage: baseLineage,
  });

  if (release_frame_index == null) {
    return missingResult(
      MISSINGNESS_REASONS.PITCHER_RELEASE_FRAME_MISSING,
      "D-ANCHOR",
    );
  }
  if (!left || !right) {
    return missingResult(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE");
  }
  if (
    left.visibility < MIN_SHOULDER_VISIBILITY ||
    right.visibility < MIN_SHOULDER_VISIBILITY
  ) {
    return missingResult(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE");
  }
  if (
    !Number.isFinite(frame_width) ||
    !Number.isFinite(frame_height) ||
    frame_width <= 0 ||
    frame_height <= 0
  ) {
    return missingResult(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE");
  }

  const dx = (right.x - left.x) * frame_width;
  const dy = (right.y - left.y) * frame_height;

  // Degenerate shoulder line (both landmarks collapsed) is not a 0° tilt.
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) {
    return missingResult(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE");
  }

  let deg = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI);
  if (deg > 90) deg = 180 - deg; // fold: tilt is orientation-independent

  return {
    value: roundToSixDecimals(deg),
    unit: "degrees",
    missingness: null,
    confidence: uncalibrated(),
    lineage: {
      ...baseLineage,
      dx_px: roundToSixDecimals(dx),
      dy_px: roundToSixDecimals(dy),
    },
  };
}
