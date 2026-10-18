import { describe, expect, it } from "vitest";
import { baserunEntryPayload, defenseEntryPayload, optionalFlag } from "../fieldEntry";

describe("optional fielding facts", () => {
  it("does not invent inning, hand, shift or outcome from untouched fields", () => {
    expect(defenseEntryPayload({ position: "SS", inning: "", throwing_side: "", shift: "", error_flag: "", assist: "", putout: "" }))
      .toMatchObject({ position: "SS", inning: null, throwing_side: null, shift: null, error_flag: null, assist: null, putout: null });
  });
  it("preserves explicit negative and positive outcomes", () => {
    expect(defenseEntryPayload({ error_flag: false, assist: true, putout: false })).toMatchObject({ error_flag: false, assist: true, putout: false });
  });
  it("uses an entered error code as evidence without inferring other outcomes", () => {
    expect(defenseEntryPayload({ result: "E6" })).toMatchObject({ result: "E6", error_flag: true, assist: null, putout: null });
  });
});
describe("optional running facts", () => {
  it("saves only the chosen event and leaves untouched outcome and bases unknown", () => {
    expect(baserunEntryPayload({ event_type: "advance", inning: "", base_from: "", base_to: "", success: "", pitcher_arm_side: "", is_pinch_run: "" }))
      .toMatchObject({ event_type: "advance", inning: null, base_from: null, base_to: null, success: null, pitcher_arm_side: null, is_pinch_run: null });
  });
  it("preserves a recorded failed attempt, bases and zero lead", () => {
    expect(baserunEntryPayload({ event_type: "steal", success: "false", base_from: 1, base_to: 2, lead_steps: 0 }))
      .toMatchObject({ success: false, base_from: 1, base_to: 2, lead_steps: 0 });
  });
  it("does not convert unknown boolean values into false", () => {
    expect(optionalFlag(undefined)).toBeNull();
    expect(optionalFlag("unknown")).toBeNull();
    expect(optionalFlag("true")).toBe(true);
  });
});