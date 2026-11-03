import { describe, it, expect } from "vitest";
import { profileFlowItems, failureAction, minutesFor } from "./finishProfile";

const m = (key: string) => ({ key, label: key, to: "/x" });

describe("Finish your profile flow", () => {
  it("never makes birthday a skippable step (it has its own required sheet)", () => {
    expect(profileFlowItems([m("birthday"), m("sleep")], true).map((i) => i.key)).toEqual([]);
  });
  it("groups the 5 nutrition goals into one screen", () => {
    const items = profileFlowItems(["calorie_goal", "protein_goal", "carbs_goal", "fats_goal", "hydration_goal"].map(m), true);
    expect(items).toHaveLength(0);
  });
  it("keeps the required starting point after Start too", () => {
    expect(profileFlowItems([m("starting_point")], true)).toHaveLength(1);
    expect(profileFlowItems([m("starting_point")], false)).toHaveLength(1);
  });
  it("shows at least 1 minute", () => { expect(minutesFor(1)).toBe(1); expect(minutesFor(12)).toBe(3); });
});

describe("card failure copy", () => {
  it("never says the old dead-end message for missing details", () => {
    const a = failureAction("initial_inputs_missing", [], []);
    expect(a.sentence).not.toMatch(/missing starting details|couldn't publish/i);
    expect(a.kind).toBe("retry");
  });
  it("birthday failure opens the birthday sheet", () => {
    expect(failureAction("age_required", [], []).kind).toBe("birthday");
  });
});
