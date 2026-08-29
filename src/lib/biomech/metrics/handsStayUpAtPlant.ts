/**
 * `hands_stay_up_at_plant_pass` (Hitting tile, pose-only).
 *
 * Philosophy-doc check: the hands should still be at (or essentially at) their
 * highest point when the front foot plants. Hands that have already dropped by
 * plant have started the swing with the lower body still arriving — the barrel
 * leaves the slot early.
 *
 * Pure body geometry, no ball tracking:
 *
 *   wrist_mid_y(frame)  = mean image-plane y of the two wrists
 *   highest_load_y      = min wrist_mid_y across the supplied load frames
 *                         (y grows downward, so min = highest)
 *   drop_px             = wrist_mid_y(plant) − highest_load_y
 *   drop_pct            = drop_px / torso_length_px(plant)
 *
 * Normalising by the athlete's own torso length (shoulder midpoint → hip
 * midpoint) keeps the check scale-free across camera distance and body size.
 * The tile passes when the drop stays at or below
 * `HANDS_STAY_UP_MAX_DROP_PCT`.
 *
 * Returned as 1 / 0 so the shared runner (`runGuardedMetric`) guards it
 * unchanged.
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
export const MEDIAPIPE_HANDS_STAY_UP_ENABLED = false as const;

export const LEFT_SHOULDER_INDEX = 11 as const;
export const RIGHT_SHOULDER_INDEX = 12 as const;
export const LEFT_WRIST_INDEX = 15 as const;
export const RIGHT_WRIST_INDEX = 16 as const;
export const LEFT_HIP_INDEX = 23 as const;
export const RIGHT_HIP_INDEX = 24 as const;

export const MIN_HANDS_STAY_UP_VISIBILITY = 0.5;

/**
 * Allowed hand drop between the highest load frame and plant, as a fraction of
 * torso length. UNVALIDATED starting estimate — tune against real graded clips
 * before any flip; this is not a settled constant.
 */
export const HANDS_STAY_UP_MAX_DROP_PCT = 0.15;

export interface HandsLandmark {
  readonly x: number;
  readonly y: number;
  readonly visibility: number;
}

export interface LoadFrame {
  readonly frame_index: number;
  readonly landmarks: readonly HandsLandmark[];
}

export interface HandsStayUpInputs {
  /** Frames from the load, strictly before plant. Frames at/after plant ignored. */
  readonly load_frames: readonly LoadFrame[];
  /** Landmarks at the front-foot full-plant frame, normalized [0,1]. */
  readonly plant_landmarks: readonly HandsLandmark[];
  readonly full_plant_frame_index: number | null;
  readonly frame_height: number;
}

