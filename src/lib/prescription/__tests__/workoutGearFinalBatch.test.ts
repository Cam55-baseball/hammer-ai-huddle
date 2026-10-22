import { describe, expect, it } from "vitest";
import { ownsAllGear, avoidsMissingGear } from "../../../../supabase/functions/_shared/planSwap/simpleSwap";

describe("source-supported workout gear final batch", () => {
  const carry = { equipment: [], equipment_requirements: [], equipment_alternatives: [["dumbbell"], ["farmer_handles"]] };
  it("Farmer's Carry accepts dumbbells OR actual carry handles, never neither", () => {
    expect(ownsAllGear(carry, ["dumbbell"])).toBe(true);
    expect(ownsAllGear(carry, ["farmer_handles"])).toBe(true);
    expect(ownsAllGear(carry, [])).toBe(false);
    expect(ownsAllGear(carry, ["barbell", "rack"])).toBe(false);
  });
  it("missing one carry implement leaves only the other complete option", () => {
    expect(avoidsMissingGear(carry, ["dumbbell"])).toBe(true);
    expect(avoidsMissingGear(carry, ["dumbbell", "farmer_handles"])).toBe(false);
  });
  it("Banded Lateral Squat Walk requires the actual mini band", () => {
    const walk = { equipment: ["mini_band"], equipment_requirements: ["mini_band"], equipment_alternatives: [] };
    expect(ownsAllGear(walk, ["bodyweight"])).toBe(false);
    expect(ownsAllGear(walk, ["mini_band"])).toBe(true);
    expect(avoidsMissingGear(walk, ["mini_band"])).toBe(false);
  });
});