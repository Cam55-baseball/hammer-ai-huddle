/**
 * MediaPipe-backed `head_vertical_movement_pct` (Baseball Pitching tile).
 *
 * Replaces the AI-vision guess, which the variability audit found never
 * produced a value at all on real footage — the tile was non-functional.
 *
 * Definition (from `bp.contract.ts`): vertical bounce of the head from setup to
 * release, as a percentage of the athlete's height in frame. Computed by
 * actually tracking the head landmark across the frame sequence:
 *
 *   head_vertical_movement_pct
 *     = (max(head_y_px) − min(head_y_px)) / stature_px × 100
 *
 * head_y_px is the nose landmark's pixel y on every frame in the setup→release
 * window that carries a visible pose. `stature_px` is the median nose→lower-ankle
 * vertical span across those same frames — a same-clip, same-camera normalizer,
 * so the result is scale-free without needing calibration. It is a head-to-ankle
 * span, not true stature; the tile is a bounce ratio, and the normalizer is
 * stated in lineage rather than dressed up as a real height.
 *
 * Pure and deterministic. Never fabricates: too few usable frames, or no
 * measurable stature, emits canonical missingness.
 *
 * NOT LIVE. `MEDIAPIPE_HEAD_MOVEMENT_ENABLED` is false and
 * `head_vertical_movement_pct` remains in `RELEASE1_HIDDEN_METRICS`.
 */

import {
  MISSINGNESS_REASONS,
  missingness,
  type MissingnessRecord,
} from "./missingness";
import { uncalibrated, type ConfidenceRecord } from "./confidence";

/** Kill switch — MUST stay false until the swap is approved. */
export const MEDIAPIPE_HEAD_MOVEMENT_ENABLED = false as const;

export const NOSE_INDEX = 0 as const;
export const LEFT_ANKLE_INDEX = 27 as const;
export const RIGHT_ANKLE_INDEX = 28 as const;

export const MIN_HEAD_VISIBILITY = 0.5;
export const MIN_ANKLE_VISIBILITY = 0.5;
/** Fewer tracked frames than this cannot describe a bounce over a delivery. */
export const MIN_TRACKED_FRAMES = 5;

export interface HeadMovementLandmark {
  readonly x: number;
  readonly y: number;
  readonly visibility: number;
}

export interface HeadMovementFrame {
  readonly frame_index: number;
  readonly pose_detected: boolean;
  readonly landmarks: readonly HeadMovementLandmark[];
}

export interface HeadMovementInputs {
  /** Every pose frame available for the clip, any order. */
  readonly frames: readonly HeadMovementFrame[];
  /** Window start (setup). Null = from the first available frame. */
  readonly start_frame_index: number | null;
  /** Window end (release). Null = to the last available frame. */
  readonly release_frame_index: number | null;
  readonly frame_height: number;
}

export interface HeadMovementResult {
  readonly value: number | null;
  readonly unit: "percent";
  readonly missingness: MissingnessRecord | null;
  readonly confidence: ConfidenceRecord;
  readonly lineage: {
    readonly start_frame_index: number | null;
    readonly release_frame_index: number | null;
    readonly tracked_frames: number;
    readonly head_min_y_px: number | null;
    readonly head_max_y_px: number | null;
    readonly head_travel_px: number | null;
    readonly stature_px: number | null;
    readonly stature_samples: number;
  };
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function computeHeadVerticalMovementPct(
  inputs: HeadMovementInputs,
): HeadMovementResult {
  const { frames, start_frame_index, release_frame_index, frame_height } =
    inputs;

  const emptyLineage: HeadMovementResult["lineage"] = {
    start_frame_index,
    release_frame_index,
    tracked_frames: 0,
    head_min_y_px: null,
    head_max_y_px: null,
    head_travel_px: null,
    stature_px: null,
    stature_samples: 0,
  };

  const miss = (
    reason: (typeof MISSINGNESS_REASONS)[keyof typeof MISSINGNESS_REASONS],
    emitted_by: MissingnessRecord["emitted_by"],
    lineage: HeadMovementResult["lineage"] = emptyLineage,
  ): HeadMovementResult => ({
    value: null,
    unit: "percent",
    missingness: missingness(reason, emitted_by),
    confidence: { status: "missing", value: null, certificate_hash: null },
    lineage,
  });

  if (!Number.isFinite(frame_height) || frame_height <= 0) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE");
  }

  const inWindow = frames
    .filter(
      (f) =>
        (start_frame_index == null || f.frame_index >= start_frame_index) &&
        (release_frame_index == null || f.frame_index <= release_frame_index),
    )
    .sort((a, b) => a.frame_index - b.frame_index);

  const headYs: number[] = [];
  const statures: number[] = [];

  for (const f of inWindow) {
    if (!f.pose_detected || f.landmarks.length === 0) continue;
    const nose = f.landmarks[NOSE_INDEX];
    if (!nose || nose.visibility < MIN_HEAD_VISIBILITY) continue;
    headYs.push(nose.y * frame_height);

    const la = f.landmarks[LEFT_ANKLE_INDEX];
    const ra = f.landmarks[RIGHT_ANKLE_INDEX];
    const ankles = [la, ra].filter(
      (a): a is HeadMovementLandmark =>
        !!a && a.visibility >= MIN_ANKLE_VISIBILITY,
    );
    if (ankles.length === 0) continue;
    const lowestAnkleY = Math.max(...ankles.map((a) => a.y)) * frame_height;
    const span = lowestAnkleY - nose.y * frame_height;
    if (span > 0) statures.push(span);
  }

  if (headYs.length < MIN_TRACKED_FRAMES) {
    return miss(
      headYs.length === 0
        ? MISSINGNESS_REASONS.POSE_NOT_DETECTED
        : MISSINGNESS_REASONS.INSUFFICIENT_TEMPORAL_RESOLUTION,
      headYs.length === 0 ? "D-POSE" : "D-METRIC",
      { ...emptyLineage, tracked_frames: headYs.length },
    );
  }

  const minY = Math.min(...headYs);
  const maxY = Math.max(...headYs);
  const travel = maxY - minY;

  if (statures.length === 0) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE", {
      ...emptyLineage,
      tracked_frames: headYs.length,
      head_min_y_px: round6(minY),
      head_max_y_px: round6(maxY),
      head_travel_px: round6(travel),
    });
  }

  const stature = median(statures);

  const lineage: HeadMovementResult["lineage"] = {
    start_frame_index,
    release_frame_index,
    tracked_frames: headYs.length,
    head_min_y_px: round6(minY),
    head_max_y_px: round6(maxY),
    head_travel_px: round6(travel),
    stature_px: round6(stature),
    stature_samples: statures.length,
  };

  if (!(stature > 0)) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE", lineage);
  }

  return {
    value: round6((travel / stature) * 100),
    unit: "percent",
    missingness: null,
    confidence: uncalibrated(),
    lineage,
  };
}
