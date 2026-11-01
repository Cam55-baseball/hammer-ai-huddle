import { describe, expect, it } from "vitest";
import { resolveWeeklyTemplate } from "../weeklyMicrocycle";

// Owner Nov 1 round 2: lifts follow only written rules. Full body only, no
// heavy/dynamic/strength/repetition split labels, and lift days respect the
// written spacing law (at least 2 full days between lifts; in-season max 2).
const phases = ["off", "pre", "in", "post", null] as const;

describe("written lift week", () => {
  for (const seasonPhase of phases) for (const lifecycleBand of ["adult", "u12"]) {
    it(`${seasonPhase ?? "unknown"} ${lifecycleBand}: full body, spaced, no unwritten split`, () => {
      const t = resolveWeeklyTemplate({ seasonPhase, lifecycleBand, weeklyAvailabilityDays: 6 } as any);
      const days = [...(t.perModality.strength ?? [])].sort((a, b) => a - b);
      expect(days.length).toBeLessThanOrEqual(2);
      for (let i = 1; i < days.length; i++) expect(days[i] - days[i - 1] - 1).toBeGreaterThanOrEqual(2);
      for (const label of Object.values(t.dayLabels?.strength ?? {})) {
        expect(label).toBe("Full-body lift");
      }
    });
  }
});
