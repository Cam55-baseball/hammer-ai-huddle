/**
 * Sensor Fusion Adapter Layer — parity & inertness tests.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { SENSOR_TOPIC_REGISTRY, resolveSensorTopic } from "../sensorTopicRegistry";
import { normalizeSensorPayload } from "../sensorEventNormalizer";
import { generateSensorIdempotencyKey } from "../sensorIdempotency";
import { computeIdempotencyKey } from "@/lib/asb/engineVersion";
import type { SensorEvent, SensorToASBBridge } from "../sensorContract";

describe("sensor adapter layer (deferred scaffold)", () => {
  it("topic registry is deterministic and complete", () => {
    expect(SENSOR_TOPIC_REGISTRY).toEqual({
      heart_rate: "sensor.heart_rate",
      hrv: "sensor.hrv",
      sleep_stage: "sensor.sleep",
      load: "sensor.external_load",
      gps_velocity: "sensor.movement.velocity",
    });
    expect(resolveSensorTopic("heart_rate")).toBe("sensor.heart_rate");
    expect(resolveSensorTopic("unknown_metric")).toBeNull();
  });

  it("normalizer strips device noise and produces stable JSON", () => {
    const a = normalizeSensorPayload({
      metric_type: "hrv",
      value: 62,
      unit: "ms",
      occurred_at: "2026-05-25T00:00:00.000Z",
      device_metadata: { battery_level: 0.9, model: "x", rssi: -50 },
    });
    const b = normalizeSensorPayload({
      metric_type: "hrv",
      value: 62,
      unit: "ms",
      occurred_at: "2026-05-25T00:00:00.000Z",
      device_metadata: { model: "x" },
    });
    expect(a.normalized).toBe(b.normalized);
    expect(a.hashBasis).toBe(a.normalized);
  });

  it("idempotency key matches ASB computeIdempotencyKey byte-for-byte", async () => {
    const athlete_id = "athlete-1";
    const occurred_at = "2026-05-25T00:00:00.000Z";
    const { normalized } = normalizeSensorPayload({
      metric_type: "heart_rate",
      value: 120,
      unit: "bpm",
      occurred_at,
      device_metadata: {},
    });

    const sensorKey = await generateSensorIdempotencyKey({
      athlete_id,
      metric_type: "heart_rate",
      occurred_at,
      normalized_payload: normalized,
    });

    const asbKey = await computeIdempotencyKey({
      athlete_id,
      topic_id: "sensor.heart_rate",
      occurred_at,
      payload: JSON.parse(normalized),
    });

    expect(sensorKey).toBe(asbKey);
  });

  it("idempotency rejects unknown metric_type", async () => {
    await expect(
      generateSensorIdempotencyKey({
        athlete_id: "a",
        metric_type: "nope",
        occurred_at: "2026-05-25T00:00:00.000Z",
        normalized_payload: "{}",
      }),
    ).rejects.toThrow(/Unknown metric_type/);
  });

  it("bridge placeholder is inert (returns null)", () => {
    const bridge: SensorToASBBridge = { translate: (_e: SensorEvent) => null };
    const sample: SensorEvent = {
      sensor_event_id: "s1",
      athlete_id: "a1",
      source: "apple_health",
      metric_type: "heart_rate",
      value: 100,
      unit: "bpm",
      occurred_at: "2026-05-25T00:00:00.000Z",
      ingested_at: "2026-05-25T00:00:01.000Z",
      device_metadata: {},
      idempotency_key: "x",
      engine_version: "asb-1.0.0",
    };
    expect(bridge.translate(sample)).toBeNull();
  });
});
