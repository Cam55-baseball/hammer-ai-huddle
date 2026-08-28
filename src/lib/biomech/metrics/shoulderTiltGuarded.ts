/**
 * Guarded `shoulder_tilt_deg` — the two preconditions the MediaPipe
 * validation report said must exist before that tile is even a candidate to
 * flip over.
 *
 *   Guard 1 — stability under a 1-frame shift.
 *     The validation run showed the raw geometry is sound but sensitive to
 *     which frame is called "release". Re-measure on the neighbouring frame;
 *     if the two readings disagree by more than the tolerance, the release
 *     anchor is not resolving the motion and the reading is not reported.
 *     Missing with a reason, never a number.
 *
 *   Guard 2 — live pitch, not a dry drill.
 *     MediaPipe happily measures a towel drill. `evaluateLivePitchGate`
 *     requires ball-in-flight evidence from the existing detection pipeline
 *     before any value is released.
 *
 * Both guards can only remove a value, never create one. Canonical
 * missingness reasons are unchanged (no new reasons invented); the specific
 * guard that blocked is carried in `guard`/`lineage` for lineage visibility.
 *
 * NOT LIVE. `MEDIAPIPE_SHOULDER_TILT_ENABLED` still gates the swap, and this
 * module is read by nothing on the athlete path.
 */

import type { MissingnessRecord } from "./missingness";
import { missingConfidence, type ConfidenceRecord } from "./confidence";
import {
  computeShoulderTiltDeg,
  type ShoulderTiltLandmark,
  type ShoulderTiltResult,
} from "./shoulderTiltDeg";
import { evaluateMetricGuards, type MetricGuard } from "./metricGuards";
import type { LivePitchGateResult } from "../gates/livePitchGate";
import type { BallDetectionFrame } from "@/lib/cv/ball/types";

/**
 * Max allowed disagreement, in degrees, between the release frame and its
 * 1-frame neighbour. Starting estimate from the validation data — tune with
 * more sessions before any flip, it is not a settled constant.
 */
export const SHOULDER_TILT_STABILITY_TOLERANCE_DEG = 5;

/** Retained for callers that imported the metric-specific alias. */
export type ShoulderTiltGuard = MetricGuard;

export interface GuardedShoulderTiltInputs {
  /** Landmarks at the release frame. */
  readonly landmarks: readonly ShoulderTiltLandmark[];
  /**
   * Landmarks at release ± 1 frame, for the stability re-check. Null means the
   * neighbour frame has no pose — the guard cannot be satisfied, so no value.
   */
  readonly shifted_landmarks: readonly ShoulderTiltLandmark[] | null;
  /** Which neighbour was used (release_frame_index + shift). Lineage only. */
  readonly shift_frames: 1 | -1;
  readonly release_frame_index: number | null;
  readonly frame_width: number;
  readonly frame_height: number;
  /** Ball detection frames from the pitch-velocity pipeline. */
  readonly detectionFrames: readonly BallDetectionFrame[];
  readonly stability_tolerance_deg?: number;
}

export interface GuardedShoulderTiltResult {
  readonly value: number | null;
  readonly unit: "degrees";
  readonly missingness: MissingnessRecord | null;
  readonly confidence: ConfidenceRecord;
  /** Which guard blocked the value, when one did. */
  readonly guard: ShoulderTiltGuard | null;
  readonly guard_detail: string | null;
  readonly lineage: {
    readonly base: ShoulderTiltResult["lineage"];
    readonly primary_value: number | null;
    readonly shifted_value: number | null;
    readonly shift_frames: 1 | -1;
    readonly delta_deg: number | null;
    readonly stability_tolerance_deg: number;
    readonly live_pitch: LivePitchGateResult;
  };
}

export function computeGuardedShoulderTiltDeg(
  inputs: GuardedShoulderTiltInputs,
): GuardedShoulderTiltResult {
  const {
    landmarks,
    shifted_landmarks,
    shift_frames,
    release_frame_index,
    frame_width,
    frame_height,
    detectionFrames,
    stability_tolerance_deg = SHOULDER_TILT_STABILITY_TOLERANCE_DEG,
  } = inputs;

  const primary = computeShoulderTiltDeg({
    landmarks,
    release_frame_index,
    frame_width,
    frame_height,
  });

  const shifted = shifted_landmarks
    ? computeShoulderTiltDeg({
        landmarks: shifted_landmarks,
        release_frame_index:
          release_frame_index == null
            ? null
            : release_frame_index + shift_frames,
        frame_width,
        frame_height,
      })
    : null;

  const outcome = evaluateMetricGuards({
    primary,
    shifted,
    detectionFrames,
    release_frame_index,
    tolerance: stability_tolerance_deg,
    tolerance_unit: "°",
    metric_label: "tilt",
    anchor_label: "release anchor",
  });

  const build = (
    over: Partial<GuardedShoulderTiltResult>,
  ): GuardedShoulderTiltResult => ({
    value: over.value ?? null,
    unit: "degrees",
    missingness: over.missingness ?? null,
    confidence: over.confidence ?? missingConfidence(),
    guard: over.guard ?? null,
    guard_detail: over.guard_detail ?? null,
    lineage: {
      base: primary.lineage,
      primary_value: primary.value,
      shifted_value: outcome.shifted_value,
      shift_frames,
      delta_deg: outcome.delta,
      stability_tolerance_deg,
      live_pitch: outcome.live_pitch,
    },
  });

  // Base measurement already missing → pass its reason through untouched.
  if (primary.value == null) {
    return build({
      missingness: primary.missingness,
      confidence: primary.confidence,
    });
  }

  if (outcome.block) {
    return build({
      missingness: outcome.block.missingness,
      guard: outcome.block.guard,
      guard_detail: outcome.block.guard_detail,
    });
  }

  return build({
    value: primary.value,
    missingness: null,
    confidence: primary.confidence,
  });
}
