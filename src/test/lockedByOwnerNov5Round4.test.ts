/**
 * LOCKED BY OWNER — Nov 5 round 4, items 1–3: short speed day on the lightest day with the
 * progressive sprint prep, optimized editable in-season numbers, and top-ups that may add a
 * short base-sprint item.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  inSeasonSprintDay, speedEligible, gameCredit, ownBasesPerPa, chanceCredit, inSeasonStandards, topupBases,
  withSprintPrep, sprintPrepOk, SPRINT_PREP, SPRINT_PREP_SLUGS, topupRouteSlug, ADDS_ROW_KINDS, dayLoadScore,
  DEFAULT_IN_SEASON_STANDARDS as D, countsAsRunningSession, weeklyTarget, isHeavyGame,
} from "../../supabase/functions/_shared/wic/conditioning/inSeasonSprints.ts";

const base = { gameToday: false, gameTomorrow: false, yesterdayGame: null, hardYesterday: false, lowReadiness: false, weekBases: 0, weekRunningSessions: 0, speedDoneThisWeek: false, laterSpeedChances: 0, laterTopupChances: 0 };

describe("item 1 — speed day wins, kept short, with sprint prep", () => {
  it("is exactly 3 max-effort sprints with the sprint prep", () => {
    const d = inSeasonSprintDay(20, base);
    expect([d.kind, d.bases, d.maxIntent, d.sprintPrep]).toEqual(["speed", 3, true, true]);
  });
  it("waits for the week's lightest day", () => {
    expect(inSeasonSprintDay(20, { ...base, laterLighterSpeedDays: 1 }).kind).not.toBe("speed");
    expect(dayLoadScore(true, false)).toBeGreaterThan(dayLoadScore(false, true));
  });
  it("never the day after the heaviest game; readiness still cancels", () => {
    const light = { date: "y", bases: 3, source: "log" as const };
    expect(speedEligible({ ...base, yesterdayGame: light, yesterdayWasHeaviestGame: true }, 20)).toBe(false);
    expect(speedEligible({ ...base, yesterdayGame: light, yesterdayWasHeaviestGame: false }, 20)).toBe("ideal");
    expect(inSeasonSprintDay(20, { ...base, lowReadiness: true }).maxIntent).toBe(false);
  });
  it("prep is A-skips/dribbles then build-ups 60 → 75 → 90%", () => {
    expect(SPRINT_PREP_SLUGS).toEqual(["wu_a_skip", "build_up_sprint"]);
    expect(SPRINT_PREP[1].effort).toBe("60% → 75% → 90%");
  });
  it("max sprints get the prep placed before them, or are refused", () => {
    const rows = [{ movement_slug: "lift_x" }, { movement_slug: "repeat_90ft_bb" }];
    const isMax = (r: { movement_slug: string }) => r.movement_slug === "repeat_90ft_bb";
    const out = withSprintPrep(rows, isMax, (p) => ({ movement_slug: p.slug }))!;
    expect(out.map((r) => r.movement_slug)).toEqual(["lift_x", "wu_a_skip", "build_up_sprint", "repeat_90ft_bb"]);
    expect(sprintPrepOk(out, isMax)).toBe(true);
    expect(sprintPrepOk(rows, isMax)).toBe(false);
    expect(withSprintPrep(rows, isMax, () => null)).toBeNull();
  });
  it("the generator places the prep on every speed-exposure day and refuses max sprints without it", () => {
    const src = readFileSync("supabase/functions/wk-generate-daily/index.ts", "utf8");
    expect(src).toContain("placeSprintPrep(isMax)");
    expect(src).toContain("placeSprintPrep(isSpeedWork)");
    expect(src).toMatch(/!placeSprintPrep\(isSpeedWork\)\)\s*\{\s*finalRxs = assignSequenceOrder\(finalRxs\.filter\(\(r\) => !isSpeedWork\(r\)\)/);
  });
});

describe("item 2 — optimized, editable in-season numbers", () => {
  it("fielding chances by position: outfield > infield > catcher/1B", () => {
    expect([chanceCredit("CF"), chanceCredit("SS"), chanceCredit("C"), chanceCredit("1B")]).toEqual([1, 0.5, 0.25, 0.25]);
    const c = gameCredit({ date: "d", atBatResults: [], baserun: [], defenseChances: 3, defensePositions: ["LF", "LF", "SS"], selfReportedAtBats: null });
    expect(c.bases).toBe(2.5);
  });
  it("morning at-bats estimate uses the player's own average once they have 15 logged plate appearances", () => {
    const results = Array.from({ length: 15 }, (_, i) => (i < 5 ? "2B" : "GO"));
    expect(ownBasesPerPa(results, [])).toBeCloseTo(10 / 15, 2);
    expect(ownBasesPerPa(results.slice(0, 14), [])).toBeNull();
    expect(gameCredit({ date: "d", atBatResults: [], baserun: [], defenseChances: 0, selfReportedAtBats: 4, ownBasesPerPa: 1.5 }).bases).toBe(6);
    expect(gameCredit({ date: "d", atBatResults: [], baserun: [], defenseChances: 0, selfReportedAtBats: 4, ownBasesPerPa: null }).bases).toBe(4);
  });
  it("defaults: 4-base running day, 2-day weekly target, top-up half the count kept 4–8, 3 speed sprints", () => {
    expect(countsAsRunningSession(4)).toBe(true); expect(countsAsRunningSession(3)).toBe(false);
    expect(weeklyTarget(16)).toBe(32);
    expect([topupBases(6), topupBases(12), topupBases(20)]).toEqual([4, 6, 8]);
    expect(D.speedSprints).toBe(3);
  });
  it("unlogged scheduled game: zero credit, heavy for recovery", () => {
    const c = gameCredit({ date: "d", atBatResults: [], baserun: [], defenseChances: 0, selfReportedAtBats: null });
    expect(c.bases).toBe(0); expect(isHeavyGame(c, 20)).toBe(true);
  });
  it("every value is editable and bad values fall back", () => {
    const s = inSeasonStandards({ speedSprints: 4, chanceOutfield: 1.25, topupMin: 9, topupMax: 5 });
    expect(s.speedSprints).toBe(4); expect(s.chanceOutfield).toBe(1.25);
    expect([s.topupMin, s.topupMax]).toEqual([4, 8]);
    expect(inSeasonStandards({ speedSprints: 50 }).speedSprints).toBe(3);
    expect(inSeasonSprintDay(20, base, s).bases).toBe(4);
  });
});

describe("item 3 — top-ups can add a base-sprint item", () => {
  it("chooses the sport's base route", () => {
    expect(topupRouteSlug("baseball")).toBe("repeat_90ft_bb");
    expect(topupRouteSlug("softball")).toBe("bases_single_sb");
  });
  it("only top-up, lighter and speed days add an item — never game, pre-game, or flush days", () => {
    for (const k of ["topup", "low_readiness", "speed"]) expect(ADDS_ROW_KINDS.has(k)).toBe(true);
    for (const k of ["game", "pre_game_half", "flush", "none", "normal"]) expect(ADDS_ROW_KINDS.has(k)).toBe(false);
    expect(inSeasonSprintDay(20, { ...base, gameTomorrow: true, speedDoneThisWeek: true }).kind).toBe("pre_game_half");
    expect(inSeasonSprintDay(20, { ...base, speedDoneThisWeek: true, yesterdayGame: { date: "y", bases: 15, source: "log" } }).kind).toBe("flush");
  });
  it("readiness lightens a top-up", () => {
    const d = inSeasonSprintDay(20, { ...base, lowReadiness: true, speedDoneThisWeek: true });
    expect([d.kind, d.bases]).toEqual(["low_readiness", 4]);
  });
});

describe("item 1 — everyday starter (6 games a week) still gets the short speed day", () => {
  it("off day after a heavy game that wasn't the week's heaviest → 3 all-out sprints", () => {
    const sunday = { date: "sun", bases: 14, source: "log" as const };
    const d = inSeasonSprintDay(16, { ...base, gameTomorrow: true, yesterdayGame: sunday, yesterdayWasHeaviestGame: false });
    expect([d.kind, d.bases, d.maxIntent, d.sprintPrep]).toEqual(["speed", 3, true, true]);
  });
  it("…but never after the heaviest game, an unlogged game, or on low readiness", () => {
    const sunday = { date: "sun", bases: 14, source: "log" as const };
    expect(inSeasonSprintDay(16, { ...base, gameTomorrow: true, yesterdayGame: sunday, yesterdayWasHeaviestGame: true }).kind).toBe("flush");
    expect(inSeasonSprintDay(16, { ...base, yesterdayGame: { date: "sun", bases: 0, source: "unknown" }, yesterdayWasHeaviestGame: false }).kind).toBe("flush");
    expect(inSeasonSprintDay(16, { ...base, gameTomorrow: true, yesterdayGame: sunday, yesterdayWasHeaviestGame: false, lowReadiness: true }).maxIntent).toBe(false);
  });
});
