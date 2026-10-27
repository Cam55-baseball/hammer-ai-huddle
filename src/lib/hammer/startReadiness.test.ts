import { describe, expect, it } from "vitest";
import { startMissing } from "../../../supabase/functions/_shared/startReadiness";

const full = {
  date_of_birth: "2010-04-01", sport_primary: "baseball", position_primary: "SS", competition_level: "high_school",
  category_goals: { categoryOrder: ["hitting"] }, season_status: "off_season", weekly_availability_days: 5,
  equipment_saved: true, assessment_completed: true,
};

describe("owner rule: Hammers Today cannot start until every plan detail is saved", () => {
  it("a complete player has nothing missing", () => expect(startMissing(full)).toEqual([]));
  it.each([
    ["birthday", { date_of_birth: null }], ["sport", { sport_primary: null }], ["position", { position_primary: "" }],
    ["level", { competition_level: null }], ["goals", { category_goals: null }], ["ranking", { category_goals: { hitting: ["x"] } }],
    ["season", { season_status: null }], ["days", { weekly_availability_days: 0 }], ["equipment", { equipment_saved: false }],
    ["assessment", { assessment_completed: false }],
  ])("lists %s when it is missing", (key, patch) => {
    expect(startMissing({ ...full, ...patch }).map((m) => m.key)).toEqual([key]);
  });
});
