import { describe, expect, it } from "vitest";
import { startMissing } from "../../../supabase/functions/_shared/startReadiness";

const full = {
  date_of_birth: "2010-04-01", sport_primary: "baseball", position_primary: "SS", competition_level: "high_school",
  category_goals: { categoryOrder: ["hitting"] }, season_status: "off_season", weekly_availability_days: 5,
  equipment_saved: true, assessment_completed: true,
  bats_hand: 'R', throws_hand: 'R', height_in: 70, weight_lb: 175, sleep_target_hrs: 8,
  lifting_age_years: 0, season_dates_reviewed: true, health_setup_completed: true,
  nutrition: { calorie_goal: 2400, protein_goal: 120, carbs_goal: 300, fats_goal: 80, hydration_goal: 100 },
};

describe("owner rule: Hammers Today cannot start until every plan detail is saved", () => {
  it("a complete player has nothing missing", () => expect(startMissing(full)).toEqual([]));
  it.each([
    ["birthday", { date_of_birth: null }], ["sport", { sport_primary: null }], ["position", { position_primary: "" }],
    ["level", { competition_level: null }], ["ranking", { category_goals: { hitting: ["x"] } }],
    ["season", { season_status: null }], ["days", { weekly_availability_days: 0 }], ["equipment", { equipment_saved: false }],
    ["assessment", { assessment_completed: false }],
    ['bats', { bats_hand: null }], ['throws', { throws_hand: null }], ['height', { height_in: null }],
    ['weight', { weight_lb: null }], ['sleep', { sleep_target_hrs: null }], ['lifting', { lifting_age_years: null }],
    ['season_dates', { season_dates_reviewed: false }], ['health', { health_setup_completed: false }],
  ])("lists %s when it is missing", (key, patch) => {
    expect(startMissing({ ...full, ...patch }).map((m) => m.key)).toEqual([key]);
  });
  it('requires both goal picks and their ranking', () => {
    expect(startMissing({ ...full, category_goals: null }).map(m => m.key)).toEqual(['goals','ranking']);
  });
  it.each(['calorie_goal','protein_goal','carbs_goal','fats_goal','hydration_goal'])('requires the saved %s target', key => {
    expect(startMissing({ ...full, nutrition: { ...full.nutrition, [key]: null } }).map(m => m.key)).toEqual([key]);
  });
  it('accepts zero years of lifting without inventing history', () => {
    expect(startMissing({ ...full, lifting_age_years: 0 })).toEqual([]);
  });
  it('refuses a numeric string where a canonical numeric nutrition answer is required', () => {
    expect(startMissing({ ...full, nutrition: { ...full.nutrition, calorie_goal: '2400' } }).map(m => m.key)).toEqual(['calorie_goal']);
  });
});
