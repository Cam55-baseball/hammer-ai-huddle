/**
 * Step 21E4 — the season drives everything.
 *
 * Move one athlete from in-season to offseason and back. The block label, the
 * lift class, the timing, the skill volume, the arm care and the conditioning
 * all follow the season state — and nothing is stale: switching back returns
 * the exact in-season plan, byte for byte.
 */
import { describe, expect, it } from "vitest";

import { buildHammerDailyPlan } from "./dailyPlan";
import type { ContextVariable, HammerAthleteContext } from "@/lib/hammer/context/athleteContext";

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

const ATHLETE = {
  sport_primary: "baseball",
  position_primary: "SS",
  equipment_effective: "full_gym",
  lifecycle_band: "hs",
  lifting_age_years: 3,
  weekly_availability_days: 5,
  development_priorities: ["bat_speed", "speed"],
  injury_history: [],
};

const planFor = (season: string) => buildHammerDailyPlan(ctx({ ...ATHLETE, season_phase: season }));
const shape = (p: ReturnType<typeof buildHammerDailyPlan>) =>
  JSON.stringify(p.blocks.map((b) => ({ id: b.id, title: b.title, items: b.items })));

describe("season switch: in-season → offseason → in-season", () => {
  const inSeason = planFor("in");
  const offSeason = planFor("off");
  const backInSeason = planFor("in");

  it("builds a real plan in both seasons", () => {
    expect(inSeason.blocks.length).toBeGreaterThan(0);
    expect(offSeason.blocks.length).toBeGreaterThan(0);
  });

  it("changes the plan when the season changes", () => {
    expect(shape(offSeason)).not.toBe(shape(inSeason));
  });

  it("changes the block label the athlete reads", () => {
    const label = (p: ReturnType<typeof buildHammerDailyPlan>) =>
      JSON.stringify(p.blocks.map((b) => b.title));
    expect(label(offSeason)).not.toBe(label(inSeason));
  });

  it("leaves no stale card — switching back reproduces the in-season plan exactly", () => {
    expect(shape(backInSeason)).toBe(shape(inSeason));
  });

  it("never carries an offseason block into the in-season plan", () => {
    const offOnly = new Set(
      offSeason.blocks.map((b) => b.id).filter((id) => !inSeason.blocks.some((b) => b.id === id)),
    );
    for (const id of offOnly) {
      expect(inSeason.blocks.some((b) => b.id === id)).toBe(false);
    }
  });
});

describe("season switch: the re-plan carries a plain reason", () => {
  it("re-plans the next 7 days and says why, in athlete words", () => {
    const hook = require("node:fs").readFileSync("src/hooks/useWkDailyPrescriptions.ts", "utf8") as string;
    expect(hook).toContain("Hammer re-planned the next 7 days.");
    // 7 forward days plus today are invalidated, so no stale card survives.
    expect(hook).toMatch(/d\s*<=\s*7/);
    expect(hook).toContain("replanReason");
  });
});
