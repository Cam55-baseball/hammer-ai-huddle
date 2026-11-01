import { describe, it, expect } from "vitest";
import { weekColor, greenlightAll, readyThresholdFrom, type DayCheckIn, type AreaWeek } from "../../../supabase/functions/_shared/wic/progression/greenlight";

// Owner Nov 1: GOOD >= 60% (4–5 of 5), OKAY 40–59% (3), LOW < 40% (1–2). 1–5 → (r-1)/4.
const n = (r: number) => (r - 1) / 4;
const WS = "2026-10-19";
const days = (scores: number[], pain = false): DayCheckIn[] =>
  scores.map((r, i) => ({ date: `2026-10-${String(19 + i).padStart(2, "0")}`, readiness: n(r), pain: pain && i === 0 }));
const wk = (done: number): AreaWeek => ({ weekStart: WS, prescribed: 20, completed: Math.round(20 * done) });
const READY = readyThresholdFrom({ readyAt: 0.6, okayAt: 0.4 })!;

describe("owner check-in thresholds", () => {
  it("scale mapping: 4–5 GOOD, 3 OKAY, 1–2 LOW", () => {
    expect(n(4)).toBeGreaterThanOrEqual(0.6);
    expect(n(3)).toBeGreaterThanOrEqual(0.4); expect(n(3)).toBeLessThan(0.6);
    expect(n(2)).toBeLessThan(0.4);
  });
  it("GREEN: 85% done, 5 GOOD days, others OKAY", () => {
    expect(weekColor(wk(0.85), days([4, 5, 4, 4, 5, 3, 3]), READY)).toBe("green");
  });
  it("HOLD: 5 GOOD days but one LOW day", () => {
    expect(weekColor(wk(0.9), days([4, 5, 4, 4, 5, 3, 2]), READY)).toBe("mixed");
  });
  it("HOLD: only 4 GOOD days", () => {
    expect(weekColor(wk(0.9), days([4, 4, 4, 4, 3, 3, 3]), READY)).toBe("mixed");
  });
  it("HOLD: 84% done", () => {
    expect(weekColor(wk(0.8), days([5, 5, 5, 5, 5, 5, 5]), READY)).toBe("mixed");
  });
  it("RED: pain flag", () => {
    expect(weekColor(wk(1), days([5, 5, 5, 5, 5, 5, 5], true), READY)).toBe("red");
  });
  it("RED: under 60% done", () => {
    expect(weekColor(wk(0.55), days([5, 5, 5, 5, 5, 5, 5]), READY)).toBe("red");
  });
  it("RED: 3 low days", () => {
    expect(weekColor(wk(1), days([2, 1, 2, 4, 4, 4, 4]), READY)).toBe("red");
  });
  it("rule is ON with the saved value: adult green week steps up, red steps back", () => {
    const today = "2026-11-02";
    const greenAll = greenlightAll({ hitting: [wk(0.9)] } as any, days([4, 5, 4, 4, 5, 3, 3]), today, 25, READY);
    expect(greenAll.hitting.change).toBe(1);
    const held = greenlightAll({ hitting: [wk(0.9)] } as any, days([4, 5, 4, 4, 5, 3, 2]), today, 25, READY);
    expect(held.hitting.change).toBe(0);
    const red = greenlightAll({ hitting: [wk(0.9), { ...wk(0.5), weekStart: "2026-10-26" }] } as any, days([4, 5, 4, 4, 5, 3, 3]), today, 25, READY);
    expect(red.hitting.change).toBe(-1);
    expect(greenAll.bunting.change).toBe(0);
  });
});
