import { describe, expect, it } from "vitest";
import { DEFAULT_PITCHER_PROFILE, shouldShowPitchingCard } from "./pitcherProfile";

describe("pitcherProfile", () => {
  it("does not throw when secondary positions arrive as arrays", () => {
    expect(() => shouldShowPitchingCard(DEFAULT_PITCHER_PROFILE, "SS", ["2B", "P"])).not.toThrow();
    expect(shouldShowPitchingCard(DEFAULT_PITCHER_PROFILE, "SS", ["2B", "P"])).toBe(true);
  });

  it("does not throw when positions arrive as object-shaped values", () => {
    expect(
      shouldShowPitchingCard(
        DEFAULT_PITCHER_PROFILE,
        { value: { label: "SS" } },
        { value: ["2B", { code: "RP" }] },
      ),
    ).toBe(true);
  });
});