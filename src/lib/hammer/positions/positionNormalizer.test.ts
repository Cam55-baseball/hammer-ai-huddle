import { describe, expect, it } from "vitest";
import {
  coercePositionTokens,
  firstPositionToken,
  positionTokenIsPitcher,
} from "./positionNormalizer";

describe("positionNormalizer", () => {
  it("coerces separated position strings", () => {
    expect(coercePositionTokens("P, SS / 2B; CF")).toEqual(["P", "SS", "2B", "CF"]);
  });

  it("coerces arrays and nested object-shaped position values", () => {
    expect(
      coercePositionTokens([
        { value: "2B" },
        { label: "SS/P" },
        [{ position: "CF" }, null],
      ]),
    ).toEqual(["2B", "SS", "P", "CF"]);
  });

  it("detects pitchers across all supported shapes without throwing", () => {
    expect(positionTokenIsPitcher(["2B", { code: "SP" }])).toBe(true);
    expect(positionTokenIsPitcher({ value: ["SS", "Pitcher"] })).toBe(true);
    expect(positionTokenIsPitcher({ value: { label: "2B" } })).toBe(false);
  });

  it("returns the first usable token for primary-position consumers", () => {
    expect(firstPositionToken({ value: [null, "SS", "P"] })).toBe("SS");
    expect(firstPositionToken(undefined)).toBeNull();
  });
});