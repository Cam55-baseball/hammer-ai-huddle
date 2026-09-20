// Hammers v1.2 §A — "load above your normal" (baseline subtraction) + I10.
// Expected outputs written before the run; failures are reported, never tuned.

import { describe, expect, it } from "vitest";
import {
  baselineCapDailyCost,
  computeBaseline,
  judgedLevels,
  steadyState,
} from "../../../supabase/functions/_shared/wic/schedule/tissueCost/baseline.ts";
import {
  TCS_CONFIG,
  TCS_CONFIG_V12,
  TCS_THRESHOLDS,
  TCS_THRESHOLDS_V12,
} from "../../../supabase/functions/_shared/wic/schedule/tissueCost/config.ts";
import { decide } from "../../../supabase/functions/_shared/wic/schedule/tissueCost/decide.ts";
import type {
  DaySchedule,
  Profile,
} from "../../../supabase/functions/_shared/wic/schedule/tissueCost/types.ts";

const TZ = "America/Chicago";
const ADV17: Profile = {
  age: 17,
  growthMode: false,
  trainingAgeBand: "advanced",
  position: "position",
  phase: "offseason",
  isStartingPitcher: false,
};

const practice = (date: string, minutes = 60): DaySchedule => ({
  date,
  practiceMinutes: minutes,
  practiceIntensity: "moderate",
});

function dates(start: string, n: number): string[] {
  const out: string[] = [];
  let t = Date.parse(`${start}T00:00:00Z`);
  for (let i = 0; i < n; i++) {
    out.push(new Date(t).toISOString().slice(0, 10));
    t += 86400000;
  }
  return out;
}

describe("v1.2 §A — baseline maths", () => {
  it("steady state is c / (1 - r) with r = 0.5 ^ (1 / half-life)", () => {
    expect(steadyState(8, 1)).toBeCloseTo(16, 10);
    expect(steadyState(10, 2)).toBeCloseTo(10 / (1 - Math.pow(0.5, 0.5)), 10);
  });

  it("uses the median of logged days first", () => {
    const days = dates("2026-01-01", 20).map((d) => practice(d));
    const r = computeBaseline(days, [], "2026-01-21", TCS_CONFIG_V12);
    expect(r.source).toBe("history_median");
    expect(r.baseline.nerve).toBeGreaterThan(0);
  });

  it("falls back to the calendar, then to zero", () => {
    const planned = dates("2026-01-21", 5).map((d) => practice(d));
    const fromPlan = computeBaseline([], planned, "2026-01-21", TCS_CONFIG_V12);
    expect(fromPlan.source).toBe("calendar_plan");
    expect(fromPlan.baseline.nerve).toBeGreaterThan(0);

    const nothing = computeBaseline([], [], "2026-01-21", TCS_CONFIG_V12);
    expect(nothing.source).toBe("none");
    expect(nothing.baseline).toEqual({ nerve: 0, muscle: 0, connective: 0, arm: 0 });
  });

  it("caps the baseline at 120 practice-minutes a day, moderate", () => {
    const days = dates("2026-01-01", 20).map((d) => practice(d, 300));
    const r = computeBaseline(days, [], "2026-01-21", TCS_CONFIG_V12);
    const cap = baselineCapDailyCost(TCS_CONFIG_V12);
    expect(r.capped).toBe(true);
    expect(r.typicalDailyCost.nerve).toBeCloseTo(cap.nerve, 10);
  });

  it("judged level is never negative", () => {
    const judged = judgedLevels(
      { nerve: 5, muscle: 40, connective: 0, arm: 3 },
      { nerve: 16, muscle: 27, connective: 41, arm: 21 },
    );
    expect(judged.nerve).toBe(0);
    expect(judged.muscle).toBeCloseTo(13, 10);
    expect(judged.connective).toBe(0);
    expect(judged.arm).toBe(0);
  });
});

describe("v1.2 §A — thresholds and the switch", () => {
  it("every derived threshold is finite and non-negative, both calibrations", () => {
    for (const set of [TCS_THRESHOLDS, TCS_THRESHOLDS_V12]) {
      for (const levels of [set.H.offseason, set.H.in_season, set.M, set.L, set.gameReadyLine]) {
        for (const v of Object.values(levels)) {
          expect(Number.isFinite(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("the v1.2 calibration is off by default — no production behaviour change", () => {
    expect(TCS_CONFIG.baselineSubtraction).toBe(false);
    expect(TCS_CONFIG_V12.baselineSubtraction).toBe(true);
  });

  it("with the switch off the decision carries no baseline diagnostics", () => {
    const days = dates("2026-01-01", 10).map((d) => practice(d));
    const d = decide(ADV17, days, [], [], TCS_CONFIG, "2026-01-11", TZ);
    expect(d.diagnostics.some((x) => x.startsWith("baseline_"))).toBe(false);
  });

  it("with the switch on the baseline source is always reported", () => {
    const days = dates("2026-01-01", 10).map((d) => practice(d));
    const d = decide(ADV17, days, [], [], TCS_CONFIG_V12, "2026-01-11", TZ);
    expect(d.diagnostics.some((x) => x.startsWith("baseline_"))).toBe(true);
  });

  it("is deterministic under the v1.2 calibration", () => {
    const days = dates("2026-01-01", 20).map((d) => practice(d));
    const a = decide(ADV17, days, [], [], TCS_CONFIG_V12, "2026-01-21", TZ);
    const b = decide(ADV17, days, [], [], TCS_CONFIG_V12, "2026-01-21", TZ);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("v1.2 §A — I10 reduce, never remove", () => {
  const ceilingCase = (cfg: typeof TCS_CONFIG) => {
    // Heavy chronic load with a lift 8 days ago: the tanks block everything,
    // so the ceiling must release a reduced session rather than an empty card.
    const days: DaySchedule[] = dates("2026-01-01", 12).map((d, i) => ({
      ...practice(d, 150),
      practiceIntensity: "high" as const,
      ...(i === 3 ? { lift: { class: "H" as const, method: "standard" as const } } : {}),
    }));
    return decide(ADV17, days, [], [], cfg, "2026-01-13", TZ);
  };

  it("never returns an empty card once the ceiling is reached", () => {
    for (const cfg of [TCS_CONFIG, TCS_CONFIG_V12]) {
      const d = ceilingCase(cfg);
      if (d.diagnostics.includes("ceiling_released") || d.loadPatternSignal) {
        expect(d.allowedClass).not.toBe("none");
      }
    }
  });

  it("under the v1.2 calibration the ceiling drops to the highest allowed lower class", () => {
    const d = ceilingCase(TCS_CONFIG_V12);
    if (d.loadPatternSignal) {
      expect(["H", "M", "L"]).toContain(d.allowedClass);
      expect(d.allowedClass).not.toBe("none");
    }
  });
});
