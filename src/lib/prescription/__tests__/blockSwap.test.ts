import { describe, expect, it } from "vitest";
import { blockKnownGear, blockSwapChoices } from "../../../../supabase/functions/_shared/planSwap/blockSwap";

describe("saved machine block alternatives", () => {
  const source = { name: "Live BP or machine", dosage: "40 swings", stage: "full_go" };
  it("keeps original dose and execution stage for partner flips", () => {
    const choice = blockSwapChoices(source, "hitting", "baseball", ["gamer_bat", "baseballs", "partner"], ["pitching_machine"])[0];
    expect(choice.replacement.dosage).toBe("40 swings");
    expect(choice.replacement.stage).toBe("full_go");
    expect(choice.slug).toBe("flip_drill");
  });
  it("requires a real partner and sport-specific ball", () => {
    expect(blockSwapChoices(source, "hitting", "baseball", ["gamer_bat", "baseballs"], [])).toEqual([]);
    expect(blockSwapChoices(source, "hitting", "softball", ["gamer_bat", "baseballs", "partner"], [])).toEqual([]);
  });
  it("never accepts missing partner or category spill-over", () => {
    expect(blockSwapChoices(source, "hitting", "baseball", ["gamer_bat", "baseballs", "partner"], ["partner"])).toEqual([]);
    expect(blockSwapChoices(source, "throwing", "baseball", ["gamer_bat", "baseballs", "partner"], [])).toEqual([]);
  });
  it("replaces the declared foam-roller sibling without changing dose or stage", () => {
    const source = { slug: "wu_foam_roll_tspine", name: "T-spine foam roll extensions", dosage: "8 slow reps", stage: "prep" };
    expect(blockKnownGear(source, "warmup", "baseball")).toEqual(["foam_roller"]);
    for (const modality of ["warmup", "recovery"]) {
      const choice = blockSwapChoices(source, modality, "baseball", [], ["foam_roller"])[0];
      expect(choice?.slug).toBe("wu_tspine_open_book");
      expect(choice?.replacement.dosage).toBe("8 slow reps");
      expect(choice?.replacement.stage).toBe("prep");
    }
  });
  it("does not create a fallback from an unknown drill name", () => {
    expect(blockSwapChoices({name: "Unknown foam roller work", dosage: "8 reps"}, "recovery", "baseball", [], ["foam_roller"])).toEqual([]);
  });
});