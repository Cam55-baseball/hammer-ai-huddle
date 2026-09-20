// v1.2 §B3 — onboarding and one-timeline tests. Pure code, no DB, no clock.

import { describe, expect, it } from "vitest";
import {
  ARC,
  addDays,
  layoutArc,
  onRampFor,
  replanNextSevenDays,
  resolveOffDays,
  resolveOnboarding,
  seedHistory,
  seedTanks,
  type OnboardingInput,
  type RecentTraining,
} from "../../../supabase/functions/_shared/wic/schedule/timeline/index.ts";
import { TCS_CONFIG } from "../../../supabase/functions/_shared/wic/schedule/tissueCost/config.ts";
import type { DaySchedule } from "../../../supabase/functions/_shared/wic/schedule/tissueCost/types.ts";

const MODERATE: RecentTraining = {
  overall: "moderate",
  liftingDaysPerWeek: 3,
  throwingStatus: "long_toss",
  practicesPerWeek: 4,
  daysSinceLastLoadedLift: 2,
};

function onboarding(over: Partial<OnboardingInput> = {}): OnboardingInput {
  return {
    asOf: "2026-01-05",
    anchor: { phase: "offseason", daysIntoPhase: 0 },
    recent: MODERATE,
    ...over,
  };
}

describe("v1.2 §B1.1 — where you are now", () => {
  it("back-calculates from days into the phase", () => {
    const r = resolveOnboarding(onboarding({ anchor: { phase: "offseason", daysIntoPhase: 30 } }));
    expect(r.phaseStartDate).toBe("2025-12-06");
    expect(r.daysIntoPhase).toBe(30);
    expect(r.currentBlock).toBe("Absorb");
  });

  it("back-calculates from the phase start date", () => {
    const r = resolveOnboarding(
      onboarding({ anchor: { phase: "offseason", phaseStartDate: "2025-12-06" } }),
    );
    expect(r.phaseStartDate).toBe("2025-12-06");
    expect(r.daysIntoPhase).toBe(30);
  });

  it("back-calculates from the block name", () => {
    const r = resolveOnboarding(
      onboarding({ anchor: { phase: "offseason", blockName: "Speed & Power" } }),
    );
    expect(r.currentBlock).toBe("Speed & Power");
    expect(r.dayInBlock).toBe(1);
  });

  it("mid-season onboarding lands the right block and day", () => {
    const r = resolveOnboarding(
      onboarding({ asOf: "2026-05-20", anchor: { phase: "in_season", daysIntoPhase: 45 } }),
    );
    expect(r.phase).toBe("in_season");
    expect(r.daysIntoPhase).toBe(45);
    // Build the Base is days 1–28, Absorb 29–49; day 46 sits in Absorb.
    expect(r.currentBlock).toBe("Absorb");
    expect(r.dayInBlock).toBe(18);
  });
});

describe("v1.2 §B1.3 — planned off days", () => {
  it("spreads a bare count and keeps explicit dates", () => {
    const dates = resolveOffDays("2026-01-05", { count: 3, dates: ["2026-03-02"] });
    expect(dates).toContain("2026-03-02");
    expect(dates.length).toBe(4);
    expect([...dates].sort()).toEqual(dates);
  });

  it("stretches the arc instead of compressing a block below its minimum", () => {
    const off: string[] = [];
    for (let i = 1; i <= 14; i++) off.push(addDays("2026-01-12", i));
    const arc = layoutArc("2026-01-05", off);
    for (const b of arc) {
      expect(b.workingDays).toBeGreaterThanOrEqual(b.minimumDays);
      expect(b.workingDays).toBe(ARC.find((s) => s.name === b.name)!.nominalDays);
    }
    // The arc got longer in calendar days, it did not lose loadable days.
    const plain = layoutArc("2026-01-05", []);
    expect(arc[arc.length - 1].endDate > plain[plain.length - 1].endDate).toBe(true);
  });

  it("an off day never leaves a card empty and never breaks the rest-day floor", () => {
    const history: DaySchedule[] = [{ date: "2026-01-05", lift: { class: "H" } }];
    const r = replanNextSevenDays({
      today: "2026-01-06",
      profile: { phase: "offseason", trainingAgeBand: "intermediate", age: 17 },
      history,
      calendar: [],
      offDayDates: ["2026-01-07", "2026-01-08"],
      change: { kind: "off_day_added", date: "2026-01-07" },
    });
    expect(r.days).toHaveLength(7);
    for (const d of r.days) expect(d.reason.length).toBeGreaterThan(0);
    const off = r.days.filter((d) => d.slot === "off");
    expect(off).toHaveLength(2);
    for (const d of off) expect(d.class).toBeNull();
    // No heavy day inside the 3 full rest days after Monday's H.
    for (const d of r.days.filter((x) => x.date <= "2026-01-08")) expect(d.class).not.toBe("H");
  });
});

