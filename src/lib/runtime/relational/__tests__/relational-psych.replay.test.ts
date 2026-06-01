import { describe, it, expect } from "vitest";
import { psychState } from "@/lib/runtime/projections/psychState";
import {
  clampInferredConfidence,
  resolveEffectiveBand,
  decayInferredValue,
  INFERRED_HALF_LIFE_TICKS,
} from "@/lib/runtime/relational/psychInference";
import { PSYCH_INFERRED_CONFIDENCE_CEILING } from "@/lib/runtime/relational/schemas";
import { mk, ENV } from "./_fixtures";

describe("psychInference — pure invariants", () => {
  it("clamps inferred confidence to ≤ 0.7", () => {
    expect(clampInferredConfidence(0.99)).toBe(PSYCH_INFERRED_CONFIDENCE_CEILING);
    expect(clampInferredConfidence(-1)).toBe(0);
    expect(clampInferredConfidence(0.5)).toBe(0.5);
  });

  it("decay is deterministic on the half-life", () => {
    expect(decayInferredValue(1, 0)).toBe(1);
    expect(decayInferredValue(1, INFERRED_HALF_LIFE_TICKS)).toBeCloseTo(0.5, 10);
    expect(decayInferredValue(1, INFERRED_HALF_LIFE_TICKS * 2)).toBeCloseTo(0.25, 10);
  });

  it("self-report supersedes inferred", () => {
    const r = resolveEffectiveBand({
      selfReportValue: 1.5,
      inferredValue: -2,
      inferredConfidence: 0.7,
    });
    expect(r.source).toBe("self");
    expect(r.effectiveBand).toBe("elevated");
    expect(r.confidence).toBe(1.0);
  });
});

describe("psychState projection — replay determinism", () => {
  const ROWS = [
    mk({
      event_id: "p1",
      topic_id: "relational.psych.inferred",
      occurred_at: "2026-01-02T08:00:00Z",
      payload: {
        ...ENV,
        visibility_scope: "self",
        authority: "system_inferred",
        confidence: 0.95,
        axis: "confidence",
        value: -1.5,
        evidence_event_ids: ["x1"],
      },
    }),
    mk({
      event_id: "p2",
      topic_id: "relational.psych.self_report",
      occurred_at: "2026-01-02T09:00:00Z",
      payload: {
        ...ENV,
        visibility_scope: "self",
        authority: "self",
        confidence: 1.0,
        axis: "confidence",
        value: 1.2,
      },
    }),
    mk({
      event_id: "p3",
      topic_id: "relational.psych.self_report",
      occurred_at: "2026-01-02T09:01:00Z",
      payload: {
        ...ENV,
        visibility_scope: "self",
        authority: "self",
        confidence: 1.0,
        axis: "mood",
        value: -2,
      },
    }),
  ];

  it("is byte-stable across two builds", () => {
    const a = psychState(ROWS, "self");
    const b = psychState(ROWS, "self");
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
  });

  it("self_report supersedes inferred on same axis", () => {
    const { state } = psychState(ROWS, "self");
    const conf = state.axes.confidence;
    expect(conf.source).toBe("self");
    expect(conf.effective_band).toBe("elevated");
  });

  it("inferred confidence is clamped at projection boundary", () => {
    const onlyInferred = [ROWS[0]];
    const { state } = psychState(onlyInferred, "self");
    expect(state.axes.confidence.inferred_confidence).toBe(
      PSYCH_INFERRED_CONFIDENCE_CEILING,
    );
  });

  it("crisis landing flips requires_ack on mood axis", () => {
    const { state } = psychState(ROWS, "self");
    expect(state.axes.mood.effective_band).toBe("crisis");
    expect(state.axes.mood.requires_ack).toBe(true);
  });
});
