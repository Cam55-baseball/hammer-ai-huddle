/**
 * Phase 27 — Aggregate six-gate emitter for `tempo_sec`
 * (per `canonical-production-gate-matrix.md` "Evidence-first release law").
 *
 * The release law requires SIMULTANEOUS satisfaction of:
 *   1. Validation status (`val §7`)
 *   2. Calibration certificate (`cal §3` / `cal §7`)
 *   3. Confidence calibration (`conf §Promotion-Demotion`)
 *   4. Replay equivalence (`bp §H5` / `val §H5`)
 *   5. Missingness fidelity (`arch §Missingness rules`)
 *   6. Determinism (cache fingerprint stability)
 *
 * This emitter assembles a single replay-stable record stating whether each
 * gate is satisfied for the current `tempo_sec` slice. It is read-only and
 * NEVER promotes the metric on its own — promotion is the production layer's
 * responsibility and requires ALL six gates to be `pass`.
 *
 * Conditions evaluated honestly today:
 * - Determinism: pass iff cache fingerprint stable across two pipeline runs.
 * - Replay equivalence: pass iff `evidence_sha256_hex` stable across two runs.
 * - Missingness fidelity: pass iff every emitted missingness reason is a
 *   member of the canonical `MISSINGNESS_REASONS` enum.
 * - Validation: blocked while no labeled corpus exists
 *   (`tempoHarness.status === "no_corpus"`).
 * - Calibration: blocked while certificate is `uncalibrated`.
 * - Confidence: blocked while certificate is `uncalibrated` (no calibrated
 *   confidence can be derived without a certificate).
 */

import {
  runTempoReplayEquivalenceHarness,
  type TempoReplayReport,
} from "../replay/tempoReplay";
import type { TempoPipelineInputs } from "../pipeline/tempoPipeline";
import {
  runTempoValidationHarness,
  type TempoValidationPair,
  type TempoValidationReport,
} from "../validation/tempoHarness";
import {
  generateTempoCalibrationCertificate,
  type TempoCalibrationResult,
} from "../calibration/tempoCalibration";
import {
  MISSINGNESS_REASONS,
  type MissingnessRecord,
} from "../metrics/missingness";
import { evaluateTempoGate, type TempoGateRecord } from "./tempoGate";
import { runTempoPipeline } from "../pipeline/tempoPipeline";

export type GateOutcome = "pass" | "fail" | "block";

export interface GateRecord {
  readonly gate: string;
  readonly outcome: GateOutcome;
  readonly reason: string;
}

export interface TempoGateMatrixInputs {
  readonly pipeline_inputs: TempoPipelineInputs;
  readonly validation_pairs: readonly TempoValidationPair[];
}

export interface TempoGateMatrixReport {
  readonly metric_key: "tempo_sec";
  readonly gates: {
    readonly determinism: GateRecord;
    readonly replay_equivalence: GateRecord;
    readonly missingness_fidelity: GateRecord;
    readonly validation: GateRecord;
    readonly calibration: GateRecord;
    readonly confidence_calibration: GateRecord;
  };
  readonly value_gate: TempoGateRecord;
  readonly replay_report: TempoReplayReport;
  readonly validation_report: TempoValidationReport;
  readonly calibration_result: TempoCalibrationResult;
  readonly all_pass: false;
  /** Names of gates whose outcome is not `pass`, for downstream auditors. */
  readonly blocking_gates: readonly string[];
}

const CANONICAL_REASONS: ReadonlySet<string> = new Set(
  Object.values(MISSINGNESS_REASONS),
);

function isCanonicalMissingness(
  m: MissingnessRecord | null | undefined,
): boolean {
  if (m == null) return true;
  return CANONICAL_REASONS.has(m.missing_reason);
}

