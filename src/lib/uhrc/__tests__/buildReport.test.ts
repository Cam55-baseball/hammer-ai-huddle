import { describe, it, expect } from "vitest";
import { buildUhrcReport } from "../buildReport";
import { UHRC_ENGINE_VERSION } from "../types";
import { PIE_V2_ENGINE_VERSION, type PieV2SessionAggregate } from "@/lib/pieV2/types";

function makeAgg(): PieV2SessionAggregate {
  return {
    session_id: "s1",
    athlete_id: "a1",
    computed_at: "2026-06-06T00:00:00.000Z",
    engine_version: PIE_V2_ENGINE_VERSION,
    pie_v2_composite: 72,
    athlete_reported_pain_in_session: false,
    signals: [
      { signal_id: "energy_angle", sample_count: 5, missing_count: 0, average: 80, best: 90, worst: 70, variance: 20, consistency: 75, tier: "clean", confidence: { score: 80, basis: "manual_aggregate" }, tracked_only: false, fatigue_slope: 0 },
      { signal_id: "separation", sample_count: 5, missing_count: 0, average: 45, best: 60, worst: 30, variance: 80, consistency: 50, tier: "major", confidence: { score: 75, basis: "manual_aggregate" }, tracked_only: false, fatigue_slope: -0.2 },
      { signal_id: "stride", sample_count: 5, missing_count: 0, average: 70, best: 80, worst: 60, variance: 40, consistency: 70, tier: "minor", confidence: { score: 70, basis: "manual_aggregate" }, tracked_only: false, fatigue_slope: 0 },
      { signal_id: "hip_alignment", sample_count: 5, missing_count: 0, average: 60, best: 70, worst: 50, variance: 50, consistency: 60, tier: "minor", confidence: { score: 70, basis: "manual_aggregate" }, tracked_only: false, fatigue_slope: 0 },
      { signal_id: "front_side", sample_count: 5, missing_count: 0, average: 65, best: 75, worst: 55, variance: 40, consistency: 65, tier: "minor", confidence: { score: 70, basis: "manual_aggregate" }, tracked_only: false, fatigue_slope: 0 },
      { signal_id: "rear_foot_drag", sample_count: 5, missing_count: 0, average: 70, best: 80, worst: 60, variance: 40, consistency: 70, tier: "minor", confidence: { score: 70, basis: "manual_aggregate" }, tracked_only: false, fatigue_slope: 0 },
      { signal_id: "visual_stability", sample_count: 5, missing_count: 0, average: 85, best: 90, worst: 80, variance: 10, consistency: 90, tier: "clean", confidence: { score: 80, basis: "manual_aggregate" }, tracked_only: false, fatigue_slope: 0 },
      { signal_id: "head_alignment", sample_count: 5, missing_count: 0, average: 75, best: 80, worst: 70, variance: 25, consistency: 80, tier: "minor", confidence: { score: 70, basis: "manual_aggregate" }, tracked_only: false, fatigue_slope: 0 },
      { signal_id: "tempo", sample_count: 5, missing_count: 0, average: 70, best: 80, worst: 60, variance: 40, consistency: 70, tier: "minor", confidence: { score: 75, basis: "manual_aggregate" }, tracked_only: false, fatigue_slope: -0.3 },
      { signal_id: "head_stability", sample_count: 5, missing_count: 0, average: 78, best: 85, worst: 70, variance: 20, consistency: 80, tier: "minor", confidence: { score: 70, basis: "manual_aggregate" }, tracked_only: false, fatigue_slope: 0 },
      { signal_id: "shoulder_level", sample_count: 5, missing_count: 0, average: 82, best: 90, worst: 75, variance: 15, consistency: 85, tier: "clean", confidence: { score: 70, basis: "manual_aggregate" }, tracked_only: false, fatigue_slope: 0 },
      { signal_id: "extension_consistency", sample_count: 5, missing_count: 0, average: 70, best: 78, worst: 62, variance: 8, consistency: 80, tier: null, confidence: { score: 70, basis: "manual_aggregate" }, tracked_only: true, fatigue_slope: 0 },
      { signal_id: "arm_slot_consistency", sample_count: 5, missing_count: 0, average: 72, best: 80, worst: 65, variance: 9, consistency: 78, tier: null, confidence: { score: 70, basis: "manual_aggregate" }, tracked_only: true, fatigue_slope: 0 },
    ],
  };
}

describe("buildUhrcReport", () => {
  it("produces a deterministic report pinned to UHRC_ENGINE_VERSION", () => {
    const r = buildUhrcReport({
      athlete_id: "a1",
      disciplines: ["pitching"],
      pieV2Latest: makeAgg(),
    });
    expect(r.engine_version).toBe(UHRC_ENGINE_VERSION);
    expect(r.source_engine_versions.pie_v2).toBe(PIE_V2_ENGINE_VERSION);
    expect(r.pillars.length).toBeGreaterThan(0);
    expect(r.composite).not.toBeNull();
    expect(r.biggest_leak?.summary).toMatch(/separation/i);
  });

  it("preserves missingness when no PIE V2 aggregate provided", () => {
    const r = buildUhrcReport({ athlete_id: "a1", disciplines: ["pitching"] });
    expect(r.composite).toBeNull();
    expect(r.missingness.total_signals_present).toBe(0);
    expect(r.missingness.missing_signal_ids.length).toBeGreaterThan(0);
  });

  it("includes hitting phases when hitting discipline requested with doctrine", () => {
    const r = buildUhrcReport({
      athlete_id: "a1",
      disciplines: ["hitting"],
      hieSnapshot: {
        id: "snap1",
        hitting_doctrine: {
          violated_phases: ["P2", "P3"],
          priority_phase: "P3",
          causal_chains: {},
          roadmap: [],
          confidence: 75,
          missingness: { reason: "ok", missing_signals: [], mapped_symptom_count: 2 },
          engine_version: "hie-1.0.0",
        },
        decision_speed_index: 70,
      },
    });
    const mechanics = r.pillars.find((p) => p.id === "mechanics");
    expect(mechanics?.contributions.some((c) => c.source_signal_id === "hitting.P1")).toBe(true);
    const stuff = r.pillars.find((p) => p.id === "stuff");
    expect(stuff?.contributions.some((c) => c.source_signal_id === "hitting.P3")).toBe(true);
    expect(r.source_engine_versions.hie).toBe("hie-1.0.0");
  });
});
