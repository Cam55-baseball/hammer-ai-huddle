/**
 * `pelvis_rotation_efficiency_deg` (Hitting tile, pose-only).
 *
 * How far the pelvis actually turns between front-foot plant and contact,
 * measured as a real angle rather than a judgement score. The philosophy doc
 * treats the plant→contact window as the rotation the swing is paid for; this
 * tile reports its magnitude in degrees.
 *
 * Pure body geometry across two frames already on the pose path:
 *
 *   pelvis_angle(frame) = atan2(hip_right_y − hip_left_y,
 *                               hip_right_x − hip_left_x)
 *   rotation_deg        = |wrapped(angle(contact) − angle(plant))|
 *
 * The difference is wrapped to (−180°, 180°] so a pelvis crossing the image
 * horizontal does not read as a ~360° turn. This is an image-plane projection,
 * not a true 3-D pelvis angle: a camera that is not roughly perpendicular to
 * the turn will under-report. That is a known limitation of the single-camera
 * path and is why the number is unvalidated.
 *
 * NOT LIVE. Hitting output is suppressed by `RELEASE1_HITTING_SUPPRESSED` and
 * this metric stays in `RELEASE1_HIDDEN_METRICS`.
 */

import {
  MISSINGNESS_REASONS,
  missingness,
  type MissingnessRecord,
} from "./missingness";
import { uncalibrated, type ConfidenceRecord } from "./confidence";

/** Kill switch — MUST stay false until the tile is approved. */
export const MEDIAPIPE_PELVIS_ROTATION_ENABLED = false as const;

export const LEFT_HIP_INDEX = 23 as const;
export const RIGHT_HIP_INDEX = 24 as const;

export const MIN_PELVIS_ROTATION_VISIBILITY = 0.5;

/**
 * Minimum pelvis width in pixels for the hip line's direction to be
 * trustworthy. Below this the hips are edge-on and the angle is noise.
 * UNVALIDATED starting estimate.
 */
export const MIN_PELVIS_WIDTH_PX = 8;

/**
 * Rotation at or above this is treated as an efficient turn. UNVALIDATED
 * starting estimate — tune against real graded clips before any flip; this is
 * not a settled constant.
 */
export const PELVIS_ROTATION_MIN_DEG = 30;

export interface PelvisLandmark {
  readonly x: number;
  readonly y: number;
  readonly visibility: number;
}

export interface PelvisRotationInputs {
  readonly full_plant_landmarks: readonly PelvisLandmark[];
  readonly contact_landmarks: readonly PelvisLandmark[];
  readonly full_plant_frame_index: number | null;
  readonly contact_frame_index: number | null;
  readonly frame_width: number;
  readonly frame_height: number;
}

export interface PelvisRotationResult {
  /** Degrees of pelvis rotation from plant to contact. */
  readonly value: number | null;
  readonly pass: boolean | null;
  readonly unit: "deg";
  readonly missingness: MissingnessRecord | null;
  readonly confidence: ConfidenceRecord;
  readonly lineage: {
    readonly full_plant_frame_index: number | null;
    readonly contact_frame_index: number | null;
    readonly pelvis_angle_plant_deg: number | null;
    readonly pelvis_angle_contact_deg: number | null;
    readonly pelvis_width_plant_px: number | null;
    readonly pelvis_width_contact_px: number | null;
    readonly threshold_deg: number;
    readonly min_visibility: number | null;
  };
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

function wrapDeg(d: number): number {
  let v = d;
  while (v <= -180) v += 360;
  while (v > 180) v -= 360;
  return v;
}

export function computePelvisRotationEfficiency(
  inputs: PelvisRotationInputs,
): PelvisRotationResult {
  const {
    full_plant_landmarks,
    contact_landmarks,
    full_plant_frame_index,
    contact_frame_index,
    frame_width,
    frame_height,
  } = inputs;

  const emptyLineage: PelvisRotationResult["lineage"] = {
    full_plant_frame_index,
    contact_frame_index,
    pelvis_angle_plant_deg: null,
    pelvis_angle_contact_deg: null,
    pelvis_width_plant_px: null,
    pelvis_width_contact_px: null,
    threshold_deg: PELVIS_ROTATION_MIN_DEG,
    min_visibility: null,
  };

  const miss = (
    reason: (typeof MISSINGNESS_REASONS)[keyof typeof MISSINGNESS_REASONS],
    emitted_by: MissingnessRecord["emitted_by"],
    lineage: PelvisRotationResult["lineage"] = emptyLineage,
  ): PelvisRotationResult => ({
    value: null,
    pass: null,
    unit: "deg",
    missingness: missingness(reason, emitted_by),
    confidence: { status: "missing", value: null, certificate_hash: null },
    lineage,
  });

  if (full_plant_frame_index == null) {
    return miss(MISSINGNESS_REASONS.FRONT_FOOT_FULL_PLANT_MISSING, "D-ANCHOR");
  }
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

  const pL = full_plant_landmarks?.[LEFT_HIP_INDEX];
  const pR = full_plant_landmarks?.[RIGHT_HIP_INDEX];
  const cL = contact_landmarks?.[LEFT_HIP_INDEX];
  const cR = contact_landmarks?.[RIGHT_HIP_INDEX];
  if (!pL || !pR || !cL || !cR) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE");
  }

  const minVis = Math.min(
    pL.visibility,
    pR.visibility,
    cL.visibility,
    cR.visibility,
  );
  if (minVis < MIN_PELVIS_ROTATION_VISIBILITY) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE", {
      ...emptyLineage,
      min_visibility: round6(minVis),
    });
  }

  const plantDx = (pR.x - pL.x) * frame_width;
  const plantDy = (pR.y - pL.y) * frame_height;
  const contactDx = (cR.x - cL.x) * frame_width;
  const contactDy = (cR.y - cL.y) * frame_height;

  const plantWidth = Math.hypot(plantDx, plantDy);
  const contactWidth = Math.hypot(contactDx, contactDy);

  const partial: PelvisRotationResult["lineage"] = {
    ...emptyLineage,
    pelvis_width_plant_px: round6(plantWidth),
    pelvis_width_contact_px: round6(contactWidth),
    min_visibility: round6(minVis),
  };

  if (plantWidth < MIN_PELVIS_WIDTH_PX || contactWidth < MIN_PELVIS_WIDTH_PX) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE", partial);
  }

  const plantAngle = (Math.atan2(plantDy, plantDx) * 180) / Math.PI;
  const contactAngle = (Math.atan2(contactDy, contactDx) * 180) / Math.PI;
  const rotation = Math.abs(wrapDeg(contactAngle - plantAngle));
  const pass = rotation >= PELVIS_ROTATION_MIN_DEG;

  return {
    value: round6(rotation),
    pass,
    unit: "deg",
    missingness: null,
    confidence: uncalibrated(),
    lineage: {
      ...partial,
      pelvis_angle_plant_deg: round6(plantAngle),
      pelvis_angle_contact_deg: round6(contactAngle),
    },
  };
}
