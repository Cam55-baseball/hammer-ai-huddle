/**
 * Phase 26 — Calibration certificate generator for `tempo_sec` (D-8).
 *
 * Per `canonical-calibration-architecture.md §3.2`: a calibration certificate
 * must be derived from a labeled-corpus residual envelope. Until such a
 * corpus exists (none does at Phase 26), this module REFUSES to emit a
 * certificate and instead returns `CalibrationStatus.uncalibrated` with the
 * exact precondition that is unmet.
 *
 * Fabricating a certificate (e.g. by inventing a residual envelope) is
 * forbidden by Phase 22 F-6 and `mem://` doctrine.
 */

import { sha256OfCanonicalJson } from "../fingerprint";
import type { TempoValidationReport } from "../validation/tempoHarness";
import { MIN_LABELED_PAIRS_FOR_VALIDATION } from "../validation/tempoHarness";

export type CalibrationStatus = "calibrated" | "uncalibrated";

export interface UncalibratedCertificate {
  readonly status: "uncalibrated";
  readonly reason:
    | "no_corpus"
    | "insufficient_corpus"
    | "validation_not_executed";
  readonly required_pair_count: number;
  readonly observed_pair_count: number;
}

export interface CalibrationCertificate {
  readonly status: "calibrated";
  readonly metric_key: "tempo_sec";
  readonly residual_envelope: {
    readonly mean_residual_sec: number;
    readonly mean_absolute_residual_sec: number;
    readonly pair_count: number;
  };
  readonly corpus_fingerprint_hex: string;
  readonly certificate_sha256_hex: string;
}

export type TempoCalibrationResult =
  | CalibrationCertificate
  | UncalibratedCertificate;

export async function generateTempoCalibrationCertificate(
  report: TempoValidationReport,
): Promise<TempoCalibrationResult> {
  if (report.status === "no_corpus") {
    return {
      status: "uncalibrated",
      reason: "no_corpus",
      required_pair_count: MIN_LABELED_PAIRS_FOR_VALIDATION,
      observed_pair_count: 0,
    };
  }
  if (report.status === "insufficient_corpus") {
    return {
      status: "uncalibrated",
      reason: "insufficient_corpus",
      required_pair_count: MIN_LABELED_PAIRS_FOR_VALIDATION,
      observed_pair_count: report.pair_count,
    };
  }
  if (
    report.summary.mean_residual_sec == null ||
    report.summary.mean_absolute_residual_sec == null
  ) {
    return {
      status: "uncalibrated",
      reason: "validation_not_executed",
      required_pair_count: MIN_LABELED_PAIRS_FOR_VALIDATION,
      observed_pair_count: report.pair_count,
    };
  }

  const body = {
    status: "calibrated" as const,
    metric_key: "tempo_sec" as const,
    residual_envelope: {
      mean_residual_sec: report.summary.mean_residual_sec,
      mean_absolute_residual_sec: report.summary.mean_absolute_residual_sec,
      pair_count: report.pair_count,
    },
    corpus_fingerprint_hex: report.corpus_fingerprint_hex,
  };

  const certificate_sha256_hex = await sha256OfCanonicalJson(body);

  return { ...body, certificate_sha256_hex };
}
