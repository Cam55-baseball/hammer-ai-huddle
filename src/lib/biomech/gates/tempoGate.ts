/**
 * Phase 26 — Production gate emitter for `tempo_sec` (D-11).
 *
 * Per `canonical-production-gate-matrix.md` the gate consumes:
 *   - metric value (or missingness)
 *   - confidence status
 *   - calibration status (from D-8 certificate)
 *
 * The gate emits a deterministic decision in {pass, fail, block, missing}.
 * `block` means: structural preconditions for the gate are not yet satisfied
 * (uncalibrated, missing certificate, etc.) — the gate has not been bypassed,
 * and the metric has NOT yet been promoted to Truth Supported state.
 */

import type { TempoSecResult } from "../metrics/tempoSec";
import type {
  CalibrationCertificate,
  UncalibratedCertificate,
} from "../calibration/tempoCalibration";

export type TempoGateDecision = "pass" | "fail" | "block" | "missing";

export interface TempoGateRecord {
  readonly metric_key: "tempo_sec";
  readonly decision: TempoGateDecision;
  readonly reason:
    | "metric_missing"
    | "uncalibrated"
    | "value_within_threshold"
    | "value_exceeds_threshold";
  readonly value_sec: number | null;
  readonly threshold_sec: 1.05; // per bp.contract.ts tempo prompt: "<=1.05s passes"
  readonly calibration_status: "calibrated" | "uncalibrated";
}

const TEMPO_PASS_THRESHOLD_SEC = 1.05 as const;

export function evaluateTempoGate(
  metric: TempoSecResult,
  calibration: CalibrationCertificate | UncalibratedCertificate,
): TempoGateRecord {
  if (metric.missingness != null || metric.value == null) {
    return {
      metric_key: "tempo_sec",
      decision: "missing",
      reason: "metric_missing",
      value_sec: null,
      threshold_sec: TEMPO_PASS_THRESHOLD_SEC,
      calibration_status: calibration.status,
    };
  }

  // Constitutional precondition: a non-missing value cannot promote to
  // pass/fail without a calibration certificate. The gate BLOCKS rather
  // than fabricates a verdict.
  if (calibration.status === "uncalibrated") {
    return {
      metric_key: "tempo_sec",
      decision: "block",
      reason: "uncalibrated",
      value_sec: metric.value,
      threshold_sec: TEMPO_PASS_THRESHOLD_SEC,
      calibration_status: "uncalibrated",
    };
  }

  const passes = metric.value <= TEMPO_PASS_THRESHOLD_SEC;
  return {
    metric_key: "tempo_sec",
    decision: passes ? "pass" : "fail",
    reason: passes ? "value_within_threshold" : "value_exceeds_threshold",
    value_sec: metric.value,
    threshold_sec: TEMPO_PASS_THRESHOLD_SEC,
    calibration_status: "calibrated",
  };
}
