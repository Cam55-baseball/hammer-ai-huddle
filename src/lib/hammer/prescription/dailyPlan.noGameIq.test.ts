import { describe, expect, it } from "vitest";
import { buildHammerDailyPlan } from "./dailyPlan";
import type { HammerAthleteContext, ContextVariable } from "@/lib/hammer/context/athleteContext";
import { NORMAL_SIGNAL } from "@/lib/hammer/prescription/scheduleContext";

function ctx(values: Record<string, unknown>): HammerAthleteContext {
  const variables = Object.entries(values).map(([key, value]) => ({ key, label: key, domain: "identity", value, source: "test", confidence: "high", missing: false, lastUpdated: null, lineage: { owner: "test", source: "test", rawConfidence: "high" } }) as unknown as ContextVariable);
  return { variables, missing: [], isLoading: false, missingCount: 0, envelope: null, get: <T,>(k: string) => variables.find((v) => v.key === k) as ContextVariable<T> | undefined };
}

describe("unreleased Game IQ never enters a player's plan", () => {
  for (const season_phase of ["off", "in"]) {
    it(`${season_phase}-season: no Game IQ card on any day of two weeks`, () => {
      const c = ctx({ sport_primary: "baseball", position_primary: "P", lifecycle_band: "u18", season_phase, lifting_age_years: 2, weekly_availability_days: 6, development_priorities: ["pitching"], injury_history: [] });
      for (let i = 0; i < 14; i++) {
        const plan = buildHammerDailyPlan(c, NORMAL_SIGNAL, null, null, undefined, new Date(2026, 5, 1 + i));
        expect(plan.blocks.some((b) => b.modality === "game_iq" || /game iq/i.test(b.title))).toBe(false);
      }
    });
  }
});
