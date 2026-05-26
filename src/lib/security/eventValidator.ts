/**
 * Wave 2 — Lightweight event validator.
 *
 * Structural sanity checks on runtime/ASB payloads before emission.
 * Rejects malformed events early so they never reach the ledger.
 * Server-side schema + RLS remain the canonical authority.
 */

export interface ValidatorResult {
  ok: boolean;
  reason?: string;
}

const TOPIC_RE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

export function validateRuntimeEvent(input: {
  topic?: string;
  athleteId?: string;
  payload?: unknown;
}): ValidatorResult {
  if (!input.topic || !TOPIC_RE.test(input.topic)) {
    return { ok: false, reason: "invalid_topic" };
  }
  if (!input.athleteId || typeof input.athleteId !== "string") {
    return { ok: false, reason: "missing_athlete_id" };
  }
  if (input.payload === null || typeof input.payload !== "object") {
    return { ok: false, reason: "invalid_payload" };
  }
  const size = JSON.stringify(input.payload).length;
  if (size > 64_000) return { ok: false, reason: "payload_too_large" };
  return { ok: true };
}
