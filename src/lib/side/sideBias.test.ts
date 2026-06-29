import { describe, it, expect } from "vitest";
import { computeSideBias, SIDE_BIAS_MIN_PCT } from "./sideBias";

describe("computeSideBias", () => {
  it("returns null for null input", () => {
    expect(computeSideBias(null)).toBeNull();
  });

  it("returns null for even", () => {
    expect(
      computeSideBias({ favored: "even", diffPct: 0, leftN: 10, rightN: 10 }),
    ).toBeNull();
  });

  it("returns null when samples below threshold", () => {
    expect(
      computeSideBias({ favored: "R", diffPct: 0.2, leftN: 2, rightN: 5 }),
    ).toBeNull();
  });

  it("returns null when asymmetry below floor", () => {
    expect(
      computeSideBias({ favored: "R", diffPct: SIDE_BIAS_MIN_PCT - 0.01, leftN: 5, rightN: 5 }),
    ).toBeNull();
  });

  it("biases the WEAKER side (opposite of favored)", () => {
    const r = computeSideBias({ favored: "R", diffPct: 0.15, leftN: 5, rightN: 5 });
    expect(r).not.toBeNull();
    expect(r!.weakerSide).toBe("L");
    expect(r!.extraSetMultiplier).toBeGreaterThan(1);
    expect(r!.extraSetMultiplier).toBeLessThanOrEqual(1.2);
  });

  it("caps multiplier at 1.20 even for huge asymmetry", () => {
    const r = computeSideBias({ favored: "L", diffPct: 0.8, leftN: 10, rightN: 10 });
    expect(r!.weakerSide).toBe("R");
    expect(r!.extraSetMultiplier).toBe(1.2);
  });
});
