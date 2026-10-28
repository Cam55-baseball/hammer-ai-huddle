import { describe, expect, it } from "vitest";
import { practiceCheckDrills, taggedPracticeChecks } from "./practiceCheckDrills";

const base = { module: "hitting", sport: "baseball" };

describe("practice checks → tagged library drills", () => {
  it("maps a tagged check to a canonical library drill id", () => {
    const out = practiceCheckDrills([{ text: "x", finding_tags: ["early_shoulder_rotation"] }], base);
    expect(out).toHaveLength(1);
    expect(out[0].drill.violationKeys).toContain("early_shoulder_rotation");
    expect(out[0].drill.id.startsWith("elite.hit.")).toBe(true);
  });

  it("omits a check whose tag has no library drill", () => {
    expect(practiceCheckDrills([{ text: "x", finding_tags: ["no_such_finding"] }], base)).toEqual([]);
  });

  it("never matches by drill-name text", () => {
    expect(practiceCheckDrills([{ text: "Step-Behind Separation", finding_tags: [] }], base)).toEqual([]);
    expect(taggedPracticeChecks({ check_improvement: "Step-Behind Separation" })).toEqual([]);
  });

  it("lists a drill once when two checks share it", () => {
    const tag = { text: "a", finding_tags: ["early_shoulder_rotation"] };
    expect(practiceCheckDrills([tag, { ...tag, text: "b" }], base)).toHaveLength(1);
  });
});
