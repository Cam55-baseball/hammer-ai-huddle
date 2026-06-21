/**
 * Phase 34 — Labeled-corpus ingestion surface for `tempo_sec` validation.
 *
 * Pure, deterministic parser that converts a raw JSON-shaped value (the
 * format an external EXT-CORPUS file would deliver) into a typed
 * `readonly TempoValidationPair[]` conforming exactly to the existing
 * schema declared at `tempoHarness.ts` (clip_id: string, predicted_sec:
 * number | null, ground_truth_sec: number).
 *
 * Doctrine constraints:
 *  - No new schema is introduced — this module re-uses `TempoValidationPair`
 *    verbatim.
 *  - Ingestion NEVER fabricates data. Malformed input throws
 *    `TempoCorpusParseError`; an empty array is preserved as `[]` and is
 *    routed by the existing harness into `status: "no_corpus"`.
 *  - The exported `EMPTY_TEMPO_CORPUS` constant allows callers to wire the
 *    harness deterministically while no labeled corpus has yet been
 *    acquired (the Phase 30 EXT-CORPUS dependency).
 */

import type { TempoValidationPair } from "./tempoHarness";

export class TempoCorpusParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TempoCorpusParseError";
  }
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function parsePair(raw: unknown, index: number): TempoValidationPair {
  if (raw == null || typeof raw !== "object") {
    throw new TempoCorpusParseError(
      `corpus[${index}] is not an object`,
    );
  }
  const r = raw as Record<string, unknown>;

  if (typeof r.clip_id !== "string" || r.clip_id.length === 0) {
    throw new TempoCorpusParseError(
      `corpus[${index}].clip_id must be a non-empty string`,
    );
  }
  if (r.predicted_sec !== null && !isFiniteNumber(r.predicted_sec)) {
    throw new TempoCorpusParseError(
      `corpus[${index}].predicted_sec must be a finite number or null`,
    );
  }
  if (!isFiniteNumber(r.ground_truth_sec)) {
    throw new TempoCorpusParseError(
      `corpus[${index}].ground_truth_sec must be a finite number`,
    );
  }

  return {
    clip_id: r.clip_id,
    predicted_sec: r.predicted_sec as number | null,
    ground_truth_sec: r.ground_truth_sec,
  };
}

/**
 * Parse a raw JSON value (typically `JSON.parse` output) into a strictly
 * typed corpus. Rejects any malformed record by throwing.
 */
export function parseTempoValidationCorpus(
  raw: unknown,
): readonly TempoValidationPair[] {
  if (!Array.isArray(raw)) {
    throw new TempoCorpusParseError("corpus root must be an array");
  }
  return raw.map(parsePair);
}

/**
 * Canonical "no corpus acquired yet" sentinel. Routes through
 * `runTempoValidationHarness` to `status: "no_corpus"` per the existing
 * harness contract — no fabrication.
 */
export const EMPTY_TEMPO_CORPUS: readonly TempoValidationPair[] = [];
