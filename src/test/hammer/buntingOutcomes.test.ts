import { describe, expect, it } from "vitest";
import { recordedBuntOutcomes } from "../../../supabase/functions/_shared/wic/buntingOutcomes";
describe("canonical bunting outcome groups", () => {
  it("keeps type and batting side separate and counts explicit success only", () => {
    expect(recordedBuntOutcomes([
      { batter_side: "R", bunt_type: "drag", bunt_success: true },
      { batter_side: "R", bunt_type: "drag", bunt_success: false },
      { batter_side: "L", bunt_type: "drag", bunt_success: false },
      { batter_side: "R", bunt_type: "squeeze", bunt_success: true },
    ])).toEqual([{ side: "R", type: "drag", attempts: 2, successes: 1 }, { side: "L", type: "drag", attempts: 1, successes: 0 }, { side: "R", type: "squeeze", attempts: 1, successes: 1 }]);
  });
  it("unknown outcomes, legacy generic types and switch identity are not failures or inferred sides", () => {
    expect(recordedBuntOutcomes([{ batter_side: "R", bunt_type: "drag" }, { batter_side: "S", bunt_type: "drag", bunt_success: true }, { batter_side: "L", bunt_type: "sacrifice", bunt_success: false }])).toEqual([]);
  });
});