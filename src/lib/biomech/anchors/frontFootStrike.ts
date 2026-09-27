/**
 * D-3 anchor: front-foot strike frame. Thin lineage-binding wrapper over
 * D-PLANT (`detectors/plantDetector.ts`) — no new logic. The detector's own
 * reason, detail and uncertainty are passed through unchanged.
 */

import {
  detectFrontFootStrike,
  type PlantOptions,
  type PlantPoseFrame,
} from "../detectors/plantDetector";
import type { MissingnessRecord } from "../metrics/missingness";

export interface FrontFootStrikeAnchor {
  readonly frame_index: number | null;
  readonly missingness: MissingnessRecord | null;
  readonly source_detector: string;
  readonly source_model: string;
  readonly anchor_uncertainty_ms: number | null;
  readonly path: "after_lift" | "onset" | null;
  readonly detail: string | null;
}

export function findFrontFootStrikeFrame(
  poseFrames: readonly PlantPoseFrame[],
  opts: PlantOptions = {},
): FrontFootStrikeAnchor {
  const r = detectFrontFootStrike(poseFrames, opts);
  return {
    frame_index: r.frame_index,
    missingness: r.missingness,
    source_detector: r.source_detector,
    source_model: r.source_model,
    anchor_uncertainty_ms: r.anchor_uncertainty_ms,
    path: r.path,
    detail: r.detail,
  };
}
