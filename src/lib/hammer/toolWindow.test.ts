import { describe, expect, it } from "vitest";
import { toolOccurrenceMatches, toolWindowContext } from "./toolWindow";
describe("canonical tool occurrence", () => {
  it("requires exact exercise and plan date; a live callback also requires its launch token", () => {
    const expected = { exerciseId: "swing-1", planDate: "2026-10-23" };
    const saved = { exercise_id: "swing-1", plan_date: "2026-10-23", token: "launch" };
    expect(toolOccurrenceMatches(saved, expected, "launch")).toBe(true);
    expect(toolOccurrenceMatches(saved, expected, "old")).toBe(false);
    expect(toolOccurrenceMatches({ ...saved, exercise_id: "swing-2" }, expected)).toBe(false);
    expect(toolOccurrenceMatches({ ...saved, plan_date: "2026-10-24" }, expected)).toBe(false);
  });
  it("does not turn a normal visit or incomplete link into an exercise completion", () => {
    expect(toolWindowContext("?today_exercise_id=swing-1")).toBeNull();
    expect(toolWindowContext("?today_exercise_id=swing-1&today_plan_date=2026-10-23&today_tool_token=launch")).toEqual({ exercise_id: "swing-1", plan_date: "2026-10-23", token: "launch" });
  });
});