describe("v1.2 §B1.4–B1.5 — last four weeks and the on-ramp", () => {
  it("seeds 28 days of history and non-zero tanks", () => {
    const days = seedHistory("2026-01-05", MODERATE);
    expect(days).toHaveLength(28);
    expect(days[0].date).toBe("2025-12-08");
    expect(days[27].date).toBe("2026-01-04");
    const levels = seedTanks(onboarding());
    expect(levels.nerve).toBeGreaterThan(0);
    expect(levels.muscle).toBeGreaterThan(0);
  });

  it("a late joiner with no history seeds empty tanks and gets an on-ramp", () => {
    const recent: RecentTraining = {
      overall: "none",
      liftingDaysPerWeek: 0,
      throwingStatus: "not_throwing",
      practicesPerWeek: 0,
      daysSinceLastLoadedLift: null,
    };
    const r = resolveOnboarding(onboarding({ recent }));
    expect(r.onRampDays).toBe(TCS_CONFIG.onRamp.windowDays);
    expect(r.onRampCap).toBe(TCS_CONFIG.onRamp.cap);
    const levels = seedTanks(onboarding({ recent }));
    expect(levels.nerve).toBe(0);
    expect(levels.muscle).toBe(0);
  });

  it("matches the Step 5 TCS on-ramp cap exactly", () => {
    const base = { ...MODERATE, overall: "heavy" as const };
    expect(onRampFor("2026-01-05", { ...base, daysSinceLastLoadedLift: 13 }).days).toBe(0);
    expect(onRampFor("2026-01-05", { ...base, daysSinceLastLoadedLift: 14 }).days).toBe(
      TCS_CONFIG.onRamp.windowDays,
    );
    expect(onRampFor("2026-01-05", { ...base, daysSinceLastLoadedLift: 40 }).days).toBe(
      TCS_CONFIG.onRamp.longWindowDays,
    );
    expect(onRampFor("2026-01-05", { ...base, daysSinceLastLoadedLift: 40 }).until).toBe(
      addDays("2026-01-05", TCS_CONFIG.onRamp.longWindowDays - 1),
    );
  });

  it("a pro joining mid-offseason with heavy recent training gets no on-ramp and a real block", () => {
    const pro: RecentTraining = {
      overall: "heavy",
      liftingDaysPerWeek: 4,
      throwingStatus: "bullpens",
      practicesPerWeek: 5,
      daysSinceLastLoadedLift: 1,
    };
    const input = onboarding({
      anchor: { phase: "offseason", daysIntoPhase: 56 },
      recent: pro,
      offDays: { count: 10 },
    });
    const r = resolveOnboarding(input);
    expect(r.onRampDays).toBe(0);
    expect(r.onRampCap).toBeNull();
    expect(r.currentBlock).toBe("Sport Ramp");
    expect(r.offDayDates).toHaveLength(10);
    for (const b of r.arc) expect(b.workingDays).toBeGreaterThanOrEqual(b.minimumDays);
    const levels = seedTanks(input);
    expect(levels.muscle).toBeGreaterThan(0);
  });
});

describe("v1.2 §B2 — one timeline re-plans the next 7 days", () => {
  const profile = { phase: "offseason" as const, trainingAgeBand: "advanced" as const, age: 20 };

  it("a rainout re-plan gives 7 days and a reason", () => {
    const r = replanNextSevenDays({
      today: "2026-01-06",
      profile,
      history: [{ date: "2026-01-05", lift: { class: "H" } }],
      calendar: [],
      change: { kind: "game_cancelled", date: "2026-01-07" },
    });
    expect(r.days).toHaveLength(7);
    expect(r.changeReason).toMatch(/^Game off Wednesday/);
  });

  it("a game added pushes the heavy day and says so", () => {
    const r = replanNextSevenDays({
      today: "2026-01-06",
      profile,
      history: [{ date: "2026-01-05", lift: { class: "H" } }],
      calendar: [{ date: "2026-01-08", games: { role: "position", count: 1 } }],
      change: { kind: "game_added", date: "2026-01-08" },
      previousHeavyDate: "2026-01-08",
    });
    expect(r.changeReason).toContain("Game added Thursday");
    const heavy = r.days.find((d) => d.class === "H");
    if (heavy) expect(heavy.date).not.toBe("2026-01-08");
  });

  it("travel across time zones does not change the plan for the same local dates", () => {
    const args = {
      today: "2026-01-06",
      profile,
      history: [{ date: "2026-01-05", lift: { class: "H" as const } }],
      calendar: [{ date: "2026-01-07", travel: true }],
    };
    const utc = replanNextSevenDays({ ...args, timezone: "UTC" });
    const la = replanNextSevenDays({ ...args, timezone: "America/Los_Angeles" });
    expect(la.days.map((d) => [d.date, d.class])).toEqual(utc.days.map((d) => [d.date, d.class]));
  });

  it("is deterministic — same inputs, same plan", () => {
    const args = {
      today: "2026-01-06",
      profile,
      history: [{ date: "2026-01-05", lift: { class: "M" as const } }],
      calendar: [],
    };
    expect(replanNextSevenDays(args)).toEqual(replanNextSevenDays(args));
  });
});
