/**
 * Pure mapping from pose rows into the anchor/detector frame shapes.
 *
 * The lift foot and the plant foot are the SAME foot — the athlete's front
 * (stride) foot — chosen by `strideSide.frontAnkleIndex(side)`. There is no
 * default index: the old defaults (lift = left, plant = right) read the lift
 * and the plant from different feet and watched the back foot of every
 * right-handed hitter.
 */

import type { PoseFrame } from "../anchors/peakLegLift";
import type { PlantPoseFrame } from "../detectors/plantDetector";
import type { PoseFrameRow } from "./poseRunner";

function visible(row: PoseFrameRow, idx: number): { x: number; y: number } | null {
  if (!row.pose_detected) return null;
  const lm = row.landmarks[idx];
  if (!lm || !Number.isFinite(lm.y) || !Number.isFinite(lm.x)) return null;
  // Treat low-visibility landmarks as missing rather than fabricating a position.
  if (lm.visibility < 0.5) return null;
  return { x: lm.x, y: lm.y };
}

/** Shoulder-mid → ankle-mid vertical distance (normalised y). null if not visible. */
export function bodyHeightY(row: PoseFrameRow): number | null {
  const ps = [11, 12, 27, 28].map((i) => visible(row, i));
  if (ps.some((p) => p == null)) return null;
  const [ls, rs, la, ra] = ps as { y: number }[];
  const h = Math.abs((la.y + ra.y) / 2 - (ls.y + rs.y) / 2);
  return h > 0 ? h : null;
}

export function toPeakLegLiftFrames(rows: readonly PoseFrameRow[], frontAnkleIndex: 27 | 28): PoseFrame[] {
  return rows.map((r) => {
    const p = visible(r, frontAnkleIndex);
    return { frame_index: r.frame_index, lift_ankle_y: p?.y ?? null, lift_ankle_x: p?.x ?? null, body_height_y: bodyHeightY(r) };
  });
}

export function toPlantFrames(rows: readonly PoseFrameRow[], frontAnkleIndex: 27 | 28): PlantPoseFrame[] {
  return rows.map((r) => {
    const p = visible(r, frontAnkleIndex);
    return { frame_index: r.frame_index, front_ankle_y: p?.y ?? null, front_ankle_x: p?.x ?? null, body_height_y: bodyHeightY(r) };
  });
}

/** Both shapes merged, for the tempo pipeline. */
export function toStrideFrames(rows: readonly PoseFrameRow[], frontAnkleIndex: 27 | 28): (PoseFrame & PlantPoseFrame)[] {
  return rows.map((r) => {
    const p = visible(r, frontAnkleIndex);
    const h = bodyHeightY(r);
    return {
      frame_index: r.frame_index,
      lift_ankle_y: p?.y ?? null, lift_ankle_x: p?.x ?? null,
      front_ankle_y: p?.y ?? null, front_ankle_x: p?.x ?? null,
      body_height_y: h,
    };
  });
}
