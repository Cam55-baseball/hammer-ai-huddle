import { describe, expect, it } from "vitest";
import { speedRowSwap, type SpeedFacts } from "./speedRowSwap";

const facts: SpeedFacts = { spaceYards: 15, hill: true, sled: false, band: false, treadmill: false, readiness: "ready", cnsLoad: 2, cnsCap: 10, phase: "os_q2", injuries: [], ageYears: 20 };
const source = { slug: "sp_sport_stance_start", category: "speed_lab", speed_category: "acceleration" };
const rx = { sets: 3, reps: null, total_reps: null, distance_feet: 60, intent_tag: null };

describe("speedRowSwap", () => {
  it("keeps the 3 acceleration reps and applies 1 min per 10 yd rest", () => {
    const c = speedRowSwap(source, rx, ["open_field"], facts)!;
    expect(c.slug).toBe("swap_hill_acceleration");
    expect(c.totalReps).toBe(3);
    expect(c.distanceFeet).toBe(45);
    expect(c.restSeconds).toBe(90);
    expect(c.reason).toMatch(/^Because/);
  });
  it("uses short accelerations when the hill is missing", () => {
    expect(speedRowSwap(source, rx, ["open_field", "hill"], facts)!.slug).toBe("swap_short_acceleration");
  });
  it("never turns top-speed work into accelerations", () => {
    expect(speedRowSwap({ ...source, speed_category: "top_speed" }, rx, ["open_field"], facts)).toBeNull();
  });
  it("needs open field to be the missing item", () => {
    expect(speedRowSwap(source, rx, ["barbell"], facts)).toBeNull();
  });
  it("refuses when readiness is unknown", () => {
    expect(speedRowSwap(source, rx, ["open_field"], { ...facts, readiness: null })).toBeNull();
  });
});