export interface HandsStayUpResult {
  /** 1 = hands held up through plant, 0 = hands dropped early. */
  readonly value: number | null;
  readonly pass: boolean | null;
  readonly unit: "pass";
  readonly missingness: MissingnessRecord | null;
  readonly confidence: ConfidenceRecord;
  readonly lineage: {
    readonly full_plant_frame_index: number | null;
    readonly highest_load_frame_index: number | null;
    readonly load_frames_used: number;
    readonly highest_load_wrist_y_px: number | null;
    readonly plant_wrist_y_px: number | null;
    readonly torso_length_px: number | null;
    readonly drop_px: number | null;
    readonly drop_pct: number | null;
    readonly threshold_pct: number;
    readonly min_visibility: number | null;
  };
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

export function computeHandsStayUpAtPlant(
  inputs: HandsStayUpInputs,
): HandsStayUpResult {
  const { load_frames, plant_landmarks, full_plant_frame_index, frame_height } =
    inputs;

  const emptyLineage: HandsStayUpResult["lineage"] = {
    full_plant_frame_index,
    highest_load_frame_index: null,
    load_frames_used: 0,
    highest_load_wrist_y_px: null,
    plant_wrist_y_px: null,
    torso_length_px: null,
    drop_px: null,
    drop_pct: null,
    threshold_pct: HANDS_STAY_UP_MAX_DROP_PCT,
    min_visibility: null,
  };

  const miss = (
    reason: (typeof MISSINGNESS_REASONS)[keyof typeof MISSINGNESS_REASONS],
    emitted_by: MissingnessRecord["emitted_by"],
    lineage: HandsStayUpResult["lineage"] = emptyLineage,
  ): HandsStayUpResult => ({
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
  if (!Number.isFinite(frame_height) || frame_height <= 0) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE");
  }

  const pl = plant_landmarks?.[LEFT_WRIST_INDEX];
  const pr = plant_landmarks?.[RIGHT_WRIST_INDEX];
  const ls = plant_landmarks?.[LEFT_SHOULDER_INDEX];
  const rs = plant_landmarks?.[RIGHT_SHOULDER_INDEX];
  const lh = plant_landmarks?.[LEFT_HIP_INDEX];
  const rh = plant_landmarks?.[RIGHT_HIP_INDEX];
  if (!pl || !pr || !ls || !rs || !lh || !rh) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE");
  }

  const plantVis = Math.min(
    pl.visibility,
    pr.visibility,
    ls.visibility,
    rs.visibility,
    lh.visibility,
    rh.visibility,
  );
  if (plantVis < MIN_HANDS_STAY_UP_VISIBILITY) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE", {
      ...emptyLineage,
      min_visibility: round6(plantVis),
    });
  }

  // Only frames strictly before plant describe the load.
  const usable = load_frames.filter((f) => {
    if (f.frame_index >= full_plant_frame_index) return false;
    const w1 = f.landmarks?.[LEFT_WRIST_INDEX];
    const w2 = f.landmarks?.[RIGHT_WRIST_INDEX];
    return (
      !!w1 &&
      !!w2 &&
      w1.visibility >= MIN_HANDS_STAY_UP_VISIBILITY &&
      w2.visibility >= MIN_HANDS_STAY_UP_VISIBILITY
    );
  });

  if (usable.length === 0) {
    // No load frames to compare against — the check has no reference, so no
    // verdict is fabricated.
    return miss(MISSINGNESS_REASONS.INSUFFICIENT_TEMPORAL_RESOLUTION, "D-METRIC", {
      ...emptyLineage,
      min_visibility: round6(plantVis),
    });
  }

  let bestFrame = usable[0];
  let bestY = Infinity;
  let loadVis = 1;
  for (const f of usable) {
    const w1 = f.landmarks[LEFT_WRIST_INDEX];
    const w2 = f.landmarks[RIGHT_WRIST_INDEX];
    const y = ((w1.y + w2.y) / 2) * frame_height;
    loadVis = Math.min(loadVis, w1.visibility, w2.visibility);
    if (y < bestY || (y === bestY && f.frame_index < bestFrame.frame_index)) {
      bestY = y;
      bestFrame = f;
    }
  }

  const plantY = ((pl.y + pr.y) / 2) * frame_height;
  const shoulderMidY = ((ls.y + rs.y) / 2) * frame_height;
  const hipMidY = ((lh.y + rh.y) / 2) * frame_height;
  const torso = Math.abs(hipMidY - shoulderMidY);

  const minVis = Math.min(plantVis, loadVis);

  const partial: HandsStayUpResult["lineage"] = {
    ...emptyLineage,
    highest_load_frame_index: bestFrame.frame_index,
    load_frames_used: usable.length,
    highest_load_wrist_y_px: round6(bestY),
    plant_wrist_y_px: round6(plantY),
    torso_length_px: round6(torso),
    min_visibility: round6(minVis),
  };

  // A collapsed torso length means the athlete is edge-on / mis-tracked; the
  // normaliser is meaningless there, so no verdict is issued.
  if (torso < 1) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE", partial);
  }

  // Hands higher at plant than anywhere in the load = zero drop, not negative.
  const dropPx = Math.max(0, plantY - bestY);
  const dropPct = dropPx / torso;
  const pass = dropPct <= HANDS_STAY_UP_MAX_DROP_PCT;

  return {
    value: pass ? 1 : 0,
    pass,
    unit: "pass",
    missingness: null,
    confidence: uncalibrated(),
    lineage: {
      ...partial,
      drop_px: round6(dropPx),
      drop_pct: round6(dropPct),
    },
  };
}
