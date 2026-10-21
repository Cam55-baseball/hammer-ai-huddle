import { describe, expect, it } from "vitest";
import { validateAvailabilityInterpretation } from "../../../supabase/functions/plan-swap/conversation";

describe("server Swap interpretation is bounded by declared equipment", () => {
  it("understands an explicit missing machine and available partner without writing", () => {
    expect(validateAvailabilityInterpretation({ have: ["partner"], lacks: ["pitching_machine"] }, ["partner", "pitching_machine"]))
      .toEqual({ have: ["partner"], lacks: ["pitching_machine"] });
  });
  it("refuses model-invented equipment", () => {
    expect(() => validateAvailabilityInterpretation({ have: ["magic_machine"], lacks: ["barbell"] }, ["barbell"])) .toThrow();
  });
  it("refuses contradictory availability", () => {
    expect(() => validateAvailabilityInterpretation({ have: ["barbell"], lacks: ["barbell"] }, ["barbell"])) .toThrow();
  });
  it("requires an explicit missing item rather than guessing", () => {
    expect(() => validateAvailabilityInterpretation({ have: ["barbell"], lacks: [] }, ["barbell"])) .toThrow();
  });
});