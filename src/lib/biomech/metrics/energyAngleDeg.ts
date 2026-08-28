/**
 * MediaPipe-backed `energy_angle_deg` (Baseball Pitching tile).
 *
 * Replaces the AI-vision guess, which the variability audit found returned a
 * constant 20 on every clip it answered — a round-number prior, not a
 * measurement.
 *
 * Definition (from `bp.contract.ts`): the angle from the centre of the plant
 * foot to the front hip at PEAK LEG LIFT. Expressed in the image plane as the
 * deviation of the plant-foot → front-hip line away from vertical, i.e. how far
 * the hips have moved toward the target over the support foot:
 *
 *   energy_angle_deg = |atan2(dx_toward_target, dy_up)| in degrees
 *
 * where the plant foot is the support-side foot centre (heel + foot_index
 * midpoint) and the front hip is the lift-side hip. 0° means the hip sits
 * directly above the plant foot; larger means more forward hip displacement.
 * 18° passes, 25° is elite, per the contract.
 *
 * Support side is derived from the pose, never assumed: at peak leg lift the
 * plant ankle is the lower of the two in the image (larger y). The target
 * direction is likewise derived — it is the horizontal direction the hips have
 * already displaced toward — so no handedness input is required and no sign
 * convention is invented.
 *
 * Pure and deterministic over BlazePose landmarks. Never fabricates a value:
 * absent or low-visibility landmarks emit canonical missingness.
 *
 * NOT LIVE. `MEDIAPIPE_ENERGY_ANGLE_ENABLED` is false and
 * `energy_angle_deg` remains in `RELEASE1_HIDDEN_METRICS`; nothing on the
 * athlete path reads this module.
 */

import {
  MISSINGNESS_REASONS,
  missingness,
  type MissingnessRecord,
} from "./missingness";
import { uncalibrated, type ConfidenceRecord } from "./confidence";

/** Kill switch — MUST stay false until the swap is approved. */
export const MEDIAPIPE_ENERGY_ANGLE_ENABLED = false as const;

/** BlazePose landmark indices. */
export const LEFT_HIP_INDEX = 23 as const;
export const RIGHT_HIP_INDEX = 24 as const;
export const LEFT_ANKLE_INDEX = 27 as const;
export const RIGHT_ANKLE_INDEX = 28 as const;
export const LEFT_HEEL_INDEX = 29 as const;
export const RIGHT_HEEL_INDEX = 30 as const;
export const LEFT_FOOT_INDEX = 31 as const;
export const RIGHT_FOOT_INDEX = 32 as const;

/** Minimum landmark visibility for every landmark the angle depends on. */
export const MIN_ENERGY_ANGLE_VISIBILITY = 0.5;

export interface EnergyAngleLandmark {
  readonly x: number;
  readonly y: number;
  readonly visibility: number;
}

export interface EnergyAngleInputs {
  /** 33 BlazePose landmarks at the peak-leg-lift frame, normalized [0,1]. */
  readonly landmarks: readonly EnergyAngleLandmark[];
  /** Frame the landmarks came from. Lineage + missingness routing. */
  readonly peak_leg_lift_frame_index: number | null;
  readonly frame_width: number;
  readonly frame_height: number;
}

