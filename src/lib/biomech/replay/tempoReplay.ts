/**
 * Phase 27 — Replay-equivalence harness for the `tempo_sec` slice (val §H5 / bp §H5).
 *
 * Per `canonical-production-gate-matrix.md` Part 0 the production chain
 * requires "Replay equivalence demonstrated by harness `bp §H5` / `val §H5`":
 * identical inputs → bit-identical outputs across two independent runs.
 *
 * This harness runs the deterministic `tempo_sec` pipeline twice over the
 * same `TempoPipelineInputs` and asserts byte-identical `evidence_sha256_hex`
 * and `cache_fingerprint_hex`. It is the D-11 replay-equivalence gate evidence
 * emitter for `tempo_sec`.
 *
 * Doctrine: this harness is structural — it proves the deterministic chain
 * is deterministic regardless of pose model state. It does NOT promote
 * `tempo_sec` to Truth Supported on its own; truth promotion still requires
 * a calibration certificate (Phase 26 F-6, doctrinally blocked at Phase 27
 * because no labeled corpus exists).
 */

import {
  runTempoPipeline,
  type TempoPipelineInputs,
  type TempoPipelineResult,
} from "../pipeline/tempoPipeline";

export type ReplayEquivalenceStatus = "equivalent" | "divergent";

export interface TempoReplayReport {
  readonly status: ReplayEquivalenceStatus;
  readonly run_count: 2;
  readonly cache_fingerprint_hex: string;
  readonly evidence_sha256_hex_a: string;
  readonly evidence_sha256_hex_b: string;
  readonly divergence_field: "evidence_sha256_hex" | "cache_fingerprint_hex" | null;
}

export async function runTempoReplayEquivalenceHarness(
  inputs: TempoPipelineInputs,
): Promise<TempoReplayReport> {
  const a: TempoPipelineResult = await runTempoPipeline(inputs);
  const b: TempoPipelineResult = await runTempoPipeline(inputs);

  const cache_match =
    a.evidence.cache_fingerprint_hex === b.evidence.cache_fingerprint_hex;
  const evidence_match =
    a.evidence.evidence_sha256_hex === b.evidence.evidence_sha256_hex;

  let status: ReplayEquivalenceStatus;
  let divergence_field: TempoReplayReport["divergence_field"];
  if (cache_match && evidence_match) {
    status = "equivalent";
    divergence_field = null;
  } else if (!cache_match) {
    status = "divergent";
    divergence_field = "cache_fingerprint_hex";
  } else {
    status = "divergent";
    divergence_field = "evidence_sha256_hex";
  }

  return {
    status,
    run_count: 2,
    cache_fingerprint_hex: a.evidence.cache_fingerprint_hex,
    evidence_sha256_hex_a: a.evidence.evidence_sha256_hex,
    evidence_sha256_hex_b: b.evidence.evidence_sha256_hex,
    divergence_field,
  };
}
