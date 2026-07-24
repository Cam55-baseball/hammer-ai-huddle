import { describe, it, expect } from "vitest";
import { computeHpiSignal } from "@/lib/hpi/hpiSignal";
import { defaultLifestyle } from "@/lib/hpi/lifestyleStore";
import { getSeasonHPI, type SeasonPhase } from "@/lib/seasonPhase";

const PHASES: SeasonPhase[] = ["preseason", "in_season", "post_season", "off_season"];

describe("HPI signal (Su Wen overlay)", () => {
  it("every season phase exposes element, qi directive, yin-yang, breath primer", () => {
    for (const p of PHASES) {
      const hpi = getSeasonHPI(p);
      expect(hpi.element).toBeTruthy();
      expect(hpi.qiDirective).toBeTruthy();
      expect(hpi.yinYangEmphasis).toBeTruthy();
      expect(hpi.breathPrimer).toBeTruthy();
    }
  });

  it("returns a baseline score with no lifestyle intake and marks it as a driver", () => {
    for (const p of PHASES) {
      const s = computeHpiSignal(p, null);
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(100);
      expect(s.drivers.some((d) => /lifestyle/i.test(d.label))).toBe(true);
      expect(["restore", "steady", "sharp", "peak"]).toContain(s.band);
    }
  });

  it("sleep debt reduces the score; on-target sleep does not penalize it", () => {
    const withDebt = computeHpiSignal("in_season", {
      ...defaultLifestyle(),
      sleepActualHours: 5,
      sleepTargetHours: 8,
      savedAt: new Date().toISOString(),
    });
    const onTarget = computeHpiSignal("in_season", {
      ...defaultLifestyle(),
      sleepActualHours: 8,
      sleepTargetHours: 8,
      savedAt: new Date().toISOString(),
    });
    expect(withDebt.score).toBeLessThan(onTarget.score);
  });

  it("clamps score into 0-100 even with extreme inputs", () => {
    const wrecked = computeHpiSignal("post_season", {
      ...defaultLifestyle(),
      sleepActualHours: 3,
      sleepTargetHours: 10,
      waterOz: 10,
      stressLevel: 5,
      constitution: "yang",
      savedAt: new Date().toISOString(),
    });
    expect(wrecked.score).toBeGreaterThanOrEqual(0);
    expect(wrecked.score).toBeLessThanOrEqual(100);
  });
});
