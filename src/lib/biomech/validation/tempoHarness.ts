/**
 * Phase 26 — Validation harness for `tempo_sec` (D-7).
 *
 * Conforms to `canonical-validation-framework.md §6` (H1 deterministic,
 * H2 ground-truth, H5 replay equivalence). The harness ingests
 * (predicted, ground_truth) pairs from a labeled corpus and emits a
 * lineage-bound residual record per pair plus a deterministic summary
 * fingerprint.
 *
 * Doctrine constraint: the harness MUST NOT fabricate ground truth and MUST
 * refuse to emit a "passing" verdict over an empty / undersized corpus.
 * Until a real labeled corpus exists in the repo (none does at Phase 26),
 * the harness emits a `no_corpus` status.
 */

import { sha256OfCanonicalJson } from "../fingerprint";

export interface TempoValidationPair {
  /** Stable id of the labeled clip (e.g. `clip_0001`). */
  readonly clip_id: string;
  /** Predicted tempo in seconds (from `computeTempoSec`). null = missing. */
  readonly predicted_sec: number | null;
  /** Ground-truth tempo in seconds from the labeled corpus. */
  readonly ground_truth_sec: number;
}

export interface TempoResidualRecord {
  readonly clip_id: string;
  readonly predicted_sec: number | null;
  readonly ground_truth_sec: number;
  /** predicted − ground_truth, in seconds. null when prediction missing. */
  readonly residual_sec: number | null;
  readonly absolute_residual_sec: number | null;
}

export type TempoValidationStatus =
  | "no_corpus"
  | "insufficient_corpus"
  | "executed";

/**
 * Minimum labeled-pair count per `canonical-verification-audit.md`
 * H2 ground-truth requirement. The harness refuses to emit `executed`
 * below this floor.
 */
export const MIN_LABELED_PAIRS_FOR_VALIDATION = 30;

export interface TempoValidationReport {
  readonly status: TempoValidationStatus;
  readonly pair_count: number;
  readonly residuals: readonly TempoResidualRecord[];
  readonly summary: {
    readonly mean_residual_sec: number | null;
    readonly mean_absolute_residual_sec: number | null;
    readonly missing_prediction_count: number;
  };
  readonly corpus_fingerprint_hex: string;
}

function roundToSixDecimals(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

export async function runTempoValidationHarness(
  pairs: readonly TempoValidationPair[],
): Promise<TempoValidationReport> {
  const sorted = [...pairs].sort((a, b) =>
    a.clip_id < b.clip_id ? -1 : a.clip_id > b.clip_id ? 1 : 0,
  );

  const residuals: TempoResidualRecord[] = sorted.map((p) => {
    if (p.predicted_sec == null) {
      return {
        clip_id: p.clip_id,
        predicted_sec: null,
        ground_truth_sec: p.ground_truth_sec,
        residual_sec: null,
        absolute_residual_sec: null,
      };
    }
    const r = roundToSixDecimals(p.predicted_sec - p.ground_truth_sec);
    return {
      clip_id: p.clip_id,
      predicted_sec: p.predicted_sec,
      ground_truth_sec: p.ground_truth_sec,
      residual_sec: r,
      absolute_residual_sec: Math.abs(r),
    };
  });

  const valid = residuals.filter(
    (r): r is TempoResidualRecord & { residual_sec: number; absolute_residual_sec: number } =>
      r.residual_sec != null,
  );
  const missing_prediction_count = residuals.length - valid.length;

  const mean_residual_sec =
    valid.length === 0
      ? null
      : roundToSixDecimals(
          valid.reduce((a, r) => a + r.residual_sec, 0) / valid.length,
        );
  const mean_absolute_residual_sec =
    valid.length === 0
      ? null
      : roundToSixDecimals(
          valid.reduce((a, r) => a + r.absolute_residual_sec, 0) /
            valid.length,
        );

  let status: TempoValidationStatus;
  if (sorted.length === 0) status = "no_corpus";
  else if (sorted.length < MIN_LABELED_PAIRS_FOR_VALIDATION)
    status = "insufficient_corpus";
  else status = "executed";

  const corpus_fingerprint_hex = await sha256OfCanonicalJson(sorted);

  return {
    status,
    pair_count: sorted.length,
    residuals,
    summary: {
      mean_residual_sec,
      mean_absolute_residual_sec,
      missing_prediction_count,
    },
    corpus_fingerprint_hex,
  };
}
