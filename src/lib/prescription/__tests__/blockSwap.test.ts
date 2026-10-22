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
  it("keeps the real recovery block's full time without a foam roller", () => {
    const source = { name: "Mobility + foam roll", dosage: "10 min focus areas" };
    const choice = blockSwapChoices(source, "recovery", "baseball", [], ["foam_roller"])[0];
    expect(choice?.slug).toBe("recovery_gentle_mobility");
    expect(choice?.replacement.dosage).toBe("10 min focus areas");
    expect(blockSwapChoices(source, "throwing", "baseball", [], ["foam_roller"])).toEqual([]);
  });
  it("saves the no-field mix within the original item and retains its total reps and stage", () => {
    const source = { name: "10-yard starts", dosage: "7 x 10 yards @ 100%", stage: "drills" };
    const inputs = { spaceYards: 15, hill: true, sled: false, band: false, treadmill: false, readiness: "ready" as const, cnsLoad: 2, cnsCap: 4, phase: "os_q1", injuries: [], ageYears: 19 };
    const choice = blockSwapChoices(source, "speed", "baseball", ["hill"], ["open_field"], inputs)[0];
    expect(choice?.replacement.dosage).toBe(source.dosage);
    expect(choice?.replacement.stage).toBe("drills");
    expect(choice?.replacement.speedMix).toMatchObject([{ reps: 4, restSeconds: 120, category: "speed" }, { reps: 3, restSeconds: 120, category: "speed" }]);
    expect(blockSwapChoices({ name: "Flying 20s", dosage: "7 x 20 yards @ 100%" }, "speed", "baseball", ["hill"], ["open_field"], inputs)).toEqual([]);
  });
  it("does not grant speed intent to an unknown drill or a missing hill", () => {
    const inputs = { spaceYards: 10, hill: true, sled: false, band: false, treadmill: false, readiness: "ready" as const, cnsLoad: 2, cnsCap: 4, phase: "os_q1", injuries: [], ageYears: 19 };
    expect(blockSwapChoices({ name: "Unknown run", dosage: "6 x 10 yards" }, "speed", "baseball", ["hill"], ["open_field"], inputs)).toEqual([]);
    const choice = blockSwapChoices({ name: "10-yard starts", dosage: "6 x 10 yards" }, "speed", "baseball", ["hill"], ["open_field", "hill"], inputs)[0];
    expect(choice?.replacement.speedMix).toMatchObject([{ slug: "swap_short_acceleration", reps: 6, restSeconds: 60 }]);
  });
});