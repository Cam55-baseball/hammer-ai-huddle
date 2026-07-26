import { describe, expect, it } from "vitest";
import { buildHammerDailyPlan } from "./dailyPlan";
import type { HammerAthleteContext, ContextVariable } from "@/lib/hammer/context/athleteContext";

function variable(key: string, value: unknown): ContextVariable {
  const missing = value == null || value === "";
  return {
    key,
    label: key,
    domain: "identity",
    value: missing ? null : value,
    source: "test",
    confidence: missing ? "missing" : "high",
    missing,
    lastUpdated: null,
    lineage: { owner: "test", source: "test", rawConfidence: missing ? "missing" : "high" },
  };
}

function ctx(values: Record<string, unknown>): HammerAthleteContext {
  const variables = Object.entries(values).map(([key, value]) => variable(key, value));
  return {
    variables,
    missing: variables.filter((v) => v.missing),
    isLoading: false,
    missingCount: variables.filter((v) => v.missing).length,
    envelope: null,
    get<T = unknown>(key: string) {
      return variables.find((v) => v.key === key) as ContextVariable<T> | undefined;
    },
  };
}

describe("buildHammerDailyPlan position normalization", () => {
  it("builds without throwing when Hammers Today position values are arrays or objects", () => {
    const context = ctx({
      sport_primary: "baseball",
      position_primary: { value: ["SS", { code: "P" }] },
      position_secondary: ["2B", { label: "RP" }],
      equipment_effective: "bodyweight",
      lifecycle_band: "u14",
      season_phase: "in",
      lifting_age_years: 1,
      weekly_availability_days: 6,
      development_priorities: ["throwing", "speed"],
      injury_history: [],
    });

    expect(() => buildHammerDailyPlan(context)).not.toThrow();
    expect(buildHammerDailyPlan(context).blocks.length).toBeGreaterThan(0);
  });
});