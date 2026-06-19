/**
 * Phase 27 — Deterministic orchestrator for the `tempo_sec` slice.
 *
 * Wires D-3 anchors (peak leg lift + front-foot strike) → D-4 detector
 * (D-PLANT, already embedded in front-foot-strike anchor) → D-5 metric
 * engine (`computeTempoSec`) → D-6 evidence artifact, in a single pure
 * function. Same inputs → byte-identical `TempoEvidenceArtifact` (including
 * `cache_fingerprint_hex` and `evidence_sha256_hex`).
 *
 * Doctrine: the orchestrator never fabricates anchors / detectors / values.
 * Whenever an upstream layer emits canonical missingness, that missingness
 * propagates downward through the metric engine into the evidence artifact
 * unchanged. The orchestrator therefore retires the lineage-continuity
 * portion of F-1/F-3 for `tempo_sec` (per Phase 25 §12 / Phase 26 §10) —
 * it does NOT retire the D-POSE stub blocker, which remains visible inside
 * the artifact as a `pose_model_is_stub` missingness reason.
 */

import {
  findPeakLegLiftFrame,
  type PoseFrame,
} from "../anchors/peakLegLift";
import {
  findFrontFootStrikeFrame,
} from "../anchors/frontFootStrike";
import type { PlantPoseFrame } from "../detectors/plantDetector";
import { computeTempoSec, type TempoSecResult } from "../metrics/tempoSec";
import {
  buildTempoEvidence,
  type TempoEvidenceArtifact,
} from "../evidence/tempoEvidence";

export interface TempoPipelineInputs {
  readonly video_sha256_hex: string;
  readonly fps_true: number;
  readonly landing_time_sec: number | null;
  readonly direction_sign: 1 | -1;
  readonly calibration_h_px: number;
  /** D-POSE output. While D-POSE is stubbed the anchors emit canonical missingness. */
  readonly pose_frames: readonly (PoseFrame & PlantPoseFrame)[];
}

export interface TempoPipelineResult {
  readonly evidence: TempoEvidenceArtifact;
  readonly metric: TempoSecResult;
}

export async function runTempoPipeline(
  inputs: TempoPipelineInputs,
): Promise<TempoPipelineResult> {
  const peak_leg_lift = findPeakLegLiftFrame(inputs.pose_frames);
  const front_foot_strike = findFrontFootStrikeFrame(inputs.pose_frames);

  const metric = computeTempoSec({
    peak_leg_lift_frame_index: peak_leg_lift.frame_index,
    front_foot_strike_frame_index: front_foot_strike.frame_index,
    fps_true: inputs.fps_true,
  });

  const evidence = await buildTempoEvidence({
    video_sha256_hex: inputs.video_sha256_hex,
    fps_true: inputs.fps_true,
    landing_time_sec: inputs.landing_time_sec,
    direction_sign: inputs.direction_sign,
    calibration_h_px: inputs.calibration_h_px,
    peak_leg_lift,
    front_foot_strike,
    metric,
  });

  return { evidence, metric };
}
