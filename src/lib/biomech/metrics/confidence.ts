/**
 * Phase 26 — Confidence emission (D-9).
 *
 * Per `canonical-confidence-architecture.md §1.1` confidence values may only
 * be surfaced once a `cal §3.2` calibration certificate exists for the
 * metric. Until then, confidence MUST be reported as `uncalibrated` and the
 * numeric `confidence` field on the tile MUST be `null`. Fabricated
 * confidence values (e.g. defaulting to 1.0) are forbidden by Phase 22 F-7
 * and `mem://` doctrine.
 */

export type ConfidenceStatus = "calibrated" | "uncalibrated" | "missing";

export interface ConfidenceRecord {
  readonly status: ConfidenceStatus;
  /** Calibrated [0,1] value. `null` when status !== "calibrated". */
  readonly value: number | null;
  /** SHA-256 of the calibration certificate. `null` when uncalibrated. */
  readonly certificate_hash: string | null;
}

export function uncalibrated(): ConfidenceRecord {
  return { status: "uncalibrated", value: null, certificate_hash: null };
}

export function missingConfidence(): ConfidenceRecord {
  return { status: "missing", value: null, certificate_hash: null };
}

export function calibrated(
  value: number,
  certificate_hash: string,
): ConfidenceRecord {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(
      `calibrated confidence out of range [0,1]: ${value}`,
    );
  }
  if (!/^[0-9a-f]{64}$/i.test(certificate_hash)) {
    throw new Error(
      `certificate_hash must be 64-char sha256 hex, got: ${certificate_hash}`,
    );
  }
  return { status: "calibrated", value, certificate_hash };
}
