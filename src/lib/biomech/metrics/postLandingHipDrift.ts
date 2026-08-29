/**
 * `post_landing_hip_drift_pass` (Hitting tile, pose-only).
 *
 * Philosophy-doc check: once the front foot has landed, the hips should rotate
 * in place rather than keep travelling toward the pitcher. Continued linear
 * drift after landing is energy leaking forward instead of turning.
 *
 * Pure body geometry across two frames already available on the pose path —
 * full plant and contact:
 *
 *   drift_px  = |hip_mid_x(contact) − hip_mid_x(full_plant)|
 *   drift_pct = drift_px / pelvis_width_px(full_plant)
 *
 * Normalising by the athlete's own pelvis width keeps the check scale-free, so
 * camera distance and athlete size do not change the verdict. The tile passes
 * when drift stays at or below `POST_LANDING_HIP_DRIFT_MAX_PCT`.
 *
 * Returned as 1 / 0 so the shared stability guard (`runGuardedMetric`) applies
 * unchanged.
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
export const MEDIAPIPE_HIP_DRIFT_ENABLED = false as const;

export const LEFT_HIP_INDEX = 23 as const;
export const RIGHT_HIP_INDEX = 24 as const;

export const MIN_HIP_DRIFT_VISIBILITY = 0.5;

/**
 * Allowed post-landing hip travel, as a fraction of pelvis width. Starting
 * estimate — tune against real graded clips before any flip; not a settled
 * constant.
 */
export const POST_LANDING_HIP_DRIFT_MAX_PCT = 0.25;

export interface HipDriftLandmark {
  readonly x: number;
  readonly y: number;
  readonly visibility: number;
}

export interface PostLandingHipDriftInputs {
  /** Landmarks at the front-foot full-plant frame, normalized [0,1]. */
  readonly full_plant_landmarks: readonly HipDriftLandmark[];
  /** Landmarks at the contact frame, normalized [0,1]. */
  readonly contact_landmarks: readonly HipDriftLandmark[];
  readonly full_plant_frame_index: number | null;
  readonly contact_frame_index: number | null;
  readonly frame_width: number;
}

export interface PostLandingHipDriftResult {
  /** 1 = hips held, 0 = hips drifted. */
  readonly value: number | null;
  readonly pass: boolean | null;
  readonly unit: "pass";
  readonly missingness: MissingnessRecord | null;
  readonly confidence: ConfidenceRecord;
  readonly lineage: {
    readonly full_plant_frame_index: number | null;
    readonly contact_frame_index: number | null;
    readonly hip_mid_x_plant_px: number | null;
    readonly hip_mid_x_contact_px: number | null;
    readonly pelvis_width_px: number | null;
    readonly drift_px: number | null;
    readonly drift_pct: number | null;
    readonly threshold_pct: number;
    readonly min_visibility: number | null;
  };
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

export function computePostLandingHipDrift(
  inputs: PostLandingHipDriftInputs,
): PostLandingHipDriftResult {
  const {
    full_plant_landmarks,
    contact_landmarks,
    full_plant_frame_index,
    contact_frame_index,
    frame_width,
  } = inputs;

  const emptyLineage: PostLandingHipDriftResult["lineage"] = {
    full_plant_frame_index,
    contact_frame_index,
    hip_mid_x_plant_px: null,
    hip_mid_x_contact_px: null,
    pelvis_width_px: null,
    drift_px: null,
    drift_pct: null,
    threshold_pct: POST_LANDING_HIP_DRIFT_MAX_PCT,
    min_visibility: null,
  };

  const miss = (
    reason: (typeof MISSINGNESS_REASONS)[keyof typeof MISSINGNESS_REASONS],
    emitted_by: MissingnessRecord["emitted_by"],
    lineage: PostLandingHipDriftResult["lineage"] = emptyLineage,
  ): PostLandingHipDriftResult => ({
    value: null,
    pass: null,
    unit: "pass",
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
  if (!Number.isFinite(frame_width) || frame_width <= 0) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE");
  }

  const plantL = full_plant_landmarks?.[LEFT_HIP_INDEX];
  const plantR = full_plant_landmarks?.[RIGHT_HIP_INDEX];
  const contactL = contact_landmarks?.[LEFT_HIP_INDEX];
  const contactR = contact_landmarks?.[RIGHT_HIP_INDEX];
  if (!plantL || !plantR || !contactL || !contactR) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE");
  }

  const minVis = Math.min(
    plantL.visibility,
    plantR.visibility,
    contactL.visibility,
    contactR.visibility,
  );
  if (minVis < MIN_HIP_DRIFT_VISIBILITY) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE", {
      ...emptyLineage,
      min_visibility: round6(minVis),
    });
  }

  const plantMidX = ((plantL.x + plantR.x) / 2) * frame_width;
  const contactMidX = ((contactL.x + contactR.x) / 2) * frame_width;
  const pelvisWidth = Math.abs(plantL.x - plantR.x) * frame_width;

  // A collapsed pelvis width means the hips are edge-on to the camera; the
  // normaliser is meaningless there, so no verdict is issued.
  if (pelvisWidth < 1) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE", {
      ...emptyLineage,
      hip_mid_x_plant_px: round6(plantMidX),
      hip_mid_x_contact_px: round6(contactMidX),
      pelvis_width_px: round6(pelvisWidth),
      min_visibility: round6(minVis),
    });
  }

  const driftPx = Math.abs(contactMidX - plantMidX);
  const driftPct = driftPx / pelvisWidth;
  const pass = driftPct <= POST_LANDING_HIP_DRIFT_MAX_PCT;

  return {
    value: pass ? 1 : 0,
    pass,
    unit: "pass",
    missingness: null,
    confidence: uncalibrated(),
    lineage: {
      full_plant_frame_index,
      contact_frame_index,
      hip_mid_x_plant_px: round6(plantMidX),
      hip_mid_x_contact_px: round6(contactMidX),
      pelvis_width_px: round6(pelvisWidth),
      drift_px: round6(driftPx),
      drift_pct: round6(driftPct),
      threshold_pct: POST_LANDING_HIP_DRIFT_MAX_PCT,
      min_visibility: round6(minVis),
    },
  };
}