export async function evaluateTempoGateMatrix(
  inputs: TempoGateMatrixInputs,
): Promise<TempoGateMatrixReport> {
  // Run the deterministic pipeline once for the value gate + missingness audit.
  const primary = await runTempoPipeline(inputs.pipeline_inputs);

  // Replay equivalence (2 independent runs).
  const replay = await runTempoReplayEquivalenceHarness(inputs.pipeline_inputs);

  // Determinism: cache_fingerprint identical across both runs.
  const determinism: GateRecord =
    replay.cache_fingerprint_hex === primary.evidence.cache_fingerprint_hex
      ? { gate: "determinism", outcome: "pass", reason: "cache_fingerprint_stable" }
      : { gate: "determinism", outcome: "fail", reason: "cache_fingerprint_unstable" };

  const replay_equivalence: GateRecord =
    replay.status === "equivalent"
      ? { gate: "replay_equivalence", outcome: "pass", reason: "evidence_sha256_stable" }
      : {
          gate: "replay_equivalence",
          outcome: "fail",
          reason: `divergence_in_${replay.divergence_field ?? "unknown"}`,
        };

  // Missingness fidelity: every missingness record on the evidence chain
  // (anchors + metric) must use a canonical enum reason.
  const missingnessSamples: (MissingnessRecord | null | undefined)[] = [
    primary.evidence.anchors.peak_leg_lift.missingness,
    primary.evidence.anchors.front_foot_strike.missingness,
    primary.evidence.metric.missingness,
  ];
  const missingness_fidelity: GateRecord = missingnessSamples.every(
    isCanonicalMissingness,
  )
    ? {
        gate: "missingness_fidelity",
        outcome: "pass",
        reason: "all_reasons_canonical",
      }
    : {
        gate: "missingness_fidelity",
        outcome: "fail",
        reason: "non_canonical_missingness_reason_emitted",
      };

  // Validation gate consumes the labeled-corpus harness.
  const validation_report = await runTempoValidationHarness(
    inputs.validation_pairs,
  );
  let validation: GateRecord;
  if (validation_report.status === "executed") {
    validation = {
      gate: "validation",
      outcome: "pass",
      reason: "harness_executed",
    };
  } else if (validation_report.status === "insufficient_corpus") {
    validation = {
      gate: "validation",
      outcome: "block",
      reason: "insufficient_corpus",
    };
  } else {
    validation = {
      gate: "validation",
      outcome: "block",
      reason: "no_corpus",
    };
  }

  // Calibration gate consumes the certificate generator.
  const calibration_result =
    await generateTempoCalibrationCertificate(validation_report);
  const calibration: GateRecord =
    calibration_result.status === "calibrated"
      ? {
          gate: "calibration",
          outcome: "pass",
          reason: "certificate_emitted",
        }
      : {
          gate: "calibration",
          outcome: "block",
          reason: calibration_result.reason,
        };

  // Confidence-calibration gate: cannot pass while certificate is uncalibrated.
  const confidence_calibration: GateRecord =
    calibration_result.status === "calibrated"
      ? {
          gate: "confidence_calibration",
          outcome: "pass",
          reason: "calibrated_against_certificate",
        }
      : {
          gate: "confidence_calibration",
          outcome: "block",
          reason: "no_calibration_certificate",
        };

  const value_gate = evaluateTempoGate(primary.metric, calibration_result);

  const gates = {
    determinism,
    replay_equivalence,
    missingness_fidelity,
    validation,
    calibration,
    confidence_calibration,
  } as const;

  const blocking_gates = Object.values(gates)
    .filter((g) => g.outcome !== "pass")
    .map((g) => g.gate);

  return {
    metric_key: "tempo_sec",
    gates,
    value_gate,
    replay_report: replay,
    validation_report,
    calibration_result,
    // Per Phase 27 doctrine: with D-POSE stub + no labeled corpus this can
    // never honestly be `true`. We surface that statically so consumers
    // cannot accidentally promote the metric on a partial gate set.
    all_pass: false,
    blocking_gates,
  };
}
