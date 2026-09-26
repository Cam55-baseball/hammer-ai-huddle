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

/** Visible landmark y (despite the name, any index). */
function ankleY(row: PoseFrameRow, idx: number): number | null {
  if (!row.pose_detected) return null;
  const lm = row.landmarks[idx];
  if (!lm || !Number.isFinite(lm.y)) return null;
  // Treat low-visibility landmarks as missing rather than fabricating a position.
  if (lm.visibility < 0.5) return null;
  return lm.y;
}

/** Shoulder-mid → ankle-mid vertical distance (normalised y). null if not visible. */
export function bodyHeightY(row: PoseFrameRow): number | null {
  const ys = [11, 12, 27, 28].map((i) => ankleY(row, i));
  if (ys.some((y) => y == null)) return null;
  const [ls, rs, la, ra] = ys as number[];
  const h = Math.abs((la + ra) / 2 - (ls + rs) / 2);
  return h > 0 ? h : null;
}

export function toPeakLegLiftFrames(
  rows: readonly PoseFrameRow[],
  liftIndex: number = BLAZEPOSE_INDEX.LEFT_ANKLE,
): PoseFrame[] {
  return rows.map((r) => ({
    frame_index: r.frame_index,
    lift_ankle_y: ankleY(r, liftIndex),
    body_height_y: bodyHeightY(r),
  }));
}

export function toPlantFrames(
  rows: readonly PoseFrameRow[],
  frontIndex: number = BLAZEPOSE_INDEX.RIGHT_ANKLE,
): PlantPoseFrame[] {
  return rows.map((r) => ({
    frame_index: r.frame_index,
    front_ankle_y: ankleY(r, frontIndex),
    body_height_y: bodyHeightY(r),
  }));
}
