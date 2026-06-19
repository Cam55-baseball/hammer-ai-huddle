/**
 * Phase 26 — D-6 evidence artifact for `tempo_sec`.
 *
 * Lineage-bound, replay-stable artifact capturing the full D-1…D-5 chain for
 * one athlete attempt. Same inputs → byte-identical `evidence_sha256`. The
 * artifact is the unit persisted for replay, validation, calibration, and
 * gate evaluation per Phase 25 §12.
 */

import {
  buildCacheFingerprint,
  sha256OfCanonicalJson,
} from "../fingerprint";
import {
  LANDMARK_MODEL_VERSION,
  DETECTOR_VERSION,
  METRIC_ENGINE_VERSION,
} from "../versions";
import type { TempoSecResult } from "../metrics/tempoSec";
import type { PeakLegLiftResult } from "../anchors/peakLegLift";
import type { FrontFootStrikeAnchor } from "../anchors/frontFootStrike";

export interface TempoEvidenceInputs {
  readonly video_sha256_hex: string;
  readonly fps_true: number;
  readonly landing_time_sec: number | null;
  readonly direction_sign: 1 | -1;
  readonly calibration_h_px: number;
  readonly peak_leg_lift: PeakLegLiftResult;
  readonly front_foot_strike: FrontFootStrikeAnchor;
  readonly metric: TempoSecResult;
}

export interface TempoEvidenceArtifact {
  readonly metric_key: "tempo_sec";
  readonly engine_version: {
    readonly landmark_model: string;
    readonly detector: string;
    readonly metric_engine: string;
  };
  readonly inputs: {
    readonly video_sha256_hex: string;
    readonly fps_true: number;
    readonly landing_time_sec: number | null;
    readonly direction_sign: 1 | -1;
    readonly calibration_h_px: number;
  };
  readonly anchors: {
    readonly peak_leg_lift: PeakLegLiftResult;
    readonly front_foot_strike: FrontFootStrikeAnchor;
  };
  readonly metric: TempoSecResult;
  readonly cache_fingerprint_hex: string;
  readonly evidence_sha256_hex: string;
}

export async function buildTempoEvidence(
  inputs: TempoEvidenceInputs,
): Promise<TempoEvidenceArtifact> {
  const cache_fingerprint_hex = await buildCacheFingerprint({
    videoSha256Hex: inputs.video_sha256_hex,
    fpsTrue: inputs.fps_true,
    landingTimeSec: inputs.landing_time_sec,
    directionSign: inputs.direction_sign,
    calibrationHpx: inputs.calibration_h_px,
  });

  const body = {
    metric_key: "tempo_sec" as const,
    engine_version: {
      landmark_model: LANDMARK_MODEL_VERSION,
      detector: DETECTOR_VERSION,
      metric_engine: METRIC_ENGINE_VERSION,
    },
    inputs: {
      video_sha256_hex: inputs.video_sha256_hex,
      fps_true: inputs.fps_true,
      landing_time_sec: inputs.landing_time_sec,
      direction_sign: inputs.direction_sign,
      calibration_h_px: inputs.calibration_h_px,
    },
    anchors: {
      peak_leg_lift: inputs.peak_leg_lift,
      front_foot_strike: inputs.front_foot_strike,
    },
    metric: inputs.metric,
    cache_fingerprint_hex,
  };

  const evidence_sha256_hex = await sha256OfCanonicalJson(body);

  return { ...body, evidence_sha256_hex };
}
