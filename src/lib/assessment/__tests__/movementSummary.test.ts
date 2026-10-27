import { describe, expect, it } from "vitest";
import { movementSummary } from "../movementSummary";
describe("saved movement presentation", () => {
  it("retains a measured side while the absent side remains unknown", () => {
    expect(movementSummary({ observations: { shoulder_ir: { left: "42", leftStatus: "limited" } } })).toMatchObject([{ left: "42", right: null, leftScore: 1, rightScore: null }]);
  });
  it("does not invent observations from absent data", () => expect(movementSummary({})).toEqual([]));
  it("preserves reported pain rather than turning it into a diagnosis", () => expect(movementSummary({ observations: { hip_er: { rightStatus: "pain" } } })[0]).toMatchObject({ rightStatus: "pain", right: null, rightScore: 0 }));
});