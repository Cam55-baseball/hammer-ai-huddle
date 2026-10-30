import { describe, it, expect } from "vitest";
import { placeBreathing } from "./breathingPlacement";

describe("breathing placement", () => {
  it("keeps one breathing item, last in recovery, and none elsewhere", () => {
    const out = placeBreathing([
      { modality: "warmup", drills: [{ slug: "wu_crocodile_breathing" }, { slug: "wu_skip" }] },
      { modality: "strength", drills: [{ slug: "squat" }, { slug: "rc_breathing_reset" }] },
      { modality: "recovery", drills: [{ slug: "rc_breathing_reset" }, { slug: "cars" }, { slug: "ac_recovery_belly_breathing" }] },
    ]);
    expect(out[0].drills.map((d) => d.slug)).toEqual(["wu_skip"]);
    expect(out[1].drills.map((d) => d.slug)).toEqual(["squat"]);
    expect(out[2].drills.map((d) => d.slug)).toEqual(["cars", "rc_breathing_reset"]);
  });
});
