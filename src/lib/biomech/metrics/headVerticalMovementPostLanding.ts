/**
 * `head_vertical_movement_post_landing_pct` (Hitting tile, pose-only).
 *
 * Distinct from the pre-landing head-movement check in
 * `headVerticalMovementPct.ts`: this one measures ONLY the window that decides
 * the swing — front-foot landing through contact. A head that rises or dives
 * after the foot is down is moving the eyes during the decision, not during the
 * gather.
 *
 * Pure body geometry across two frames already on the pose path:
 *
 *   head_y(frame)  = nose image-plane y
 *   travel_px      = |head_y(contact) − head_y(landing)|
 *   travel_pct     = travel_px / athlete_height_px(landing)
 *
 * Athlete height in frame is nose → lower ankle at landing, which is the same
 * "height in frame" normaliser used by the pre-landing tile, so the two numbers
 * stay comparable.
 *
 * The value is a percentage (0–1 fraction × 100), not a pass/fail, so the tile
 * reports magnitude. `pass` is still exposed against an UNVALIDATED threshold
 * for downstream convenience.
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
export const MEDIAPIPE_HEAD_POST_LANDING_ENABLED = false as const;

export const NOSE_INDEX = 0 as const;
export const LEFT_ANKLE_INDEX = 27 as const;
export const RIGHT_ANKLE_INDEX = 28 as const;

export const MIN_HEAD_POST_LANDING_VISIBILITY = 0.5;

/**
 * Head travel from landing to contact, as a percent of athlete height in frame,
 * above which the tile fails. UNVALIDATED starting estimate — tune against real
 * graded clips before any flip; this is not a settled constant.
 */
export const HEAD_POST_LANDING_MAX_PCT = 4;

export interface HeadLandmark {
  readonly x: number;
  readonly y: number;
  readonly visibility: number;
}

export interface HeadPostLandingInputs {
  /** Landmarks at the front-foot full-plant (landing) frame, normalized [0,1]. */
  readonly landing_landmarks: readonly HeadLandmark[];
  readonly contact_landmarks: readonly HeadLandmark[];
  readonly full_plant_frame_index: number | null;
  readonly contact_frame_index: number | null;
  readonly frame_height: number;
}

export interface HeadPostLandingResult {
  /** Percent of athlete height in frame. Null when missing. */
  readonly value: number | null;
  readonly pass: boolean | null;
  readonly unit: "pct";
  readonly missingness: MissingnessRecord | null;
  readonly confidence: ConfidenceRecord;
  readonly lineage: {
    readonly full_plant_frame_index: number | null;
    readonly contact_frame_index: number | null;
    readonly head_y_landing_px: number | null;
    readonly head_y_contact_px: number | null;
    readonly athlete_height_px: number | null;
    readonly travel_px: number | null;
    readonly threshold_pct: number;
    readonly min_visibility: number | null;
  };
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

export function computeHeadVerticalMovementPostLanding(
  inputs: HeadPostLandingInputs,
): HeadPostLandingResult {
  const {
    landing_landmarks,
    contact_landmarks,
    full_plant_frame_index,
    contact_frame_index,
    frame_height,
  } = inputs;

  const emptyLineage: HeadPostLandingResult["lineage"] = {
    full_plant_frame_index,
    contact_frame_index,
    head_y_landing_px: null,
    head_y_contact_px: null,
    athlete_height_px: null,
    travel_px: null,
    threshold_pct: HEAD_POST_LANDING_MAX_PCT,
    min_visibility: null,
  };

  const miss = (
    reason: (typeof MISSINGNESS_REASONS)[keyof typeof MISSINGNESS_REASONS],
    emitted_by: MissingnessRecord["emitted_by"],
    lineage: HeadPostLandingResult["lineage"] = emptyLineage,
  ): HeadPostLandingResult => ({
    value: null,
    pass: null,
    unit: "pct",
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
  if (!Number.isFinite(frame_height) || frame_height <= 0) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE");
  }

  const noseL = landing_landmarks?.[NOSE_INDEX];
  const noseC = contact_landmarks?.[NOSE_INDEX];
  const ankleLeft = landing_landmarks?.[LEFT_ANKLE_INDEX];
  const ankleRight = landing_landmarks?.[RIGHT_ANKLE_INDEX];
  if (!noseL || !noseC || !ankleLeft || !ankleRight) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE");
  }

  const minVis = Math.min(
    noseL.visibility,
    noseC.visibility,
    ankleLeft.visibility,
    ankleRight.visibility,
  );
  if (minVis < MIN_HEAD_POST_LANDING_VISIBILITY) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE", {
      ...emptyLineage,
      min_visibility: round6(minVis),
    });
  }

  const headLanding = noseL.y * frame_height;
  const headContact = noseC.y * frame_height;
  // Lower ankle (larger y) is the one on the ground.
  const groundY = Math.max(ankleLeft.y, ankleRight.y) * frame_height;
  const heightPx = groundY - headLanding;

  const partial: HeadPostLandingResult["lineage"] = {
    ...emptyLineage,
    head_y_landing_px: round6(headLanding),
    head_y_contact_px: round6(headContact),
    athlete_height_px: round6(heightPx),
    min_visibility: round6(minVis),
  };

  // A collapsed or inverted height means the athlete is not resolved head-to-
  // foot in frame; the normaliser is meaningless, so no verdict is issued.
  if (!(heightPx > 1)) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE", partial);
  }

  const travelPx = Math.abs(headContact - headLanding);
  const pct = (travelPx / heightPx) * 100;
  const pass = pct <= HEAD_POST_LANDING_MAX_PCT;

  return {
    value: round6(pct),
    pass,
    unit: "pct",
    missingness: null,
    confidence: uncalibrated(),
    lineage: { ...partial, travel_px: round6(travelPx) },
  };
}
