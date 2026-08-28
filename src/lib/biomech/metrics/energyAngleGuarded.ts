/**
 * Guarded `energy_angle_deg` — same two preconditions as the guarded
 * shoulder tilt, run through the shared core in `./metricGuards.ts`:
 *
 *   Guard 1 — stability under a 1-frame shift of the peak-leg-lift anchor.
 *   Guard 2 — live pitch, not a dry/towel drill (ball-in-flight evidence).
 *
 * Guards can only remove a value, never create one. No new missingness
 * reasons; the blocking guard is carried in `guard` / `guard_detail`.
 *
 * NOT LIVE. `MEDIAPIPE_ENERGY_ANGLE_ENABLED` is false and the metric is
 * hidden in Release-1.
 */

import type { MissingnessRecord } from "./missingness";
import { missingConfidence, type ConfidenceRecord } from "./confidence";
import {
  computeEnergyAngleDeg,
  type EnergyAngleLandmark,
  type EnergyAngleResult,
} from "./energyAngleDeg";
import { evaluateMetricGuards, type MetricGuard } from "./metricGuards";
import type { LivePitchGateResult } from "../gates/livePitchGate";
import type { BallDetectionFrame } from "@/lib/cv/ball/types";

/**
 * Max allowed disagreement, in degrees, between the peak-leg-lift frame and
 * its neighbour. Provisional — set from the validation distribution, tune with
 * more sessions before any flip.
 */
export const ENERGY_ANGLE_STABILITY_TOLERANCE_DEG = 5;

export interface GuardedEnergyAngleInputs {
  readonly landmarks: readonly EnergyAngleLandmark[];
  /** Landmarks at peak leg lift ± 1 frame. Null = neighbour has no pose. */
  readonly shifted_landmarks: readonly EnergyAngleLandmark[] | null;
  readonly shift_frames: 1 | -1;
  readonly peak_leg_lift_frame_index: number | null;
  /** Release anchor — used only by the live-pitch gate's window. */
  readonly release_frame_index: number | null;
  readonly frame_width: number;
  readonly frame_height: number;
  readonly detectionFrames: readonly BallDetectionFrame[];
  readonly stability_tolerance_deg?: number;
}

export interface GuardedEnergyAngleResult {
  readonly value: number | null;
  readonly unit: "degrees";
  readonly missingness: MissingnessRecord | null;
  readonly confidence: ConfidenceRecord;
  readonly guard: MetricGuard | null;
  readonly guard_detail: string | null;
  readonly lineage: {
    readonly base: EnergyAngleResult["lineage"];
    readonly primary_value: number | null;
    readonly shifted_value: number | null;
    readonly shift_frames: 1 | -1;
    readonly delta_deg: number | null;
    readonly stability_tolerance_deg: number;
    readonly live_pitch: LivePitchGateResult;
  };
}

export function computeGuardedEnergyAngleDeg(
  inputs: GuardedEnergyAngleInputs,
): GuardedEnergyAngleResult {
  const {
    landmarks,
    shifted_landmarks,
    shift_frames,
    peak_leg_lift_frame_index,
    release_frame_index,
    frame_width,
    frame_height,
    detectionFrames,
    stability_tolerance_deg = ENERGY_ANGLE_STABILITY_TOLERANCE_DEG,
  } = inputs;

  const primary = computeEnergyAngleDeg({
    landmarks,
    peak_leg_lift_frame_index,
    frame_width,
    frame_height,
  });

  const shifted = shifted_landmarks
    ? computeEnergyAngleDeg({
        landmarks: shifted_landmarks,
        peak_leg_lift_frame_index:
          peak_leg_lift_frame_index == null
            ? null
            : peak_leg_lift_frame_index + shift_frames,
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
    metric_label: "energy angle",
    anchor_label: "peak-leg-lift anchor",
  });

  const build = (
    over: Partial<GuardedEnergyAngleResult>,
  ): GuardedEnergyAngleResult => ({
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
