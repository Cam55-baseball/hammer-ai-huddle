import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
// Owner Nov 5 round 2 Part 3: the starting questions never appear inside the assessment.
describe("starting questions placement", () => {
  it("assessment profile check has no starting section", () => {
    const src = readFileSync("src/components/assessment/AssessmentProfileReview.tsx", "utf8");
    expect(src).not.toContain("StartingPointForm");
    expect(src).not.toContain('"Where are you starting from?"');
  });
});
