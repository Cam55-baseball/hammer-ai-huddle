import { describe, it, expect, afterEach } from "vitest";
import { buildEassPrescription, type EassContext } from "@/lib/hammer/prescription/eassLibrary";
import { setOwnerPlanDrills } from "@/lib/prescription/ownerPlanDrills";
import { THROWING_SLOT } from "@/lib/prescription/ownerThrowingDrills";
import { bysExtraTriggers, type BysExtraFacts } from "@/lib/hammer/bysExtraTriggers";
import { noteTag } from "@/lib/hammer/coachIssueTags";
import { startingBases, sprintCapacity, sprintDay } from "../../supabase/functions/_shared/wic/conditioning/positionSprints";

const drill = (o: Record<string, unknown> = {}) => ({
  id: "own-1", name: "Owner throws", active: true, placements: [THROWING_SLOT], sports: ["baseball"],
  cue: "", dosage: "", steps: [], equipment: [], fault_keys: [], overrides_drill_id: null, pinned: false,
  throw_steps: [{ ft: 45, throws: 8 }, { ft: 60, throws: 8 }], throw_intent: "catch_light", throw_flight: "arc",
  throw_pulldowns: false, throw_contexts: ["catch_play"], throw_role_fit: ["position"],
  fit_levels: ["youth", "high_school", "college", "pro"], fit_age_bands: ["u13", "13_17", "18_plus"], ...o,
});
const ctx = (o: Partial<EassContext> = {}): EassContext => ({
  sport: "baseball", position: "infield", seasonPhase: "off", ageYears: 17, trainingAgeYears: 2, injuryRegions: [], armSore: false,
  isGameDay: false, isThrowingDay: true, isRecoveryDay: false, readinessScore: 0.9, catchPlay: { rawPosition: "SS", trainingDayIndex: 0 }, ...o,
});
const throwsOf = (c: EassContext) => buildEassPrescription(c).drills
  .filter((d) => /\d+\s*throws/.test(d.dosage) && ["regulation", "long_toss"].includes(d.category))
  .reduce((n, d) => n + Number(/(\d+)\s*throws/.exec(d.dosage)![1]), 0);
afterEach(() => setOwnerPlanDrills([]));

describe("locked by owner Nov 5 round 3 #1: owner throwing drills replace, never alongside", () => {
  it("position player: owner drill replaces the built-in catch play and the total is the drill's own", () => {
    setOwnerPlanDrills([drill() as never]);
    const d = buildEassPrescription(ctx()).drills;
    expect(d.some((x) => x.name.startsWith("Owner throws"))).toBe(true);
    expect(d.some((x) => x.name.startsWith("Catch play — "))).toBe(false);
    expect(throwsOf(ctx())).toBe(16);
  });
  it("pitcher: owner catch-play drill replaces the regulation catch play, never adds throws", () => {
    const p = ctx({ position: "pitcher", catchPlay: undefined });
    const before = throwsOf(p);
    setOwnerPlanDrills([drill({ throw_role_fit: ["pitcher"] }) as never]);
    const d = buildEassPrescription(p).drills;
    expect(d.some((x) => x.name.startsWith("Owner throws"))).toBe(true);
    expect(d.some((x) => x.name.startsWith("Regulation warm-up toss"))).toBe(false);
    expect(throwsOf(p)).toBeLessThanOrEqual(before);
  });
  it("pitcher: owner long-toss drill replaces built-in long toss in the off-season", () => {
    setOwnerPlanDrills([drill({ id: "lt", name: "Owner LT", throw_role_fit: ["pitcher"], throw_contexts: ["long_toss"], throw_intent: "sub_max", throw_steps: [{ ft: 120, throws: 6 }, { ft: 180, throws: 6 }] }) as never]);
    const d = buildEassPrescription(ctx({ position: "pitcher", catchPlay: undefined })).drills;
    expect(d.some((x) => x.name.startsWith("Owner LT"))).toBe(true);
    expect(d.some((x) => x.name.startsWith("Long-toss extension"))).toBe(false);
  });
  it("pitcher: a drill bigger than the built-in day keeps the built-in rows", () => {
    setOwnerPlanDrills([drill({ throw_role_fit: ["pitcher"], throw_steps: [{ ft: 60, throws: 50 }] }) as never]);
    expect(buildEassPrescription(ctx({ position: "pitcher", catchPlay: undefined })).drills.some((x) => x.name.startsWith("Owner throws"))).toBe(false);
  });
  it("position-only drill never reaches a pitcher", () => {
    setOwnerPlanDrills([drill() as never]);
    expect(buildEassPrescription(ctx({ position: "pitcher", catchPlay: undefined })).drills.some((x) => x.name.startsWith("Owner throws"))).toBe(false);
  });
});

