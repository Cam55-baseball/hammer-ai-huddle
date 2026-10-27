import { describe, expect, it } from "vitest";
import { catalogMeasure } from "../catalogMeasure";

describe("existing catalog tracking initialization", () => {
  it.each([
    ["warmup_hold", "Wall hold", "warmup", "seconds", "hold_seconds"],
    ["recovery_walk", "Recovery walk", "recovery", "seconds", "duration"],
    ["catch_play", "Catch play", "throwing", "throws", "throw_count"],
    ["broad_jump", "Broad jump", "speed", "feet", "jump_distance"],
    ["bunt_drag", "Drag bunt", "hitting", "attempts", "bunt_attempts"],
    ["shoulder_circles", "Shoulder circles", "warmup", "reps", "reps"],
  ])("keeps %s in its declared tracking kind", (slug, name, category, dosage_unit, expected) => {
    expect(catalogMeasure({ slug, name, category, dosage_unit })).toBe(expected);
  });
});