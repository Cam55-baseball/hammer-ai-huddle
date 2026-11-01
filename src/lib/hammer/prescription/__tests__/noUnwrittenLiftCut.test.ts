import { describe, expect, it } from "vitest";
import { resolveWeeklyTemplate } from "../weeklyMicrocycle";

// Owner Nov 1 round 4, item 3: no unwritten 60% ("secondary") lift cut for youth,
// post-season or in-season. Written youth safety rules live elsewhere and stay.
describe("no unwritten lift cut", () => {
  for (const seasonPhase of ["off", "pre", "in", "post", null] as const) {
    for (const lifecycleBand of ["adult", "u12", "youth", "u14"]) {
      it(`${seasonPhase ?? "unknown"} ${lifecycleBand}`, () => {
        const t = resolveWeeklyTemplate({ seasonPhase, lifecycleBand, weeklyAvailabilityDays: 6 } as any);
        const overrides = Object.values(t.intensityOverrides?.strength ?? {});
        expect(overrides).not.toContain("secondary");
      });
    }
  }
});
