import { describe, it, expect } from "vitest";
import {
  computeCatchProbability,
  computeOaeCredit,
  isConvertedOutcome,
  REACTION_SEC,
  CLOSING_SPEED_FPS,
} from "@/lib/defense/catchProbability";

describe("computeCatchProbability", () => {
  it("returns missing, never a number, when hang time is absent or invalid", () => {
    for (const t of [null, undefined, 0, -1, Number.NaN]) {
      expect(computeCatchProbability(t as any, 40)).toEqual({
        probability: null,
        missing: true,
        missing_reason: "no_hang_time",
      });
    }
  });

  it("returns missing when distance to cover is absent or invalid", () => {
    for (const d of [null, undefined, -5, Number.NaN]) {
      expect(computeCatchProbability(4, d as any)).toEqual({
        probability: null,
        missing: true,
        missing_reason: "no_distance_to_cover",
      });
    }
  });

  it("accepts a zero-distance play (ball hit right at the fielder)", () => {
    const res = computeCatchProbability(4, 0);
    expect(res.missing).toBe(false);
    expect(res.probability!).toBeGreaterThan(0.9);
  });

  it("sits near 50% when hang time exactly matches the time required", () => {
    const distance = 44; // 2.0s of closing
    const hang = REACTION_SEC + distance / CLOSING_SPEED_FPS;
    expect(computeCatchProbability(hang, distance).probability!).toBeCloseTo(0.5, 2);
  });

  it("is monotonic — more hang time never lowers the probability", () => {
    let prev = -Infinity;
    for (let t = 1; t <= 6; t += 0.1) {
      const p = computeCatchProbability(t, 60).probability!;
      expect(p).toBeGreaterThanOrEqual(prev);
      prev = p;
    }
  });

  it("is monotonic — more ground to cover never raises the probability", () => {
    let prev = Infinity;
    for (let d = 0; d <= 120; d += 5) {
      const p = computeCatchProbability(4, d).probability!;
      expect(p).toBeLessThanOrEqual(prev);
      prev = p;
    }
  });

  it("never returns absolute certainty", () => {
    expect(computeCatchProbability(20, 1).probability!).toBeLessThanOrEqual(0.99);
    expect(computeCatchProbability(0.5, 300).probability!).toBeGreaterThanOrEqual(0.01);
  });
});

describe("computeOaeCredit", () => {
  it("credits a made play above expectation", () => {
    expect(computeOaeCredit(0.25, "out")).toBeCloseTo(0.75, 3);
  });

  it("debits a missed routine play", () => {
    expect(computeOaeCredit(0.9, "hit")).toBeCloseTo(-0.9, 3);
  });

  it("returns null when probability or outcome is missing", () => {
    expect(computeOaeCredit(null, "out")).toBeNull();
    expect(computeOaeCredit(0.5, null)).toBeNull();
  });

  it("treats assists and double plays as conversions", () => {
    expect(isConvertedOutcome("assist")).toBe(true);
    expect(isConvertedOutcome("double_play")).toBe(true);
    expect(isConvertedOutcome("error")).toBe(false);
  });
});
