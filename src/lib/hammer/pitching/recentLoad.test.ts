import { describe, it, expect } from "vitest";
import { aggregateRecentPitchingLoad } from "./recentLoad";

describe("aggregateRecentPitchingLoad", () => {
  it("counts bullpen pitches found by movement_slug (no template_id column)", () => {
    const r = aggregateRecentPitchingLoad([
      { plan_date: "2026-10-10", movement_slug: "bullpen_pitching", metrics: { rounds: [{ pitches: 20 }, { pitches: 15 }] } },
      { plan_date: "2026-10-11", movement_slug: "pitching_outing", metrics: { rounds: [{ pitches: 40 }] } },
      { plan_date: "2026-10-11", movement_slug: "long_toss", metrics: { rounds: [{ reps: 30 }] } },
    ]);
    expect(r.weeklyTotal).toBe(75);
    expect(r.byDate["2026-10-10"]).toBe(35);
    expect(r.lastOuting?.template).toBe("pitching_outing");
  });
});
