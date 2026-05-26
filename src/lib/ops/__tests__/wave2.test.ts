import { describe, expect, it } from "vitest";
import { buildTelemetry } from "@/lib/ops/telemetry";
import { buildQueueHealth } from "@/lib/ops/queueHealth";
import {
  hashInputs,
  isCorrupt,
} from "@/lib/runtime/recovery/corruptionGuard";
import { can } from "@/lib/auth/governance/roleMatrix";
import { softLimit, resetLimit } from "@/lib/security/rateLimit";
import { validateRuntimeEvent } from "@/lib/security/eventValidator";

describe("wave2 telemetry", () => {
  it("derives throughput and override counts purely", () => {
    const now = new Date("2026-05-26T12:00:00Z");
    const snap = buildTelemetry(
      [
        { event_id: "1", topic_id: "session.started", occurred_at: "2026-05-26T11:00:00Z", payload: {} },
        { event_id: "2", topic_id: "prescription.override.requested", occurred_at: "2026-05-26T11:30:00Z", payload: { state: "watch" } },
        { event_id: "3", topic_id: "session.block.skipped", occurred_at: "2026-05-26T11:55:00Z", payload: { state: "escalate", missingness: "partial" } },
      ],
      now,
    );
    expect(snap.totalEvents).toBe(3);
    expect(snap.overrideCount).toBe(2);
    expect(snap.escalationCount).toBe(2);
    expect(snap.missingnessRate).toBeGreaterThan(0);
  });
});

describe("wave2 queue health", () => {
  it("returns zero state for empty queue", () => {
    expect(buildQueueHealth([]).size).toBe(0);
  });
  it("histograms retries deterministically", () => {
    const h = buildQueueHealth(
      [
        { id: "a", topic: "x.y", athleteId: "u1", payload: {}, actorRole: "athlete", actorId: null, enqueuedAt: 1, retries: 0 },
        { id: "b", topic: "x.y", athleteId: "u1", payload: {}, actorRole: "athlete", actorId: null, enqueuedAt: 2, retries: 1 },
      ],
      10,
    );
    expect(h.size).toBe(2);
    expect(h.retryHistogram[0]).toBe(1);
    expect(h.retryHistogram[1]).toBe(1);
  });
});

describe("wave2 corruption guard", () => {
  it("detects input set mutation", () => {
    const h = hashInputs(["a", "b", "c"]);
    expect(isCorrupt(h, ["a", "b", "c"])).toBe(false);
    expect(isCorrupt(h, ["a", "b", "d"])).toBe(true);
  });
  it("is order-invariant", () => {
    expect(hashInputs(["a", "b"])).toBe(hashInputs(["b", "a"]));
  });
});

describe("wave2 role matrix", () => {
  it("enforces capability boundaries", () => {
    expect(can("owner", "deployment_gate")).toBe(true);
    expect(can("coach", "deployment_gate")).toBe(false);
    expect(can("player", "override")).toBe(true);
    expect(can("scout", "override")).toBe(false);
    expect(can(null, "read_event")).toBe(false);
  });
});

describe("wave2 rate limit", () => {
  it("throttles within window", () => {
    resetLimit();
    const k = "t1";
    expect(softLimit(k, 2, 1000, 0)).toBe(true);
    expect(softLimit(k, 2, 1000, 10)).toBe(true);
    expect(softLimit(k, 2, 1000, 20)).toBe(false);
    expect(softLimit(k, 2, 1000, 2000)).toBe(true);
  });
});

describe("wave2 event validator", () => {
  it("rejects malformed topics and payloads", () => {
    expect(validateRuntimeEvent({ topic: "BadTopic", athleteId: "u1", payload: {} }).ok).toBe(false);
    expect(validateRuntimeEvent({ topic: "session.started", athleteId: "", payload: {} }).ok).toBe(false);
    expect(validateRuntimeEvent({ topic: "session.started", athleteId: "u1", payload: null }).ok).toBe(false);
    expect(validateRuntimeEvent({ topic: "session.started", athleteId: "u1", payload: { ok: true } }).ok).toBe(true);
  });
});
