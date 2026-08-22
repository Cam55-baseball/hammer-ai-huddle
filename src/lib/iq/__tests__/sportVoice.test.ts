import { describe, it, expect } from "vitest";
import { iqVoice, iqVoiceOrNull } from "@/lib/iq/sportVoice";

describe("iqVoice", () => {
  it("passes baseball copy through untouched", () => {
    const t = "Pitcher works from the stretch on the mound, 90 feet away.";
    expect(iqVoice(t, "baseball")).toBe(t);
  });

  it("rewrites mound language for softball", () => {
    expect(iqVoice("Mound visit, late game", "softball")).toBe(
      "Circle visit, late game",
    );
    expect(iqVoice("P stays on the mound", "softball")).toBe(
      "P stays in the circle",
    );
  });

  it("rewrites leads and distances for softball", () => {
    expect(iqVoice("R1 takes a primary lead", "softball")).toBe(
      "R1 takes a release jump",
    );
    expect(iqVoice("90 feet to the next bag", "softball")).toBe(
      "60 feet to the next bag",
    );
  });

  it("rewrites stretch, windup and balk for softball", () => {
    expect(iqVoice("Work from the stretch", "softball")).toBe(
      "Work from the plate",
    );
    expect(iqVoice("Out of the wind-up", "softball")).toBe(
      "Out of the windmill delivery",
    );
    expect(iqVoice("That is a balk", "softball")).toBe(
      "That is a illegal pitch",
    );
  });

  it("preserves leading capitalization", () => {
    expect(iqVoice("Mound work", "softball").startsWith("C")).toBe(true);
    expect(iqVoice("the mound", "softball")).toBe("the circle");
  });

  it("is deterministic across repeated calls (replay-stable)", () => {
    const t = "Mound visit with a primary lead at 90 feet";
    expect(iqVoice(t, "softball")).toBe(iqVoice(t, "softball"));
  });

  it("keeps null semantics for optional fields", () => {
    expect(iqVoiceOrNull(null, "softball")).toBeNull();
    expect(iqVoiceOrNull("", "softball")).toBeNull();
    expect(iqVoiceOrNull("mound", "softball")).toBe("circle");
  });
});
