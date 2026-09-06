import { describe, it, expect } from "vitest";
import {
  classifyTrack,
  computeEmphasis,
  orderByEmphasis,
  starvedTracks,
  trackGap,
  QUALITY_TRACKS,
} from "../../supabase/functions/_shared/wic/quality/tracks.ts";

const grades = {
  power: { current: 20, future: 60 }, // biggest gap
  velocity: { current: 50, future: 60 },
  work_rate: { current: 60, future: 60 },
};

describe("quality tracks — emphasis", () => {
  it("every athlete owns all three tracks", () => {
    expect(QUALITY_TRACKS).toEqual(["power", "velocity", "work_rate"]);
  });

  it("gap is never negative", () => {
    expect(trackGap({ current: 70, future: 40 })).toBe(0);
    expect(trackGap(null)).toBe(0);
  });

  it("weights sum to 1 and the largest gap wins", () => {
    const e = computeEmphasis(grades);
    expect(e.power).toBeGreaterThan(e.velocity);
    expect(e.velocity).toBeGreaterThan(e.work_rate);
    expect(e.power + e.velocity + e.work_rate).toBeCloseTo(1, 6);
  });

  it("no measured gap steers nobody", () => {
    const e = computeEmphasis({
      power: { current: 50, future: 50 },
      velocity: { current: 50, future: 50 },
      work_rate: { current: 50, future: 50 },
    });
    expect(e.power).toBeCloseTo(1 / 3, 6);
  });
});

describe("quality tracks — floors", () => {
  const pool = [
    { slug: "back_squat", role: "compound_lower" }, // velocity
    { slug: "farmer_carry", role: "carry_antirotation" }, // work_rate
    { slug: "med_ball_shot_put", role: "rotation" }, // power
  ];

  it("emphasis re-orders and never filters", () => {
    const out = orderByEmphasis(pool, grades);
    expect(out).toHaveLength(pool.length);
    expect(new Set(out.map((p) => p.slug))).toEqual(new Set(pool.map((p) => p.slug)));
    expect(out[0].slug).toBe("med_ball_shot_put");
  });

  it("an empty pool stays empty and does not throw", () => {
    expect(orderByEmphasis([], grades)).toEqual([]);
  });

  it("weak-track exposure floor: 20 in one track, 60 in another still gets a weekly exposure", () => {
    // Athlete graded 20 power / 60 work rate. Work rate has had no exposure at
    // all this week, so it must outrank the heavily emphasised power track.
    const skewed = {
      power: { current: 20, future: 70 },
      velocity: { current: 60, future: 62 },
      work_rate: { current: 60, future: 62 },
    };
    const exposure = { counts: { power: 4, velocity: 2, work_rate: 0 } };
    expect(starvedTracks(exposure)).toEqual(["work_rate"]);
    const out = orderByEmphasis(pool, skewed, exposure);
    expect(classifyTrack(out[0])).toBe("work_rate");
    expect(out).toHaveLength(pool.length);
  });

  it("unknown movements keep their canonical position and are never dropped", () => {
    const withUnknown = [...pool, { slug: "mystery_thing" }];
    const out = orderByEmphasis(withUnknown, grades);
    expect(out).toHaveLength(4);
    expect(classifyTrack({ slug: "mystery_thing" })).toBeNull();
  });
});
