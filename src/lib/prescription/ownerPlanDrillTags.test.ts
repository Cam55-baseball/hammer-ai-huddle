import { describe, expect, it } from "vitest";
import { eligibleFor, filedSlots } from "./ownerPlanDrills";
const row = (placements: string[]) => ({ id: "x", overrides_drill_id: null, placements, sports: ["baseball"], name: "Tee drill", fault_keys: [], phase: null, level: null, dosage: "3x10", setup: "Tee at hip", steps: ["swing"], cue: "stay tall", feel: null, feel_wrong: null, common_mistake: null, equipment: [], video_url: null, active: true, pinned: false, created_at: "" }) as any;
describe("engine category tags", () => {
  it("hitting tag competes in the skill slot for hitting only", () => {
    expect(eligibleFor(row(["hammers_today:hitting"]), ["hammers_today:skill"], { sport: "baseball", skill: "hitting" })).toBe(true);
    expect(eligibleFor(row(["hammers_today:hitting"]), ["hammers_today:skill"], { sport: "baseball", skill: "throwing" })).toBe(false);
  });
  it("low-taxing defense competes in the defense slot", () => {
    expect(filedSlots(row(["hammers_today:defense_low_taxing"]))).toEqual(["hammers_today:defense"]);
    expect(eligibleFor(row(["hammers_today:defense_low_taxing"]), ["hammers_today:defense"], { sport: "baseball" })).toBe(true);
  });
  it("no sport spill-over", () => {
    expect(eligibleFor(row(["hammers_today:hitting"]), ["hammers_today:skill"], { sport: "softball", skill: "hitting" })).toBe(false);
  });
});
