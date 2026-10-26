import { describe, expect, it } from "vitest";
import { missingGearAnswer, swapGearList } from "../../../../supabase/functions/_shared/planSwap/commonGear";

describe("common missing-gear answers", () => {
  it('a missing gamer bat also records the saved bat identity',()=>expect(missingGearAnswer(['gamer_bat'],undefined,['bat'])).toEqual(['gamer_bat','bat']));
  it("offers common gear even without source labels", () => {
    expect(swapGearList([])).toEqual(["barbell", "dumbbell", "bands", "pitching_machine", "net", "tee", "open_field", "hill", "sled", "foam_roller", "baseballs", "softballs", "gamer_bat"]);
  });
  it("retains unlabeled common missing items and the player's extra answer", () => {
    expect(missingGearAnswer(["barbell", "foam_roller"], "no partner today", [])).toEqual(["barbell", "foam_roller", "no partner today"]);
  });
  it("retains known uncommon equipment without duplicates", () => {
    expect(swapGearList(["wall", "barbell"]).filter(g => g === "barbell")).toHaveLength(1);
    expect(missingGearAnswer(["wall"], "", ["wall"])).toEqual(["wall"]);
  });
});