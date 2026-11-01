import { describe, expect, it } from "vitest";
import { suggestNutritionTargets } from "./targetSuggestions";
import { effectivePitchingRole } from "../../../supabase/functions/_shared/wic/pitching/outingFacts";

const adult = { weightLbs: 176, heightInches: 70, age: 20, sex: "male" as const, activityLevel: "very_active" as const, goalType: "maintain" as const };

describe("Owner Nov 1 D2 — nutrition suggestions", () => {
  it("protein 1.4–2.0 g/kg and high-load carbs 6–10 g/kg for an adult (80 kg)", () => {
    const r = suggestNutritionTargets(adult);
    if (!r.ok) throw new Error("expected ok");
    expect(r.protein).toMatchObject({ min: 112, max: 160 });
    expect(r.carbs).toMatchObject({ min: 479, max: 798 });
    expect(r.hydration).toMatchObject({ min: 88, max: 118 });
  });
  it("adult weight-loss goal lowers calories", () => {
    const keep = suggestNutritionTargets(adult);
    const cut = suggestNutritionTargets({ ...adult, goalType: "lose_weight" });
    if (!keep.ok || !cut.ok) throw new Error("expected ok");
    expect(cut.calories!.min).toBeLessThan(keep.calories!.min);
  });
  it("under 18 never gets a calorie cut and is told to talk with a parent or professional", () => {
    const keep = suggestNutritionTargets({ ...adult, age: 15, goalType: "maintain" });
    const cut = suggestNutritionTargets({ ...adult, age: 15, goalType: "lose_weight" });
    if (!keep.ok || !cut.ok) throw new Error("expected ok");
    expect(cut.calories).toEqual(keep.calories);
    expect(cut.minor).toBe(true);
    expect(cut.notes.join(" ")).toMatch(/parent or a professional/);
    expect(cut.notes.join(" ")).toMatch(/Weight-loss amounts aren't suggested under 18/);
  });
  it("no weight = no numbers", () => {
    expect(suggestNutritionTargets({ ...adult, weightLbs: null }).ok).toBe(false);
  });
});

describe("Owner Nov 1 D1 — pitching days card is the one source for the role", () => {
  it("a Starter on the card answers the pitching-role question", () => {
    expect(effectivePitchingRole({ role: "starter", pitching_role: null })).toBe("starter");
  });
  it("an explicit answer wins; reliever without an answer stays unknown", () => {
    expect(effectivePitchingRole({ role: "reliever", pitching_role: "closer" })).toBe("closer");
    expect(effectivePitchingRole({ role: "reliever", pitching_role: null })).toBeNull();
  });
});
