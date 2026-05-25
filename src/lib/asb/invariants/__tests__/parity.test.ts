import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";
if (!(globalThis as any).crypto) {
  (globalThis as any).crypto = webcrypto;
}

import {
  validateDigestParity,
  validateCoachParity,
  validateForecastParity,
  validateSensorForwardCompatibility,
  type AsbEventLike,
} from "../asbCrossSystemValidators";
import { runInvariantSuite, assertInvariantSuite } from "../asbInvariantChecks";
import { computeIdempotencyKey } from "@/lib/asb/engineVersion";
import { generateSensorIdempotencyKey } from "@/lib/sensors/sensorIdempotency";
import { normalizeSensorPayload } from "@/lib/sensors/sensorEventNormalizer";
import { classifyMissingness } from "@/lib/asb/constants/missingnessThresholds";

const sampleAsb: AsbEventLike = {
  event_id: "evt-1",
  athlete_id: "ath-1",
  topic_id: "foundation.readiness",
  occurred_at: new Date().toISOString(),
  payload: { score: 0.7 },
  confidence: 0.8,
  engine_version: "asb-1.0.0",
};

describe("ASB cross-substrate invariants", () => {
  it("digest parity passes for faithful projection", () => {
    const r = validateDigestParity(sampleAsb, {
      event_id: sampleAsb.event_id,
      topic_id: sampleAsb.topic_id,
      confidence: 0.8,
      missingness: "ok",
      sourceEventIds: [sampleAsb.event_id],
    });
    expect(r.pass).toBe(true);
  });

  it("digest parity fails on confidence amplification", () => {
    const r = validateDigestParity(sampleAsb, { confidence: 0.99 });
    expect(r.pass).toBe(false);
    expect(r.mismatch_reason).toMatch(/amplification/);
  });

  it("coach parity rejects dropped raw confidence", () => {
    const r = validateCoachParity(sampleAsb, { topic_id: sampleAsb.topic_id });
    expect(r.pass).toBe(false);
  });

  it("forecast parity rejects topic mismatch", () => {
    const r = validateForecastParity(sampleAsb, { topic_id: "analytics.workload" });
    expect(r.pass).toBe(false);
  });

  it("sensor idempotency equals ASB idempotency byte-for-byte", async () => {
    const normInput = {
      metric_type: "heart_rate",
      value: 72,
      unit: "bpm",
      occurred_at: "2026-05-25T12:00:00Z",
      device_metadata: {},
    };
    const { normalized } = normalizeSensorPayload(normInput);
    const sensorKey = await generateSensorIdempotencyKey({
      athlete_id: "ath-1",
      metric_type: "heart_rate",
      occurred_at: "2026-05-25T12:00:00Z",
      normalized_payload: normalized,
    });
    const asbKey = await computeIdempotencyKey({
      athlete_id: "ath-1",
      topic_id: "sensor.heart_rate",
      occurred_at: "2026-05-25T12:00:00Z",
      payload: normInput,
    });
    expect(sensorKey).toBe(asbKey);
  });

  it("sensor forward compatibility passes for known metric", async () => {
    const r = await validateSensorForwardCompatibility({
      athlete_id: "ath-1",
      metric_type: "hrv",
      occurred_at: "2026-05-25T12:00:00Z",
      value: 42,
      unit: "ms",
    });
    expect(r.pass).toBe(true);
  });

  it("classifyMissingness deterministic across subsystems", () => {
    expect(classifyMissingness([], "foundation.readiness")).toBe("no_signal");
    expect(
      classifyMissingness(
        [{ topic_id: "foundation.readiness", occurred_at: new Date().toISOString(), payload: { score: 1 } }],
        "foundation.readiness",
      ),
    ).toBe("ok");
  });

  it("runInvariantSuite returns 100% pass on aligned sample", async () => {
    const summary = await runInvariantSuite([
      {
        asb: sampleAsb,
        digest: { event_id: sampleAsb.event_id, topic_id: sampleAsb.topic_id, confidence: 0.8, sourceEventIds: [sampleAsb.event_id] },
        coach: { event_id: sampleAsb.event_id, topic_id: sampleAsb.topic_id, confidence: 0.8 },
        forecast: { event_id: sampleAsb.event_id, topic_id: sampleAsb.topic_id, confidence: 0.5 },
      },
    ]);
    expect(summary.failed).toBe(0);
    expect(() => assertInvariantSuite(summary)).not.toThrow();
  });
});
