import { describe, expect, it } from "vitest";
import { catchPlayDay, earnStatus, catchPlayStandardsFrom, DEFAULT_CATCH_PLAY_STANDARDS as S, PROPOSED_ARM_RISK_FAULTS, THROWING_FAULT_KEYS, type CatchSession } from "../../supabase/functions/_shared/wic/throwing/catchPlay";
import { armStrengthUnlockPrompt, ARM_STRENGTH_UNLOCK_TEXT } from "@/lib/hammer/armStrengthUnlock";
import { analysisFeedbackToTaxonomy } from "@/lib/analysisFeedbackToTaxonomy";
import { BYS_ITEMS, bysLevel } from "@/lib/hammer/beforeYouStartImportance";

const TODAY = "2026-11-10";
const add = (n: number) => new Date(Date.parse(`${TODAY}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const sessions: CatchSession[] = [1, 2].map((k) => ({ date: add(-k), maxDistanceFt: 120, painFree: true, armFeelGood: true }));
const base = { today: TODAY, age: 25, armFlagDates: [] as string[], redCheckinDates: [] as string[], armFeelGood: true, armRiskFindingDates: [] as string[], sessions, positionDistanceFt: 120 };
const clip = (faultKeys: string[]) => ({ date: add(-10), faultKeys });

describe("owner Nov 4 arm-strength decisions", () => {
  it("each final pick blocks arm-strength days; each unchecked fault doesn't", () => {
    for (const k of PROPOSED_ARM_RISK_FAULTS) expect(earnStatus({ ...base, lastThrowingAnalysis: clip([k]) }, S).armStrength).toBe(false);
    for (const k of THROWING_FAULT_KEYS.map((x) => x.key).filter((k) => !PROPOSED_ARM_RISK_FAULTS.includes(k))) expect(earnStatus({ ...base, lastThrowingAnalysis: clip([k]) }, S).armStrength).toBe(true);
    for (const k of ["th_late_glove_break", "th_no_crow_hop", "short_arm", "th_long_arm_action", "th_feet_misaligned", "th_slow_transfer"]) expect(PROPOSED_ARM_RISK_FAULTS).not.toContain(k);
  });
  it("the two new throwing tags can be assigned to a throwing analysis, with fix-it mapping", () => {
    for (const k of ["th_trunk_rotation_early", "th_front_side_flyout"]) {
      expect(THROWING_FAULT_KEYS.find((x) => x.key === k)?.group).toBe("throwing");
      const sig = analysisFeedbackToTaxonomy({ scorecard: { regressions: [{ area: k }] } }, "throwing", "baseball");
      expect(sig.movementPatterns).toContain(k);
      expect(sig.correctionTags).toContain("th_stay_online_finish");
    }
  });
  it("default arm-risk selection is the owner's list", () => {
    expect([...PROPOSED_ARM_RISK_FAULTS].sort()).toEqual(["arm_lag", "bb_arm_path_late", "bb_front_side_flyout", "bb_poor_deceleration", "bb_trunk_rotation_early", "sb_shoulders_open_early", "sb_whip_arm_early", "th_across_body", "th_front_side_flyout", "th_low_elbow_slot", "th_trunk_rotation_early"]);
    expect(THROWING_FAULT_KEYS.length).toBe(29);
    expect(THROWING_FAULT_KEYS.some((k) => k.key === "short_arm")).toBe(true);
  });
  it("a marked fault in a recent clip blocks arm-strength days; an unmarked one doesn't", () => {
    const s = catchPlayStandardsFrom({ armRiskFaults: ["th_no_crow_hop"] });
    expect(earnStatus({ ...base, lastThrowingAnalysis: clip(["th_no_crow_hop"]) }, s).armStrength).toBe(false);
    expect(earnStatus({ ...base, lastThrowingAnalysis: clip(["arm_lag"]) }, s).armStrength).toBe(true);
  });
  it("no clip in 60 days: only arm-strength waits; catch play and long toss continue", () => {
    for (const last of [null, { date: add(-61), faultKeys: [] }]) {
      const e = earnStatus({ ...base, lastThrowingAnalysis: last }, S);
      expect(e.armStrength).toBe(false); expect(e.longToss).toBe(true);
      const day = catchPlayDay({ date: TODAY, sport: "baseball", position: "IF", age: 25, phase: "pre", isPitcher: false, restDay: false, gameToday: false, gameYesterday: false, gameTomorrow: false, heavyYesterday: false, lowReadiness: false, trainingDayIndex: 0, earn: e, progress: { greenWeeks: 0 }, standards: S });
      expect(day.kind).toBe("long_toss"); expect(day.totalThrows).toBeGreaterThan(0);
    }
  });
  it("unlock prompt shows only with no recent throwing clip, under analysis_prompts (Level 2 default)", () => {
    expect(armStrengthUnlockPrompt({ throwingToday: true, lastThrowingClipIso: null, today: TODAY, freshDays: 60 })).toBe(ARM_STRENGTH_UNLOCK_TEXT);
    expect(armStrengthUnlockPrompt({ throwingToday: true, lastThrowingClipIso: `${add(-61)}T10:00:00Z`, today: TODAY, freshDays: 60 })).toBe(ARM_STRENGTH_UNLOCK_TEXT);
    expect(armStrengthUnlockPrompt({ throwingToday: true, lastThrowingClipIso: `${add(-5)}T10:00:00Z`, today: TODAY, freshDays: 60 })).toBeNull();
    expect(armStrengthUnlockPrompt({ throwingToday: false, lastThrowingClipIso: null, today: TODAY, freshDays: 60 })).toBeNull();
    expect(BYS_ITEMS.some((i) => i.id === "analysis_prompts")).toBe(true);
    expect(bysLevel("analysis_prompts", {})).toBe(2);
  });
});