export interface EnergyAngleResult {
  readonly value: number | null;
  readonly unit: "degrees";
  readonly missingness: MissingnessRecord | null;
  readonly confidence: ConfidenceRecord;
  readonly lineage: {
    readonly peak_leg_lift_frame_index: number | null;
    readonly plant_side: "left" | "right" | null;
    readonly plant_foot_x_px: number | null;
    readonly plant_foot_y_px: number | null;
    readonly front_hip_x_px: number | null;
    readonly front_hip_y_px: number | null;
    readonly dx_px: number | null;
    readonly dy_px: number | null;
    readonly min_visibility: number | null;
  };
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

export function computeEnergyAngleDeg(
  inputs: EnergyAngleInputs,
): EnergyAngleResult {
  const { landmarks, peak_leg_lift_frame_index, frame_width, frame_height } =
    inputs;

  const emptyLineage: EnergyAngleResult["lineage"] = {
    peak_leg_lift_frame_index,
    plant_side: null,
    plant_foot_x_px: null,
    plant_foot_y_px: null,
    front_hip_x_px: null,
    front_hip_y_px: null,
    dx_px: null,
    dy_px: null,
    min_visibility: null,
  };

  const miss = (
    reason: (typeof MISSINGNESS_REASONS)[keyof typeof MISSINGNESS_REASONS],
    emitted_by: MissingnessRecord["emitted_by"],
    lineage: EnergyAngleResult["lineage"] = emptyLineage,
  ): EnergyAngleResult => ({
    value: null,
    unit: "degrees",
    missingness: missingness(reason, emitted_by),
    confidence: { status: "missing", value: null, certificate_hash: null },
    lineage,
  });

  if (peak_leg_lift_frame_index == null) {
    return miss(MISSINGNESS_REASONS.PEAK_LEG_LIFT_MISSING, "D-ANCHOR");
  }
  if (
    !Number.isFinite(frame_width) ||
    !Number.isFinite(frame_height) ||
    frame_width <= 0 ||
    frame_height <= 0
  ) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE");
  }

  const lAnkle = landmarks?.[LEFT_ANKLE_INDEX];
  const rAnkle = landmarks?.[RIGHT_ANKLE_INDEX];
  if (!lAnkle || !rAnkle) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE");
  }
  if (
    lAnkle.visibility < MIN_ENERGY_ANGLE_VISIBILITY ||
    rAnkle.visibility < MIN_ENERGY_ANGLE_VISIBILITY
  ) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE");
  }

  // Support side = the lower ankle in image coords at peak leg lift. Derived,
  // never assumed from handedness.
  const plantSide: "left" | "right" = lAnkle.y >= rAnkle.y ? "left" : "right";

  const heel =
    landmarks[plantSide === "left" ? LEFT_HEEL_INDEX : RIGHT_HEEL_INDEX];
  const toe =
    landmarks[plantSide === "left" ? LEFT_FOOT_INDEX : RIGHT_FOOT_INDEX];
  // The "front hip" is the lift-side hip — the hip travelling toward the target.
  const frontHip =
    landmarks[plantSide === "left" ? RIGHT_HIP_INDEX : LEFT_HIP_INDEX];

  if (!heel || !toe || !frontHip) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE");
  }

  const minVis = Math.min(heel.visibility, toe.visibility, frontHip.visibility);
  if (minVis < MIN_ENERGY_ANGLE_VISIBILITY) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE", {
      ...emptyLineage,
      plant_side: plantSide,
      min_visibility: round6(minVis),
    });
  }

  const footX = ((heel.x + toe.x) / 2) * frame_width;
  const footY = ((heel.y + toe.y) / 2) * frame_height;
  const hipX = frontHip.x * frame_width;
  const hipY = frontHip.y * frame_height;

  const dx = hipX - footX; // horizontal hip displacement off the plant foot
  const dy = footY - hipY; // upward distance foot → hip (positive when upright)

  const lineage: EnergyAngleResult["lineage"] = {
    peak_leg_lift_frame_index,
    plant_side: plantSide,
    plant_foot_x_px: round6(footX),
    plant_foot_y_px: round6(footY),
    front_hip_x_px: round6(hipX),
    front_hip_y_px: round6(hipY),
    dx_px: round6(dx),
    dy_px: round6(dy),
    min_visibility: round6(minVis),
  };

  // Hip must actually sit above the plant foot for the angle to mean anything.
  // A collapsed or inverted foot→hip line is a pose failure, not a 90° angle.
  if (dy <= 0 || (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6)) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE", lineage);
  }

  const deg = Math.abs((Math.atan2(dx, dy) * 180) / Math.PI);

  return {
    value: round6(deg),
    unit: "degrees",
    missingness: null,
    confidence: uncalibrated(),
    lineage,
  };
}
