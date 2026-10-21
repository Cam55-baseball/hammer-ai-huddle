import { describe, expect, it } from "vitest";
import { applyAdjustments, drillKey, suggestAlternatives, type PlanAdjustment } from "./drillSwap";

const drill = { name: "Angled machine fastballs", slug: "machine_fastballs", dosage: "30 swings",
  setup: "Use the screen.", cue: "Track the ball.", stopIf: "Stop for pain.", equipmentNote: "pitching machine", stage: "full_go" };
const block = { modality: "hitting", drills: [drill], roadmapReason: "Timing work." };
const adjustment: PlanAdjustment = { modality: "hitting", action: "swap", scope: "always",
  original_key: drillKey("hitting", drill), original_name: drill.name, replacement_name: "Invented tee work",
  replacement_dosage: "100 swings", reason: "no machine" };
describe("legacy drill adjustments are not prescription authority", () => {
  it("never invents a name-based machine, barbell, sprint or recovery alternative", () => {
    for (const name of ["Pitching machine", "Back squat", "Sled sprint", "Foam roller"]) {
      expect(suggestAlternatives({ name, dosage: "30 reps" })).toEqual([]);
    }
  });
  it("preserves all 30 prescribed swings, instructions, identity and execution stage despite a saved 100-swing replacement", () => {
    const result = applyAdjustments([block], [adjustment]);
    expect(result[0].drills).toEqual([drill]);
    expect(result[0].drills[0].dosage).toBe("30 swings");
    expect(result[0].roadmapReason).not.toContain("100 swings");
  });
  it("never drops a drill or the session when a legacy unavailable choice has no replacement", () => {
    const result = applyAdjustments([block], [{ ...adjustment, action: "unavailable", replacement_name: null, replacement_dosage: null }]);
    expect(result[0].drills).toHaveLength(1);
    expect(result[0].drills[0]).toBe(drill);
  });
  it("another category cannot change a hitting block even with its key", () => {
    expect(applyAdjustments([block], [{ ...adjustment, modality: "pitching" }])[0]).toBe(block);
  });
  it("position records do not rewrite prescriptions", () => {
    expect(applyAdjustments([block], [{ ...adjustment, action: "position_worked" }])).toEqual([block]);
  });
});