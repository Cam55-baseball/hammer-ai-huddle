import { describe, it, expect } from "vitest";
import { developmentalState } from "@/lib/runtime/projections/developmentalState";
import {
  effectiveLoadCeiling,
  requiresParentConsent,
  gatesFor,
} from "@/lib/runtime/relational/developmentalGates";
import { mk, ENV } from "./_fixtures";

describe("developmentalGates — pure invariants", () => {
  it("youth_intro blocks recruiter and exposure", () => {
    const g = gatesFor("youth_intro");
    expect(g.recruiter).toBe("blocked");
    expect(g.exposure).toBe("blocked");
  });

  it("effectiveLoadCeiling = min(stage, deload); deload never raises", () => {
    expect(effectiveLoadCeiling("adult_pro", 70)).toBe(70);
    expect(effectiveLoadCeiling("youth_intro", 90)).toBe(60); // stage cap
    expect(effectiveLoadCeiling("adult_pro", null)).toBe(100);
  });

  it("minor stages require parent consent for recruiter", () => {
    expect(requiresParentConsent("youth_intro", "recruiter")).toBe(true);
    expect(requiresParentConsent("adolescent_mid", "recruiter")).toBe(true);
    expect(requiresParentConsent("adult_pro", "recruiter")).toBe(false);
  });
});

describe("developmentalState projection — replay determinism", () => {
  const ROWS = [
    mk({
      event_id: "d1",
      topic_id: "relational.developmental.age_observed",
      occurred_at: "2026-01-01T00:00:00Z",
      payload: {
        ...ENV,
        visibility_scope: "self",
        authority: "parent",
        confidence: 1,
        chronological_age_years: 14,
        source: "parent",
      },
    }),
    mk({
      event_id: "d2",
      topic_id: "relational.developmental.transition",
      occurred_at: "2026-01-01T01:00:00Z",
      payload: {
        ...ENV,
        visibility_scope: "self",
        authority: "clinician",
        confidence: 1,
        from_stage: "youth_developmental",
        to_stage: "adolescent_early",
        evidence_event_ids: ["d1"],
      },
    }),
    // Attempted regression — must be rejected by projection.
    mk({
      event_id: "d3",
      topic_id: "relational.developmental.transition",
      occurred_at: "2026-01-02T00:00:00Z",
      payload: {
        ...ENV,
        visibility_scope: "self",
        authority: "system_inferred",
        confidence: 0.5,
        from_stage: "adolescent_early",
        to_stage: "youth_intro",
        evidence_event_ids: [],
      },
    }),
    mk({
      event_id: "d4",
      topic_id: "relational.developmental.deload_window",
      occurred_at: "2026-01-03T00:00:00Z",
      payload: {
        ...ENV,
        visibility_scope: "self",
        authority: "clinician",
        confidence: 1,
        window_start: "2026-01-03",
        window_end: "2026-01-10",
        reason: "growth_spurt",
        load_ceiling_pct: 50,
      },
    }),
  ];

  it("is byte-stable across two builds", () => {
    const a = developmentalState(ROWS, "self");
    const b = developmentalState(ROWS, "self");
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
  });

  it("rejects stage regression", () => {
    const { state } = developmentalState(ROWS, "self");
    expect(state.current_stage).toBe("adolescent_early");
  });

  it("effective load ceiling honors deload window", () => {
    const { state } = developmentalState(ROWS, "self");
    // adolescent_early ceiling = 80; deload = 50 → effective 50
    expect(state.effective_load_ceiling_pct).toBe(50);
  });

  it("minor flag and gating flags consistent", () => {
    const { state } = developmentalState(ROWS, "self");
    expect(state.is_minor).toBe(true);
    expect(state.gating_flags.parent_consent_default).toBe(true);
  });
});
