/**
 * INPUT-INTEGRITY LAW regression tests.
 *
 * A Today card may never render as a request for information, and it may
 * never render empty. Every card must prescribe, and state its assumption
 * when part of the athlete's context is missing.
 */
import { describe, expect, it } from "vitest";
import { buildHammerDailyPlan } from "./dailyPlan";
import type { HammerAthleteContext, ContextVariable } from "@/lib/hammer/context/athleteContext";
import type { ScheduleSignal } from "@/lib/hammer/prescription/scheduleContext";

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

const NO_EQUIPMENT_NO_HISTORY = ctx({
  sport_primary: "baseball",
  position_primary: "SS",
  equipment_effective: null,
  lifecycle_band: "u18",
  season_phase: "in",
  lifting_age_years: null,
  weekly_availability_days: 6,
  development_priorities: ["hitting", "defense"],
  injury_history: [],
});

const gameDay = (posture: "game" | "tournament"): ScheduleSignal =>
  ({
    postureToday: posture,
    rationale: "You have a game today.",
  }) as unknown as ScheduleSignal;

describe("no card renders as a request for information", () => {
  it("hitting prescribes with a stated assumption when equipment is unknown", () => {
    const plan = buildHammerDailyPlan(NO_EQUIPMENT_NO_HISTORY);
    const hitting = plan.blocks.find((b) => b.modality === "hitting");
    expect(hitting).toBeTruthy();
    // Never a request for information...
    expect(hitting!.status).not.toBe("awaiting-input");
    // ...and never blank: either prescribed work, or an explained rest day.
    expect(hitting!.drills.length + hitting!.steps.length).toBeGreaterThan(0);
    if (hitting!.status === "ready") {
      expect(hitting!.drills.length).toBeGreaterThan(0);
      expect(hitting!.assumption).toMatch(/assuming/i);
    }
  });

  it("strength prescribes a conservative session when lifting history is unknown", () => {
    const plan = buildHammerDailyPlan(NO_EQUIPMENT_NO_HISTORY);
    const strength = plan.blocks.find((b) => b.modality === "strength");
    expect(strength).toBeTruthy();
    expect(strength!.status).not.toBe("awaiting-input");
    expect(strength!.drills.length + strength!.steps.length).toBeGreaterThan(0);
    if (strength!.status === "ready") {
      expect(strength!.drills.length).toBeGreaterThan(0);
      expect(strength!.assumption).toMatch(/assuming/i);
    }
  });

  it("never leaks a raw context identifier into athlete-facing copy", () => {
    const plan = buildHammerDailyPlan(NO_EQUIPMENT_NO_HISTORY);
    for (const b of plan.blocks) {
      const copy = `${b.title} ${b.why} ${b.roadmapReason} ${b.assumption ?? ""}`;
      expect(copy).not.toMatch(/equipment_effective|lifting_history|position_primary|_effective\b/);
    }
  });
});

describe("training-day cards (microcycle scheduled)", () => {
  // Pick dates until we hit a day the microcycle schedules hitting + strength,
  // so we assert the real prescription rather than the explained rest day.
  function firstScheduled(modality: "hitting" | "strength") {
    for (let i = 0; i < 14; i += 1) {
      const day = new Date(Date.UTC(2026, 5, 1 + i, 12));
      const plan = buildHammerDailyPlan(NO_EQUIPMENT_NO_HISTORY, undefined, null, null, undefined, day);
      const block = plan.blocks.find((b) => b.modality === modality);
      if (block && block.status === "ready") return block;
    }
    return null;
  }

  it("hitting prescribes on a stated assumption on a scheduled day", () => {
    const hitting = firstScheduled("hitting");
    expect(hitting).toBeTruthy();
    expect(hitting!.drills.length).toBeGreaterThan(0);
    expect(hitting!.assumption).toMatch(/assuming/i);
  });

  it("strength prescribes a conservative session on a scheduled day", () => {
    const strength = firstScheduled("strength");
    expect(strength).toBeTruthy();
    expect(strength!.drills.length).toBeGreaterThan(0);
    expect(strength!.assumption).toMatch(/assuming/i);
  });
});

describe("game-day defense", () => {
  it("renders a pregame primer with drills instead of disappearing", () => {
    const plan = buildHammerDailyPlan(
      NO_EQUIPMENT_NO_HISTORY,
      gameDay("game"),
      null,
      null,
      undefined,
      new Date("2026-06-10T12:00:00Z"),
    );
    const defense = plan.blocks.find((b) => b.modality === "defense");
    expect(defense).toBeTruthy();
    expect(defense!.gameDayPrimer).toBe(true);
    expect(defense!.drills.length).toBeGreaterThan(0);
    expect(defense!.why).toMatch(/save your legs|saved for the games/i);
  });

  it("runs full defense when the athlete overrides", () => {
    const plan = buildHammerDailyPlan(
      NO_EQUIPMENT_NO_HISTORY,
      gameDay("game"),
      null,
      null,
      undefined,
      new Date("2026-06-10T12:00:00Z"),
      { defenseFullOverride: true },
    );
    const defense = plan.blocks.find((b) => b.modality === "defense");
    expect(defense!.gameDayPrimer).toBeFalsy();
    expect(defense!.drills.length).toBeGreaterThan(0);
    expect(defense!.why).toMatch(/full defense anyway/i);
  });
});
