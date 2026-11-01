import { describe, expect, it } from "vitest";
import { restDowFor, judgeRestMove, type RestChoice } from "../../../../supabase/functions/_shared/wic/schedule/restDay";
import { availableTrainingDays, unavailableTrainingDate } from "../../../../supabase/functions/_shared/wic/schedule/availability";
import { wholePlanRest, savedWholePlanRest } from "../../../../supabase/functions/_shared/wic/schedule/planDayScope";

// Week of Mon 2026-11-02 … Sun 2026-11-08.
const c = (rest_dow: number, scope: "week" | "indefinite", week_start: string, created_at = "2026-11-02T10:00:00Z"): RestChoice => ({ rest_dow, scope, week_start, created_at });

describe("owner Nov 1 B1: choose your rest day", () => {
  it("defaults to Sunday", () => expect(restDowFor("2026-11-04", [])).toBe(0));
  it("a this-week choice binds only that week", () => {
    const ch = [c(3, "week", "2026-11-02")];
    expect(restDowFor("2026-11-05", ch)).toBe(3);
    expect(restDowFor("2026-11-10", ch)).toBe(0);
  });
  it("an indefinite choice binds from its week onward", () => {
    const ch = [c(5, "indefinite", "2026-11-09")];
    expect(restDowFor("2026-11-04", ch)).toBe(0);
    expect(restDowFor("2026-11-20", ch)).toBe(5);
  });
  it("still exactly six training days and one rest day when moved", () => {
    const days = availableTrainingDays(null, 3);
    expect(days).toHaveLength(6);
    expect(days).not.toContain(3);
    expect(days).toContain(0);
    expect(unavailableTrainingDate("2026-11-04", null, 3)).toBe(true); // Wednesday rest
    expect(unavailableTrainingDate("2026-11-08", null, 3)).toBe(false); // old Sunday trains
    expect(wholePlanRest("2026-11-04", false, 3)).toBe(true);
    expect(wholePlanRest("2026-11-08", false, 3)).toBe(false);
  });
  it("saved plans use the builder's rest stamp, so a trained Sunday is not shown as rest", () => {
    expect(savedWholePlanRest("2026-11-08", [{ why_payload: { full_plan_rest: false } }])).toBe(false);
    expect(savedWholePlanRest("2026-11-04", [{ why_payload: { full_plan_rest: true } }])).toBe(true);
    expect(savedWholePlanRest("2026-11-08", [{ why_payload: {} }])).toBe(true);
  });
  it("a used rest day can't be moved", () => {
    // Rest moved to Monday this week; it's now Wednesday, so Monday's rest was used.
    const ch = [c(1, "week", "2026-11-02")];
    const v = judgeRestMove({ today: "2026-11-04", target: "2026-11-06", scope: "week", choices: ch });
    expect(v.ok).toBe(false);
  });
  it("today's rest that is done can't be moved", () => {
    const v = judgeRestMove({ today: "2026-11-08", target: "2026-11-08", scope: "week", choices: [], todayRestDone: true });
    expect(v.ok).toBe(false);
  });
  it("an unused rest day moves within this week", () => {
    const v = judgeRestMove({ today: "2026-11-04", target: "2026-11-06", scope: "week", choices: [] });
    expect(v).toEqual({ ok: true, weekStart: "2026-11-02", restDate: "2026-11-06" });
  });
  it("past days can't become the rest day", () => {
    expect(judgeRestMove({ today: "2026-11-04", target: "2026-11-03", scope: "week", choices: [] }).ok).toBe(false);
  });
  it("indefinitely after this week's rest was used starts next week", () => {
    const ch = [c(1, "week", "2026-11-02")];
    expect(judgeRestMove({ today: "2026-11-04", target: "2026-11-06", scope: "indefinite", choices: ch }))
      .toEqual({ ok: true, weekStart: "2026-11-09", restDate: "2026-11-13" });
  });
});

import { resolveSkillDays } from "../prescription/weeklyMicrocycle";
describe("owner Nov 1 B1: weekly floors stay met after moving the rest day", () => {
  it("defense 4 / hitting 3 / bunting 2 never land on the new rest day and still fill", () => {
    const template: any = { perModality: { defense: [1, 3, 5], hitting: [2, 3, 4], bunting: [3] }, availableDays: availableTrainingDays(null, 3), restDow: 3 };
    for (const [m, n] of [["defense", 4], ["hitting", 3], ["bunting", 2]] as const) {
      const r = resolveSkillDays(template, m as any, n);
      expect(r.days).toHaveLength(n);
      expect(r.days).not.toContain(3);
    }
  });
});
