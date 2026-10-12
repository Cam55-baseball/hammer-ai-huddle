import { describe, it, expect } from "vitest";
import {
  checkDrillSafety,
  findSafeAlternatives,
  maxLevelForAge,
  type DrillSafetyInput,
  type AthleteSafetyContext,
} from "../drillSafety";

const drill = (over: Partial<DrillSafetyInput> = {}): DrillSafetyInput => ({
  id: "d1",
  name: "Test Drill",
  module: "hitting",
  skill_target: "bat_speed",
  sport: "baseball",
  progression_level: 4,
  requiredEquipment: [],
  ...over,
});

const athlete = (over: Partial<AthleteSafetyContext> = {}): AthleteSafetyContext => ({
  ageYears: 16,
  sport: "baseball",
  equipment: ["bat", "tee"],
  ...over,
});

describe("maxLevelForAge", () => {
  it("gates levels by age band", () => {
    expect(maxLevelForAge(7)).toBe(2);
    expect(maxLevelForAge(10)).toBe(3);
    expect(maxLevelForAge(13)).toBe(4);
    expect(maxLevelForAge(16)).toBe(5);
    expect(maxLevelForAge(20)).toBe(7);
    expect(maxLevelForAge(null)).toBe(5);
  });
});

describe("checkDrillSafety", () => {
  it("blocks an elite drill for a 10-year-old", () => {
    const r = checkDrillSafety(drill({ progression_level: 7 }), athlete({ ageYears: 10 }));
    expect(r.ok).toBe(false);
    expect(r.reasons[0]).toContain("Too advanced");
  });

  it("blocks when required equipment is missing", () => {
    const r = checkDrillSafety(
      drill({ requiredEquipment: ["L-screen", "bat"] }),
      athlete({ equipment: ["bat"] }),
    );
    expect(r.ok).toBe(false);
    expect(r.reasons[0]).toContain("L-screen");
  });

  it("blocks a sport mismatch but allows 'both'", () => {
    expect(checkDrillSafety(drill({ sport: "softball" }), athlete()).ok).toBe(false);
    expect(checkDrillSafety(drill({ sport: "both" }), athlete()).ok).toBe(true);
  });

  it("passes an age-legal drill with owned equipment", () => {
    expect(checkDrillSafety(drill({ requiredEquipment: ["tee"] }), athlete()).ok).toBe(true);
  });
});

describe("findSafeAlternatives", () => {
  it("offers same-skill drills the athlete can actually do", () => {
    const failed = drill({ id: "d1", requiredEquipment: ["L-screen"] });
    const safe = drill({ id: "d2", name: "Tee Work" });
    const otherSkill = drill({ id: "d3", skill_target: "glove_work" });
    const r = findSafeAlternatives([failed, safe, otherSkill], failed, athlete());
    expect(r.map((d) => d.id)).toEqual(["d2"]);
  });
});
