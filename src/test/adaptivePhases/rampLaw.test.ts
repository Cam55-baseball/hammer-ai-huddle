// Ramp Law v1 §6 — docs/wic/ramp-law-v1.md
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import {
  rampLength, rampSteps, advance, throwingBreakDays, throwingBuild, maxThrowStreak, placeRamp, squeeze, activeRamps,
  personalFactor, RAMP_DISCIPLINES, rampLine, stepTolerance, type RampProfile,
} from "../../../supabase/functions/_shared/wic/phases/rampLaw";
import { highIntentUnlocked } from "../../../supabase/functions/_shared/wic/phases/armReadiness";
import { planAthlete } from "../../../supabase/functions/_shared/wic/phases/adaptivePhases";
import { PhaseStripView } from "@/components/hammer/AdaptivePhaseStrip";

const adult: RampProfile = { age: 20, isPitcher: false, growthMode: false, painLast90: {}, firstTime: {}, eliteClean: false };
const pitcher: RampProfile = { ...adult, isPitcher: true };

describe("Ramp Law v1 §6", () => {
  it("8 days off throwing → 16-day ramp; 2 → none; 5 → 3 to 4", () => {
    expect(rampLength("throwing", 8, adult).days).toBe(16);
    expect(rampLength("throwing", 2, adult).days).toBe(0);
    const five = rampLength("throwing", 5, adult).days;
    expect(five).toBeGreaterThanOrEqual(3);
    expect(five).toBeLessThanOrEqual(4);
  });

  it("a 4-month offseason opens with ≥16 no-throw days, more when the age rule is longer", () => {
    expect(throwingBreakDays(120, 17).days).toBeGreaterThanOrEqual(16);
    expect(throwingBreakDays(120, 20).days).toBe(28);
    expect(throwingBreakDays(120, 13).days).toBe(60);
    expect(throwingBreakDays(120, 13).rule).toBe("age");
  });

  it("a 120-day layoff gives a pitcher a 6 to 8 week build, never 240 days", () => {
    const d = rampLength("throwing", 120, pitcher).days;
    expect(d).toBeGreaterThanOrEqual(42);
    expect(d).toBeLessThanOrEqual(56);
    const young = rampLength("throwing", 120, { ...pitcher, age: 14 }).days;
    expect(young).toBeLessThanOrEqual(56);
    expect(rampLength("throwing", 120, adult).days).toBeLessThanOrEqual(35);
  });

  it("a failed pain or soreness gate repeats the step", () => {
    expect(advance(2, { painFree: true, soreness: 1 }, 8)).toEqual({ step: 3, repeated: false });
    expect(advance(2, { painFree: false, soreness: 1 }, 8).step).toBe(2);
    expect(advance(2, { painFree: true, soreness: 5 }, 8).step).toBe(2);
    expect(advance(2, { painFree: true, soreness: null }, 8).step).toBe(2);
  });

  it("steps: one variable at a time, ≥48h apart, distance before volume before intent", () => {
    for (const days of [3, 4, 7, 16, 28, 42, 56]) {
      const s = rampSteps(days, days <= 4 ? "short" : days <= 28 ? "doubling" : "structured");
      for (let i = 1; i < s.length; i++) {
        expect(s[i].day - s[i - 1].day).toBeGreaterThanOrEqual(2);
        const ch = [s[i].distancePct !== s[i - 1].distancePct, s[i].volumePct !== s[i - 1].volumePct, s[i].intentPct !== s[i - 1].intentPct].filter(Boolean).length;
        expect(ch).toBe(1);
      }
      const order = s.map((x) => x.changes).join(",");
      expect(order).toMatch(/^(distance,?)+(volume,?)*(intent,?)*$/);
      expect(s[s.length - 1].day).toBeLessThan(days);
      if (days <= 4) expect(Math.max(...s.map((x) => x.intentPct))).toBeLessThanOrEqual(80);
      const full = s.find((x) => x.intentPct === 100);
      if (full) expect(full.distancePct).toBe(100);
    }
  });

  it("no young athlete throws on consecutive days early in a build; nobody throws three in a row", () => {
    for (const age of [12, 14, 15, null]) {
      const b = throwingBuild(56, "structured", age, true);
      for (let i = 1; i < 14; i++) expect(b[i].kind !== "rest" && b[i - 1].kind !== "rest").toBe(false);
      expect(maxThrowStreak(b)).toBeLessThanOrEqual(2);
    }
    for (const age of [17, 20, 30]) for (const days of [4, 16, 35, 56]) expect(maxThrowStreak(throwingBuild(days, days > 28 ? "structured" : "doubling", age, true))).toBeLessThanOrEqual(2);
    const p = throwingBuild(56, "structured", 20, true);
    const firstNonCatch = p.findIndex((d) => d.kind === "flat" || d.kind === "mound");
    expect(firstNonCatch).toBeGreaterThanOrEqual(14);
    expect([...p].reverse().find((d) => d.kind !== "rest")?.kind).toBe("mound");
  });

  it("high-intent throwing stays locked until the build plus two clean weeks", () => {
    expect(highIntentUnlocked({ rampComplete: false, cleanHighIntentWeeks: 3 })).toBe(false);
    expect(highIntentUnlocked({ rampComplete: true, cleanHighIntentWeeks: 1 })).toBe(false);
    expect(highIntentUnlocked({ rampComplete: true, cleanHighIntentWeeks: 2 })).toBe(true);
  });

  it("every discipline's ramp appears in the day plan and the drawer, and never lands on a game", () => {
    const games = ["2026-10-04", "2026-10-11"];
    const gap = Object.fromEntries(RAMP_DISCIPLINES.map((d) => [d, { daysOff: 12, returnedOn: "2026-10-01" }]));
    const plan = planAthlete({ today: "2026-10-05", seasonState: "in_season", lastGameDate: "2026-10-04", hardDate: "2026-10-11", hardDateIsGame: true, yearRound: true, offDaysInWindow: 0, holdToday: false, weeksIntoSeason: 3, records: [], need: { goal: null, openPain: false }, rampGap: gap, rampProfile: adult, gameDates: games } as any);
    expect(plan.ramps?.map((r) => r.discipline).sort()).toEqual([...RAMP_DISCIPLINES].sort());
    for (const r of plan.ramps!) for (const g of games) expect(r.placed.dates).not.toContain(g);
    const onGame = activeRamps({ today: "2026-10-04", gap, profile: adult, gameDates: games });
    expect(onGame).toHaveLength(0);
    render(React.createElement(PhaseStripView, { plan: { ...plan, phaseName: "Game-Ready Production" } as any, open: false, onToggle: () => {} }));
    expect(screen.getAllByTestId("ramp-line")).toHaveLength(RAMP_DISCIPLINES.length);
    expect(rampLine("throwing", 5, 16)).toBe("Throwing build, day 6 of 16 — distance first, intent later.");
    const placed = placeRamp("throwing", "2026-10-01", 16, games);
    expect(placed.dates).toHaveLength(16);
  });

  it("a calendar squeeze shortens the previous block, never the ramp", () => {
    const s = squeeze(21, 16, 30);
    expect(s.rampDays).toBe(16);
    expect(s.blockDays).toBe(14);
    expect(s.reason).toBeTruthy();
    expect(squeeze(5, 16, 10)).toMatchObject({ rampDays: 16, blockDays: 0 });
  });

  it("ramp length changes correctly with each personal factor", () => {
    const base = rampLength("lifting", 10, adult).days; // 20
    expect(base).toBe(20);
    for (const p of [{ ...adult, age: 14 }, { ...adult, growthMode: true }, { ...adult, painLast90: { lifting: true } }, { ...adult, firstTime: { lifting: true } }]) {
      expect(rampLength("lifting", 10, p).days).toBe(25);
    }
    // Largest factor only — two factors do not stack.
    expect(rampLength("lifting", 10, { ...adult, age: 14, growthMode: true }).days).toBe(25);
    expect(rampLength("lifting", 10, { ...adult, eliteClean: true }).days).toBe(18);
    // Elite never below the discipline minimum.
    expect(rampLength("lifting", 4, { ...adult, eliteClean: true }).days).toBe(1);
    expect(rampLength("speed", 40, { ...adult, eliteClean: true }).days).toBe(14);
    expect(rampLength("lifting", 3, { ...adult, eliteClean: true }).days).toBe(1);
    expect(personalFactor("speed", { ...adult, eliteClean: true, painLast90: { speed: true } }).factor).toBe(1.25);
  });

  it("other disciplines follow the §3 table", () => {
    expect(rampLength("conditioning", 5, adult).days).toBe(0);
    expect(rampLength("bat_speed", 5, adult).days).toBe(2);
    expect(rampLength("speed", 5, adult).days).toBe(1);
    expect(rampLength("speed", 5, { ...adult, age: 14 }).days).toBe(2);
    expect(rampLength("lifting", 40, adult).days).toBe(14);
    expect(rampLength("lifting", 40, { ...adult, age: 14 }).days).toBe(18);
    expect(rampLength("bat_speed", 40, adult).constraints.join(" ")).toMatch(/overload/);
    expect(rampLength("lifting", 12, adult).constraints).toContain("class capped at Moderate");
    expect(rampLength("jumps", 40, adult).constraints.join(" ")).toMatch(/Tier 1/);
  });

  it("learned tolerance stays within ±20%, moves ≤5% a week, and switches off if worse", () => {
    let t = { version: 0, factor: 1, enabled: true };
    for (let i = 0; i < 40; i++) { const prev = t.factor; t = stepTolerance(t, 3, 6, false); expect(t.factor).toBeLessThanOrEqual(1.2); expect(t.factor / prev).toBeLessThanOrEqual(1.0501); }
    expect(t.version).toBeGreaterThan(0);
    const off = stepTolerance(t, 3, 6, true);
    expect(off).toMatchObject({ enabled: false, factor: 1 });
  });
});
