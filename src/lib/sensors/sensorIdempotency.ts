/**
 * Sensor Fusion Adapter Layer — Idempotency (deferred).
 *
 * Mirrors ASB computeIdempotencyKey behavior EXACTLY so that future
 * sensor → ASB translation does not break replay determinism or
 * collide-dedupe semantics. No DB writes. No ingestion.
 *
 * Material composition matches ASB:
 *   sha256(athlete_id | topic_id | occurred_at | normalized_payload)
 */

import { resolveSensorTopic } from "./sensorTopicRegistry";

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(s),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface SensorIdempotencyInputs {
  athlete_id: string;
  metric_type: string;
  occurred_at: string;
  normalized_payload: string;
}

export async function generateSensorIdempotencyKey(
  inputs: SensorIdempotencyInputs,
): Promise<string> {
  const topic_id = resolveSensorTopic(inputs.metric_type);
  if (topic_id === null) {
    throw new Error(
      `[sensorIdempotency] Unknown metric_type "${inputs.metric_type}" — refuse silent miscoding.`,
    );
  }
  const material = [
    inputs.athlete_id,
    topic_id,
    inputs.occurred_at,
    inputs.normalized_payload,
  ].join("|");
  return sha256Hex(material);
}
