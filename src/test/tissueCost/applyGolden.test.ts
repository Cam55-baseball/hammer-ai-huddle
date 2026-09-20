// Step 11 proof — the golden weeks replayed with the rest-day calculator ON.
//
// Each scenario runs the real decide() and then the real applyDecision(), and
// asserts the plan-level rules Step 11 promises:
//   - the CNS cap only ever moves DOWN, never up, never past the floor
//   - the applied class is never above the phase template's class
//   - a "none" day becomes the recovery-only day and never an empty card
//   - game days say "Do this after the game"; nothing is ever placed before one
// A failure here is reported, never patched by moving a floor or a threshold.

import { describe, expect, it } from "vitest";
import { addDays, decide, TCS_CONFIG } from "./harness.ts";
import {
  applyDecision,
  phaseTemplateClassFor,
} from "../../../supabase/functions/_shared/wic/schedule/tissueCost/apply.ts";
import type {
  AllowedClass,
  DaySchedule,
  Profile,
} from "../../../supabase/functions/_shared/wic/schedule/tissueCost/types.ts";

const TZ = "America/Chicago";
const ORDER: Record<AllowedClass, number> = { none: 0, L: 1, M: 2, H: 3 };

const ADV17: Profile = {
  age: 17,
  growthMode: false,
  trainingAgeBand: "advanced",
  position: "position",
  phase: "offseason",
  isStartingPitcher: false,
};
const practice = (date: string, min = 60): DaySchedule => ({
  date,
  practiceMinutes: min,
  practiceIntensity: "moderate",
});
const game = (date: string, extra: Partial<DaySchedule["games"]> = {}): DaySchedule => ({
  date,
  games: { role: "position", count: 1, ...extra },
});

function replay(
  profile: Profile,
  days: DaySchedule[],
  today: string,
  generatorPhase: string,
  baseCap = 4,
) {
  const d = decide(
    profile,
    days.filter((x) => x.date < today),
    days.filter((x) => x.date >= today),
    [],
    TCS_CONFIG,
    today,
    TZ,
  );
  const templateClass = phaseTemplateClassFor(generatorPhase);
  const capped: AllowedClass =
    ORDER[d.allowedClass] > ORDER[templateClass] ? templateClass : d.allowedClass;
  const isGameDay = days.some((x) => x.date === today && (x.games?.count ?? 0) > 0);
  const applied = applyDecision({
    allowedClass: capped,
    timing: d.timing,
    nextHeavyDate: d.nextHeavyDate,
    reasons: d.reasons,
    fallbackUsed: d.fallbackUsed === true,
    blockCnsCap: baseCap,
    isGameDay,
    planDate: today,
  });
  return { decision: d, applied, templateClass, isGameDay };
}

function assertCommonLaws(r: ReturnType<typeof replay>, baseCap = 4) {
  expect(r.applied.cnsCap).toBeLessThanOrEqual(baseCap);
  expect(r.applied.cnsCap).toBeGreaterThanOrEqual(1);
  expect(ORDER[r.applied.allowedClass]).toBeLessThanOrEqual(ORDER[r.templateClass]);
  expect(r.applied.reasons.length).toBeGreaterThanOrEqual(1);
  expect(r.applied.reasons.length).toBeLessThanOrEqual(2);
  if (r.applied.allowedClass === "none") {
    expect(r.applied.recoveryOnly).toBe(true);
    expect(r.applied.removeLift).toBe(true);
  }
  if (r.isGameDay && !r.applied.recoveryOnly) {
    expect(r.applied.timing).toBe("post_game");
    expect(r.applied.timingNote).toBe("Do this after the game");
  }
}

describe("Step 11 — golden weeks through the real apply layer", () => {
  it("REF-OFF: offseason heavy week", () => {
    const days = [
      { ...practice("2026-01-05"), lift: { class: "H" as const, method: "standard" as const } },
      practice("2026-01-06"),
      { ...practice("2026-01-07", 90), practiceIntensity: "high" as const },
      practice("2026-01-08"),
      practice("2026-01-09"),
    ];
    for (const d of days) {
      const r = replay(ADV17, days, d.date, "os_q1");
      assertCommonLaws(r);
    }
    const friday = replay(ADV17, days, "2026-01-09", "os_q1");
    expect(friday.applied.nextHeavyChip).toBe("Next heavy day: Saturday");
  });

  it("MLB 6-game week", () => {
    const p = { ...ADV17, phase: "in_season" as const, trainingAgeBand: "professional" as const, age: 24 };
    const days = [
      { ...game("2026-06-01"), lift: { class: "H" as const, method: "standard" as const } },
      game("2026-06-02"),
      game("2026-06-03"),
      game("2026-06-04"),
      game("2026-06-05"),
      game("2026-06-06"),
    ];
    for (const d of days) {
      const r = replay(p, days, d.date, "in_season", 2);
      assertCommonLaws(r, 2);
      // In season the template ceiling is M — no heavy day can ever be built.
      expect(r.applied.allowedClass).not.toBe("H");
    }
  });

  it("starting pitcher on a 5-day rotation", () => {
    const p = {
      ...ADV17,
      phase: "in_season" as const,
      position: "starting_pitcher" as const,
      isStartingPitcher: true,
    };
    const days: DaySchedule[] = [];
    for (let i = 0; i < 12; i++) {
      const date = addDays("2026-05-01", i);
      days.push(
        i % 5 === 0
          ? { ...game(date), games: { role: "starting_pitcher", count: 1 }, pitcherStartDay: true }
          : { date, practiceMinutes: 60, practiceIntensity: "moderate" },
      );
    }
    for (const d of days) {
      const r = replay(p, days, d.date, "in_season", 2);
      assertCommonLaws(r, 2);
    }
    const startDay = replay(p, days, "2026-05-01", "in_season", 2);
    expect(startDay.applied.allowedClass).toBe("none");
    expect(startDay.applied.recoveryOnly).toBe(true);
  });

  it("travel-ball tournament weekend", () => {
    const p = { ...ADV17, phase: "in_season" as const };
    const days = [
      game("2026-07-10", { tournament: true }),
      game("2026-07-11", { tournament: true, count: 2 }),
      game("2026-07-12", { tournament: true }),
    ];
    for (const d of days) {
      const r = replay(p, days, d.date, "in_season", 2);
      assertCommonLaws(r, 2);
      expect(r.applied.allowedClass).toBe("none");
      expect(r.applied.recoveryOnly).toBe(true);
      expect(r.applied.timingNote).toBe("Recovery work — do it whenever it fits today.");
    }
  });

  it("on-ramp: a first week back never builds above the template", () => {
    const p = { ...ADV17, trainingAgeBand: "beginner" as const, age: 14 };
    const days = [
      practice("2026-02-02"),
      practice("2026-02-03"),
      practice("2026-02-04"),
      practice("2026-02-05"),
      practice("2026-02-06"),
    ];
    for (const d of days) {
      const r = replay(p, days, d.date, "os_q3", 3);
      assertCommonLaws(r, 3);
      expect(r.applied.cnsCap).toBeLessThanOrEqual(3);
    }
  });
});
