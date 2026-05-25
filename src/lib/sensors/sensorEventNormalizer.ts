/**
 * Sensor Fusion Adapter Layer — Normalizer (deferred).
 *
 * Pure functions only. No side effects. No ASB writes. No I/O.
 * Reuses canonicalPayload (stable key-sorted JSON) from the ASB engine
 * helper so that future sensor → ASB hashing is byte-for-byte aligned.
 */

import { canonicalPayload } from "@/lib/asb/engineVersion";
import type { SensorEvent } from "./sensorContract";

/**
 * Device-jitter fields stripped from device_metadata before canonical
 * serialization. Declarative list only — no behavioral inference.
 */
export const NOISE_FIELDS = [
  "battery_level",
  "signal_strength",
  "rssi",
  "sample_seq",
  "_raw",
] as const;

export function stripDeviceNoise(
  meta: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(meta)) {
    if ((NOISE_FIELDS as readonly string[]).includes(k)) continue;
    out[k] = meta[k];
  }
  return out;
}

export type NormalizerInput = Pick<
  SensorEvent,
  "metric_type" | "value" | "unit" | "occurred_at" | "device_metadata"
>;

export interface NormalizedSensorPayload {
  normalized: string;
  hashBasis: string;
}

/**
 * Deterministic, key-sorted JSON serialization of the sensor payload.
 * `normalized` is the canonical JSON string; `hashBasis` is the exact
 * string future idempotency hashing will consume.
 */
export function normalizeSensorPayload(
  event: NormalizerInput,
): NormalizedSensorPayload {
  const cleanedMeta = stripDeviceNoise(event.device_metadata ?? {});
  const canonical = canonicalPayload({
    metric_type: event.metric_type,
    value: event.value,
    unit: event.unit,
    occurred_at: event.occurred_at,
    device_metadata: cleanedMeta,
  });
  return { normalized: canonical, hashBasis: canonical };
}
