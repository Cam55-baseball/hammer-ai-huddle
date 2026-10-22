import { describe, expect, it } from "vitest";
import { blockSwapChoices } from "../../../../supabase/functions/_shared/planSwap/blockSwap";

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
});