describe("locked by owner Nov 5 round 3 #2: base-sprint starting numbers unchanged", () => {
  it("None = 2, bands start low, +1 per green week to 20, lighter = half, big day = 75%", () => {
    expect(startingBases("None", null, "baseball")).toBe(2);
    expect(startingBases("6–10", null, "baseball")).toBe(6);
    expect(startingBases("16–20+", null, "softball")).toBe(16);
    expect(sprintCapacity(6, 3)).toBe(9);
    expect(sprintCapacity(16, 30)).toBe(20);
    expect(sprintDay(20, { gameToday: false, gameYesterday: false, gameTomorrow: true, yesterdayBases: 0, lowReadiness: false }).bases).toBe(10);
    expect(sprintDay(20, { gameToday: false, gameYesterday: false, gameTomorrow: false, yesterdayBases: 15, lowReadiness: false }).kind).toBe("after_high");
  });
});

const base = (o: Partial<BysExtraFacts> = {}): BysExtraFacts => ({
  today: "2026-11-05", coachTags: [], games: [], lowReadinessToday: false, lateSwingFaults: [], gameTendencyFaults: [],
  prescribedModules: [], lastClipByModule: {}, recurringIssueLabels: [], lastTestDate: null, preseasonStart: null, inSeasonStart: null, ...o,
});

describe("locked by owner Nov 5 round 3 #4: tagged coach notes", () => {
  it("no tag → nothing changes", () => {
    expect(noteTag(null, "anything")).toEqual({});
    expect(bysExtraTriggers(base())).toEqual({});
  });
  it("Defense tag → defensive prep card with the coach's words", () => {
    const r = bysExtraTriggers(base({ coachTags: [{ area: "defense", label: "throwing errors on backhand plays", coachName: "Coach Sam", createdAt: "2026-11-03T10:00:00Z" }] }));
    expect(r.defensive_prep_video).toEqual(['Coach Sam tagged "throwing errors on backhand plays" for you.']);
  });
  it("each area turns on its item", () => {
    const tag = (area: "hitting" | "throwing" | "baserunning") => bysExtraTriggers(base({ coachTags: [{ area, label: "x", coachName: "C", createdAt: "2026-11-04" }] }));
    expect(tag("hitting").royal_timing).toBeTruthy();
    expect(tag("throwing").recurring_videos).toBeTruthy();
    expect(tag("baserunning").baserunning_study).toBeTruthy();
  });
  it("old tags (over 28 days) don't trigger", () => {
    expect(bysExtraTriggers(base({ coachTags: [{ area: "defense", label: "x", coachName: "C", createdAt: "2026-09-01" }] }))).toEqual({});
  });
  it("noteTag keeps the label short and optional", () => {
    expect(noteTag("defense", "  backhands  ")).toEqual({ issue_area: "defense", issue_label: "backhands" });
    expect(noteTag("hitting", "")).toEqual({ issue_area: "hitting", issue_label: null });
  });
});

