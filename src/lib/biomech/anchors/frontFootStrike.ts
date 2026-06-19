/**
 * Phase 26 — D-3 anchor: front-foot strike frame.
 *
 * Thin lineage-binding wrapper over D-PLANT (`detectors/plantDetector.ts`).
 * The anchor layer (D-3) and the detector layer (D-4 / D-PLANT) are kept
 * structurally separate per the Phase 23 D-1…D-11 dependency graph; this
 * wrapper rebinds the D-PLANT result as a D-3 anchor result without
 * introducing any new logic.
 */

import {
  detectFrontFootStrike,
  type PlantDetectionResult,
  type PlantPoseFrame,
} from "../detectors/plantDetector";
import type { MissingnessRecord } from "../metrics/missingness";

export interface FrontFootStrikeAnchor {
  readonly frame_index: number | null;
  readonly missingness: MissingnessRecord | null;
  readonly source_detector: string;
  readonly source_model: string;
}

export function findFrontFootStrikeFrame(
  poseFrames: readonly PlantPoseFrame[],
): FrontFootStrikeAnchor {
  const r: PlantDetectionResult = detectFrontFootStrike(poseFrames);
  return {
    frame_index: r.frame_index,
    missingness: r.missingness,
    source_detector: r.source_detector,
    source_model: r.source_model,
  };
}
