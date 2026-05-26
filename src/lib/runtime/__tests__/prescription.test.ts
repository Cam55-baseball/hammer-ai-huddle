import { describe, it, expect } from "vitest";
import { buildDailyPrescription } from "@/lib/runtime/prescription";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

function mkRow(
  topic: string,
  payload: Record<string, unknown>,
  ageMin = 60,
): AsbEventRow {
  const t = new Date(Date.now() - ageMin * 60_000).toISOString();
  return {
    event_id: `${topic}-${ageMin}`,
    athlete_id: "ath",
    topic_id: topic,
    actor_role: "athlete",
    actor_id: null,
    occurred_at: t,
    ingested_at: t,
    effective_at: t,
    valid_from: t,
    valid_to: null,
    payload,
    engine_version: "asb-1.0.0",
    idempotency_key: `k-${topic}-${ageMin}`,
    causality_refs: [],
    lineage_refs: [],
  } as unknown as AsbEventRow;
}

describe("buildDailyPrescription", () => {
  it("returns unknown rest with no_signal when no events present", () => {
    const r = buildDailyPrescription([]);
    expect(r.state).toBe("unknown");
    expect(r.kind).toBe("rest");
    expect(r.missingness).toBe("no_signal");
    expect(r.sourceEventIds).toEqual([]);
    expect(r.blocks).toHaveLength(0);
  });

  it("prescribes lift output on high readiness + non-high fatigue", () => {
    const rows = [
      mkRow("athlete.readiness", { score: 82, confidence: 0.8 }),
      mkRow("athlete.fatigue", { band: "low", confidence: 0.7 }),
      mkRow("athlete.recovery", { debt: 20, confidence: 0.7 }),
    ];
    const r = buildDailyPrescription(rows);
    expect(r.state).toBe("calm");
    expect(r.kind).toBe("lift");
    expect(r.blocks.length).toBeGreaterThan(0);
    // confidence is tightened (min), never amplified above any source
    expect(r.confidence).toBe(0.7);
    expect(r.sourceEventIds.length).toBe(3);
  });

  it("collapses to recovery on high fatigue regardless of readiness", () => {
    const rows = [
      mkRow("athlete.readiness", { score: 88, confidence: 0.9 }),
      mkRow("athlete.fatigue", { band: "high", confidence: 0.8 }),
      mkRow("athlete.recovery", { debt: 70, confidence: 0.6 }),
    ];
    const r = buildDailyPrescription(rows);
    expect(r.state).toBe("escalate");
    expect(r.kind).toBe("recovery");
  });

  it("defers to active override even with strong signals", () => {
    const rows = [
      mkRow("athlete.readiness", { score: 90, confidence: 0.9 }),
      mkRow("athlete.fatigue", { band: "low", confidence: 0.8 }),
      mkRow("prescription.override.requested", { reason: "travel", severity: "high" }),
    ];
    const r = buildDailyPrescription(rows);
    expect(r.kind).toBe("recovery");
    expect(r.state).toBe("watch");
    expect(r.inputs.override).not.toBeNull();
  });

  it("preserves missingness when a signal is absent", () => {
    const rows = [
      mkRow("athlete.readiness", { score: 65, confidence: 0.5 }),
      // fatigue + recovery missing
    ];
    const r = buildDailyPrescription(rows);
    expect(r.missingness).toBe("no_signal"); // tightened to worst
    // never imputes — confidence reflects only present sources
    expect(r.confidence).toBe(0.5);
  });

  it("never amplifies confidence above any source", () => {
    const rows = [
      mkRow("athlete.readiness", { score: 75, confidence: 0.4 }),
      mkRow("athlete.fatigue", { band: "moderate", confidence: 0.6 }),
      mkRow("athlete.recovery", { debt: 30, confidence: 0.9 }),
    ];
    const r = buildDailyPrescription(rows);
    expect(r.confidence).not.toBeNull();
    expect(r.confidence!).toBeLessThanOrEqual(0.4);
  });
});
