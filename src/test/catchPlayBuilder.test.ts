import { describe, expect, it } from "vitest";
import { buildHammerDailyPlan } from "@/lib/hammer/prescription/dailyPlan";
import { NORMAL_SIGNAL } from "@/lib/hammer/prescription/scheduleContext";
import type { ContextVariable, HammerAthleteContext } from "@/lib/hammer/context/athleteContext";

function ctx(values: Record<string, unknown>): HammerAthleteContext {
  const variables = Object.entries(values).map(([key, value]): ContextVariable => ({ key, value, label: key, domain: "identity", source: "test", confidence: "high", missing: false, lastUpdated: null, lineage: { owner: "test", source: "test", rawConfidence: "high" } }));
  return { variables, missing: [], missingCount: 0, isLoading: false, envelope: null, get<T>(key: string) { return variables.find((r) => r.key === key) as ContextVariable<T> | undefined; } };
}
const gear = ["field", "glove", "ball", "bands", "partner", "net", "bucket"];
describe("actual builder: position-player catch play in throws (Part B)", () => {
  for (const sport of ["baseball", "softball"] as const) for (const age of [11, 16, 21, 27]) {
    it(`${sport} age ${age}: no timed catch play, every catch-play row counted, 8 weeks`, () => {
      let seen = 0;
      for (let d = 0; d < 56; d++) {
        const plan = buildHammerDailyPlan(ctx({ sport_primary: sport, position_primary: "SS", season_phase: d < 21 ? "off" : d < 42 ? "pre" : "in", age_years: age, lifecycle_band: age < 13 ? "youth" : "college", lifting_age_years: 2, development_priorities: ["throwing"], weekly_availability_days: 6, injury_history: [], equipment_effective: gear }), NORMAL_SIGNAL, null, null, undefined, new Date(2026, 0, 5 + d), { subscriptionModules: [`${sport}_5tool`] });
        const text = JSON.stringify(plan.blocks.map((b) => b.drills.map((x) => [x.name, x.dosage])));
        expect(text).not.toMatch(/Sub-max catch play|catch play[^"]*\d+ min|arm units?/i);
        const rows = plan.blocks.flatMap((b) => b.drills).filter((x) => /^(Catch play|Light catch|Build-up catch|Long toss)/.test(x.name));
        for (const r of rows) expect(r.dosage ?? "").toMatch(/\d+ft x \d+ throws/);
        if (rows.length) seen++;
        if (age < 13) for (const r of rows) expect(Number(/^(\d+)ft/.exec(r.dosage ?? "")?.[1] ?? 0)).toBeLessThanOrEqual(150);
        // Not earned without check-ins and a clip on file: never long toss or arm strength.
        expect(rows.some((r) => /^Long toss/.test(r.name))).toBe(false);
      }
      expect(seen).toBeGreaterThan(0);
    });
  }
});
