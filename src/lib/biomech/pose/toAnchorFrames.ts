/**
 * Phase 42B — Pure mapping from real pose rows into the existing anchor/detector
 * `PoseFrame` / `PlantPoseFrame` shapes. No new logic; only field selection.
 *
 * Convention for first-proof packet (right-handed pitcher default):
 *   - lift leg     = LEFT  ankle  (BlazePose index 27)  → peak-leg-lift anchor
 *   - front foot   = RIGHT ankle  (BlazePose index 28)  → front-foot-strike anchor
 * Left-handed handling is a downstream concern; flip the indices via the
 * `direction_sign` already carried in `runTempoPipeline` inputs.
 */

import type { PoseFrame } from "../anchors/peakLegLift";
import type { PlantPoseFrame } from "../detectors/plantDetector";
import { BLAZEPOSE_INDEX, type PoseFrameRow } from "./poseRunner";

function ankleY(row: PoseFrameRow, idx: number): number | null {
  if (!row.pose_detected) return null;
  const lm = row.landmarks[idx];
  if (!lm || !Number.isFinite(lm.y)) return null;
  // Treat low-visibility landmarks as missing rather than fabricating a position.
  if (lm.visibility < 0.5) return null;
  return lm.y;
}

export function toPeakLegLiftFrames(
  rows: readonly PoseFrameRow[],
  liftIndex: number = BLAZEPOSE_INDEX.LEFT_ANKLE,
): PoseFrame[] {
  return rows.map((r) => ({
    frame_index: r.frame_index,
    lift_ankle_y: ankleY(r, liftIndex),
  }));
}

export function toPlantFrames(
  rows: readonly PoseFrameRow[],
  frontIndex: number = BLAZEPOSE_INDEX.RIGHT_ANKLE,
): PlantPoseFrame[] {
  return rows.map((r) => ({
    frame_index: r.frame_index,
    front_ankle_y: ankleY(r, frontIndex),
  }));
}
