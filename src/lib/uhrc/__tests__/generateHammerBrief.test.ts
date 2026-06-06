import { describe, it, expect } from "vitest";
import { generateHammerBrief } from "../generateHammerBrief";
import { buildUhrcReport } from "../buildReport";
import { PIE_V2_ENGINE_VERSION, type PieV2SessionAggregate } from "@/lib/pieV2/types";

function tinyAgg(): PieV2SessionAggregate {
  return {
    session_id: "s1",
    athlete_id: "a1",
    computed_at: "2026-06-06T00:00:00.000Z",
    engine_version: PIE_V2_ENGINE_VERSION,
    pie_v2_composite: 60,
    athlete_reported_pain_in_session: false,
    signals: [
      { signal_id: "energy_angle", sample_count: 3, missing_count: 0, average: 85, best: 90, worst: 80, variance: 10, consistency: 85, tier: "clean", confidence: { score: 80, basis: "manual_aggregate" }, tracked_only: false, fatigue_slope: 0 },
      { signal_id: "separation", sample_count: 3, missing_count: 0, average: 35, best: 45, worst: 25, variance: 80, consistency: 40, tier: "critical", confidence: { score: 75, basis: "manual_aggregate" }, tracked_only: false, fatigue_slope: -0.4 },
    ] as PieV2SessionAggregate["signals"],
  };
}

describe("generateHammerBrief", () => {
  it("derives priority_fix from worst contribution and biggest_win from best, with full evidence", () => {
    const uhrc = buildUhrcReport({ athlete_id: "a1", disciplines: ["pitching"], pieV2Latest: tinyAgg() });
    const brief = generateHammerBrief({
      uhrc,
      recommendations: {
        drill: { id: "d1", name: "Separation patterning", rationale: "addresses separation", source_signal_id: "separation" },
        video: { id: "v1", title: "Separation demo", rationale: "demo", source_signal_id: "separation" },
      },
      trends: [{ source_signal_id: "separation", trend: "regressing", slope: -0.4 }],
    });
    expect(brief.priority_fix.source_signal_id).toBe("separation");
    expect(brief.biggest_win.source_signal_id).toBe("energy_angle");
    expect(brief.trend.direction).toBe("regressing");
    // Every field has evidence.
    const fields = new Set(brief.evidence.map((e) => e.field));
    ["biggest_win", "biggest_leak", "priority_fix", "why_it_matters", "drill", "video", "trend"].forEach((f) =>
      expect(fields.has(f as any)).toBe(true),
    );
    expect(brief.engine_version).toBe(uhrc.engine_version);
  });

  it("degrades gracefully when no contributions are present", () => {
    const uhrc = buildUhrcReport({ athlete_id: "a1", disciplines: ["pitching"] });
    const brief = generateHammerBrief({
      uhrc,
      recommendations: { drill: null, video: null },
      trends: [],
    });
    expect(brief.priority_fix.headline).toMatch(/hold the pattern/i);
    expect(brief.drill).toBeNull();
    expect(brief.video).toBeNull();
  });
});