describe("locked by owner Nov 5 round 3 #5: extra triggers", () => {
  const game = (date: string, o: Partial<{ atBats: { result: string }[]; baserun: { event_type: string; success: boolean }[] }> = {}) => ({ date, atBats: [], baserun: [], ...o });
  it("Mind: base-running mistake in a game log", () => {
    expect(bysExtraTriggers(base({ games: [game("2026-11-04", { baserun: [{ event_type: "advance", success: false }] })] })).mind_item?.[0]).toMatch(/base-running mistake/);
  });
  it("Mind: low readiness day", () => {
    expect(bysExtraTriggers(base({ lowReadinessToday: true })).mind_item?.[0]).toMatch(/low readiness/);
  });
  it("Timing: late swings in clips", () => {
    expect(bysExtraTriggers(base({ lateSwingFaults: ["bb_late_load"] })).royal_timing?.[0]).toMatch(/late load/);
  });
  it("Timing: strikeout streak (3 in a row)", () => {
    const r = bysExtraTriggers(base({ games: [game("2026-11-03", { atBats: [{ result: "K" }, { result: "SO" }] }), game("2026-11-04", { atBats: [{ result: "K_looking" }] })] }));
    expect(r.royal_timing?.[0]).toMatch(/struck out 3 times in a row/);
    expect(bysExtraTriggers(base({ games: [game("2026-11-04", { atBats: [{ result: "K" }, { result: "1B" }, { result: "K" }] })] })).royal_timing).toBeUndefined();
  });
  it("Record-a-clip: 3+ weeks since a clip of today's skill, and recurring issue re-check", () => {
    expect(bysExtraTriggers(base({ prescribedModules: ["hitting"], lastClipByModule: { hitting: "2026-10-10" } })).analysis_prompts?.[0]).toMatch(/3 weeks since your last hitting clip/);
    expect(bysExtraTriggers(base({ prescribedModules: ["hitting"], lastClipByModule: { hitting: "2026-10-30" } })).analysis_prompts).toBeUndefined();
    expect(bysExtraTriggers(base({ recurringIssueLabels: ["bb_early_hips"] })).analysis_prompts?.[0]).toMatch(/re-checks early hips/);
  });
  it("Base-running study: caught stealing and outs on the bases", () => {
    expect(bysExtraTriggers(base({ games: [game("2026-11-04", { baserun: [{ event_type: "steal", success: false }] })] })).baserunning_study?.[0]).toMatch(/caught stealing once/);
    expect(bysExtraTriggers(base({ games: [game("2026-11-04", { baserun: [{ event_type: "tag_up", success: false }] })] })).baserunning_study?.[0]).toMatch(/out on the bases/);
  });
  it("Recurring videos: game-log tendencies", () => {
    expect(bysExtraTriggers(base({ gameTendencyFaults: ["fd_slow_first_step"] })).recurring_videos?.[0]).toMatch(/slow first step keeps showing up in your logged games/);
  });
  it("Testing: re-test due after 8 weeks, and pre-season start", () => {
    expect(bysExtraTriggers(base({ lastTestDate: "2026-09-01" })).testing_day?.[0]).toMatch(/re-test is due/);
    expect(bysExtraTriggers(base({ lastTestDate: "2026-10-01" })).testing_day).toBeUndefined();
    expect(bysExtraTriggers(base({ preseasonStart: "2026-11-02" })).testing_day?.[0]).toMatch(/pre-season just started/);
  });
  it("Competition level: new season start", () => {
    expect(bysExtraTriggers(base({ inSeasonStart: "2026-11-04" })).competition_level?.[0]).toMatch(/new season/);
    expect(bysExtraTriggers(base({ inSeasonStart: "2026-10-01" })).competition_level).toBeUndefined();
  });
  it("old games (8+ days) don't trigger", () => {
    expect(bysExtraTriggers(base({ games: [game("2026-10-20", { baserun: [{ event_type: "steal", success: false }] })] }))).toEqual({});
  });
});
