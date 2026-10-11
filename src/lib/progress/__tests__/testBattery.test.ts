import { describe, it, expect } from "vitest";
import { progressFor, slowestQuality, sideImbalances, relativeStrength } from "../testBattery";

const o = (key: string, value: number, at: string, side: string | null = "any") => ({ key, value, at, side });

describe("progress from the player's own numbers", () => {
  it("baseline is the average of the first two results", () => {
    const p = progressFor([o("test.broad_jump_in", 90, "2026-01-01"), o("test.broad_jump_in", 94, "2026-01-08"), o("test.broad_jump_in", 99, "2026-03-01")]);
    expect(p[0].baseline).toBe(92);
    expect(p[0].changePct).toBe(7.6);
  });
  it("a faster sprint counts as better", () => {
    const p = progressFor([o("test.sprint_10yd_s", 2.0, "2026-01-01"), o("test.sprint_10yd_s", 1.9, "2026-02-01")]);
    expect(p[0].changePct).toBeGreaterThan(0);
  });
  it("slowest-improving quality is the declining one", () => {
    const p = progressFor([
      o("test.broad_jump_in", 90, "1"), o("test.broad_jump_in", 99, "2"),
      o("test.bat_speed_mph", 60, "1"), o("test.bat_speed_mph", 58, "2"),
    ]);
    expect(slowestQuality(p)?.key).toBe("test.bat_speed_mph");
  });
  it("names the weaker side over 10%", () => {
    const p = progressFor([o("test.sl_broad_jump_in", 60, "1", "left"), o("test.sl_broad_jump_in", 72, "1", "right")]);
    expect(sideImbalances(p)).toEqual([{ label: "Single-leg broad jump", weaker: "left", diffPct: 16.7 }]);
  });
  it("relative strength needs a verified max and a body weight", () => {
    expect(relativeStrength(300, 150)).toBe(2);
    expect(relativeStrength(null, 150)).toBeNull();
  });
});
