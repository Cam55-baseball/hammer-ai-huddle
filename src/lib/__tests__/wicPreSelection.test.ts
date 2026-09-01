import { describe, it, expect } from "vitest";
import {
  createCategoryBudget,
  createSkipLog,
  isTrainingAgeLegal,
  SINGLE_SLOT_CATEGORIES,
} from "../../../supabase/functions/_shared/wic/legality/preSelection";

// Regression suite for the "generator proposes a pick the certifier kills"
// class of failures (lift_illegal_training_age / *_duplicate_category).

describe("isTrainingAgeLegal", () => {
  const beginnerIllegal = {
    slug: "lift_box_squat_wide",
    training_age_legality: { beginner: false, developing: true, advanced: true },
  };

  it("rejects a movement the certifier would reject", () => {
    expect(isTrainingAgeLegal(beginnerIllegal, "beginner")).toBe(false);
  });

  it("allows the same movement for a class it is legal for", () => {
    expect(isTrainingAgeLegal(beginnerIllegal, "developing")).toBe(true);
  });

  it("treats a missing map as legal, exactly like the certifier", () => {
    expect(isTrainingAgeLegal({ slug: "goblet_squat" }, "beginner")).toBe(true);
    expect(isTrainingAgeLegal({ slug: "x", training_age_legality: {} }, "beginner")).toBe(true);
  });

  it("does not gate when no class is resolved", () => {
    expect(isTrainingAgeLegal(beginnerIllegal, null)).toBe(true);
  });
});

describe("category budget", () => {
  it("allows one compound_lower and refuses the second", () => {
    const budget = createCategoryBudget();
    expect(budget.hasRoom("lift", "compound_lower")).toBe(true);
    budget.commit("lift", "compound_lower");
    expect(budget.hasRoom("lift", "compound_lower")).toBe(false);
  });

  it("does not cap multi-slot categories", () => {
    const budget = createCategoryBudget();
    budget.commit("lift", "core");
    budget.commit("lift", "core");
    expect(budget.hasRoom("lift", "core")).toBe(true);
  });

  it("keeps domains independent", () => {
    const budget = createCategoryBudget();
    budget.commit("bat_speed", "elastic_rotation");
    expect(budget.hasRoom("bat_speed", "elastic_rotation")).toBe(false);
    expect(budget.hasRoom("speed", "acceleration")).toBe(true);
  });

  it("mirrors the certifier single-slot sets", () => {
    expect([...SINGLE_SLOT_CATEGORIES.lift].sort()).toEqual([
      "compound_lower",
      "compound_upper_pull",
      "compound_upper_push",
    ]);
    expect([...SINGLE_SLOT_CATEGORIES.bat_speed].sort()).toEqual([
      "elastic_rotation",
      "overload",
      "underload",
    ]);
  });
});

describe("skip log", () => {
  it("dedupes and emits warn-severity issues only", () => {
    const log = createSkipLog();
    log.record({ domain: "bat_speed", requirement: "elastic_rotation", reason: "none legal" });
    log.record({ domain: "bat_speed", requirement: "elastic_rotation", reason: "none legal" });
    expect(log.list()).toHaveLength(1);
    expect(log.warnings().every((w) => w.severity === "warn")).toBe(true);
    expect(log.has("bat_speed")).toBe(true);
    expect(log.has("lift")).toBe(false);
  });
});
