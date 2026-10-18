import { describe, it, expect } from "vitest";
import { pitchTypeLabel, pitchTypes } from "./sportRules";

describe("softball pitch names", () => {
  it("softball players are offered softball pitches, not a slider", () => {
    const names = pitchTypes("softball").map((p) => p.full);
    expect(names).toContain("Riseball");
    expect(names).not.toContain("Slider");
  });
  it("a stored softball drop reads as Dropball, never the raw code", () => {
    expect(pitchTypeLabel("softball", "drop")).toBe("Dropball");
  });
});
