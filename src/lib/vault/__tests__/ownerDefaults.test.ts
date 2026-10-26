import { describe, expect, it } from "vitest";
import { ownerGear, ownerIdentity, OWNER_DEFAULTS } from "../../../../supabase/functions/_shared/vault/ownerDefaults";
import { validateExercise } from "../validateExercise";

describe("owner creation defaults", () => {
  it('accepts the approved bunting bat without removing its requirement',()=>expect(ownerGear(['bat','gamer_bat','open_field'])).toEqual({equipment:['gamer_bat','open_field'],unknown:[]}));
  it("creates a stable unique code without asking the owner", () => {
    expect(ownerIdentity("11111111-1111-4111-8111-111111111111").slug).toBe("owner_11111111_1111_4111_8111_111111111111");
    expect(ownerIdentity("a").slug).not.toBe(ownerIdentity("b").slug);
  });
  it("maps common gear and retains unknown owner words for review", () => {
    expect(ownerGear(["dumbbells", "foam roller", "custom pulley"])).toEqual({ equipment: ["dumbbell", "foam_roller", "custom pulley"], unknown: ["custom pulley"] });
  });
  it("supports name, a concrete how-to and dose with editable defaults", () => {
    expect(validateExercise({ ...OWNER_DEFAULTS, slug: "owner_test", name: "Slow wall reach", how_to_one_rep: "One rep is reaching up the wall and returning to the start.", equipment: ["none"], sports: ["baseball", "softball"], season_phases: ["pre_season"] }, { isNew: true })).toEqual([]);
  });
});