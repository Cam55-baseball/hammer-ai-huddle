/**
 * Phase 26 — D-3 anchor: peak leg lift frame.
 *
 * Canonical anchor definition (from `bp.contract.ts` `energy_angle_deg`
 * prompt + `bp.ts` tempo tile description): the frame at which the lift-leg
 * ankle reaches its vertical-coordinate extremum during the wind-up.
 *
 * This module is the deterministic extractor SHAPE. Real pose input requires
 * D-POSE non-stub, which is not yet shipped (`src/lib/biomech/versions.ts`
 * is pinned to `blazepose_full@0.0.0-stub`). When the supplied pose stream
 * carries the stub marker, the extractor emits canonical missingness rather
 * than fabricating a frame index.
 */

import { LANDMARK_MODEL_VERSION } from "../versions";
import {
  MISSINGNESS_REASONS,
  missingness,
  type MissingnessRecord,
} from "../metrics/missingness";

/** Minimal pose-frame shape the anchor needs. */
export interface PoseFrame {
  readonly frame_index: number;
  /** Normalised lift-side ankle y-coordinate (0 = top of frame). null = not visible. */
  readonly lift_ankle_y: number | null;
}

export interface PeakLegLiftResult {
  readonly frame_index: number | null;
  readonly missingness: MissingnessRecord | null;
  readonly source_model: string;
}

export function findPeakLegLiftFrame(
  poseFrames: readonly PoseFrame[],
): PeakLegLiftResult {
  // D-POSE is stubbed → cannot trust ankle y-coordinates → canonical missingness.
  if (LANDMARK_MODEL_VERSION.endsWith("@0.0.0-stub")) {
    return {
      frame_index: null,
      missingness: missingness(
        MISSINGNESS_REASONS.POSE_MODEL_IS_STUB,
        "D-POSE",
      ),
      source_model: LANDMARK_MODEL_VERSION,
    };
  }

  const visible = poseFrames.filter(
    (f): f is PoseFrame & { lift_ankle_y: number } =>
      f.lift_ankle_y != null && Number.isFinite(f.lift_ankle_y),
  );

  if (visible.length === 0) {
    return {
      frame_index: null,
      missingness: missingness(
        MISSINGNESS_REASONS.POSE_NOT_DETECTED,
        "D-POSE",
      ),
      source_model: LANDMARK_MODEL_VERSION,
    };
  }

  // Peak leg lift = minimum y-coordinate (0 = top of frame).
  // Deterministic tie-break: earliest frame index wins.
  let best = visible[0];
  for (let i = 1; i < visible.length; i++) {
    const f = visible[i];
    if (
      f.lift_ankle_y < best.lift_ankle_y ||
      (f.lift_ankle_y === best.lift_ankle_y && f.frame_index < best.frame_index)
    ) {
      best = f;
    }
  }

  return {
    frame_index: best.frame_index,
    missingness: null,
    source_model: LANDMARK_MODEL_VERSION,
  };
}
