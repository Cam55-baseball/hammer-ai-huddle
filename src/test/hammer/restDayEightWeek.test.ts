import { describe, expect, it } from "vitest";
import { buildHammerDailyPlan } from "@/lib/hammer/prescription/dailyPlan";
import { NORMAL_SIGNAL } from "@/lib/hammer/prescription/scheduleContext";
import type { HammerAthleteContext, ContextVariable } from "@/lib/hammer/context/athleteContext";
import { isSoftRecovery, isWholeRestDayType } from "../../../supabase/functions/_shared/wic/schedule/softRecovery";
import { finalRuleCheck } from "../../../supabase/functions/_shared/wic/schedule/finalCheck";
function context(sport: string, role: string): HammerAthleteContext {
  const values = { sport_primary: sport, position_primary: role, lifecycle_band: "u18", season_phase: "off", lifting_age_years: 2, weekly_availability_days: 6, injury_history: [], equipment_effective: ["ball", "bat", "glove", "field", "tee"] };
  const variables = Object.entries(values).map(([key, value]) => ({ key, value, label: key, domain: "identity", source: "test", confidence: "high", missing: false, lastUpdated: null, lineage: { owner: "test", source: "test", rawConfidence: "high" } }) as ContextVariable);
  return { variables, missing: [], isLoading: false, missingCount: 0, envelope: null, get: key => variables.find(v => v.key === key) as any };
}
describe("eight-week soft-recovery-only rest law", () => {
  it("recognizes current and legacy saved rest identities without treating lift spacing as full rest", () => {
    expect(["recovery", "recovery_day", "off_day"].map(isWholeRestDayType)).toEqual([true,true,true]);
    expect(["lift_day", "training", "game_day", null].map(isWholeRestDayType)).toEqual([false,false,false,false]);
  });
  for (const sport of ["baseball", "softball"]) for (const role of ["P", "C", "SS", "CF", "2B", "1B", "DH"]) {
    it(`${sport} ${role} has no physical training on any rest day`, () => {
      let restDays = 0;
      for (let d = 0; d < 56; d++) {
        const plan = buildHammerDailyPlan(context(sport, role), NORMAL_SIGNAL, null, null, undefined, new Date(2026, 9, 26 + d));
        if (!plan.weeklyRoadmap.find(day => day.isToday)?.restDay) continue;
        restDays++;
        for (const block of plan.blocks) {
          if (["fueling", "game_iq"].includes(block.modality)) continue;
          expect(block.drills.every(drill => isSoftRecovery(drill.slug)), `${block.modality} on rest day ${d}`).toBe(true);
          expect(block.offDayOverridable).toBe(false);
          expect(block.gamePlanTemplate).toBeNull();
        }
      }
      expect(restDays).toBeGreaterThanOrEqual(8);
    });
  }
  it("server final-save law removes disguised warmup, throwing and bunt work", () => {
    const rows = ["wu_foam_roll_tspine", "bench_press", "sprint", "bunt_right_drag", "throw", "wu_pogo_single"].map(movement_slug => ({ movement_slug, slot: "warmup" }));
    const result = finalRuleCheck(rows, { planDate: "2026-10-25", phase: "os_q1", age: 21, priorLiftDates: [], restDaysBetweenLifts: null, weeklyLiftMax: null, liftRemoved: true, fullRestDay: true, catalog: new Map() });
    expect(result.rows.map(row => row.movement_slug)).toEqual(["wu_foam_roll_tspine"]);
    expect(result.swaps).toHaveLength(5);
  });
});