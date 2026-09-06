import { describe, it, expect } from "vitest";
import {
  coldStartWaveWeek,
  detectReload,
  type CheckIn,
} from "../../supabase/functions/_shared/wic/reload/detector.ts";

const TODAY = "2026-03-20";

function days(n: number, patch: Partial<CheckIn>): CheckIn[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.parse(`${TODAY}T00:00:00Z`) - i * 86_400_000);
    return { date: d.toISOString().slice(0, 10), ...patch };
  });
}

const trained = { today: TODAY, sessionsLogged: 30, weeksTraining: 8, lastReloadDate: "2026-02-20" };

describe("reload detector — triggers", () => {
  it("one hard signal fires a reload with a plain-English reason", () => {
    const d = detectReload({ ...trained, checkins: days(1, { painFlag: true }) });
    expect(d.reload).toBe(true);
    expect(d.reason).toContain("This week is a reload");
    expect(d.reason).toContain("pain");
    expect(d.reason).toContain("You ramp back next week");
  });

  it("one soft signal alone does not fire", () => {
    const d = detectReload({ ...trained, checkins: days(3, { readiness: 3 }) });
    expect(d.signals.filter((s) => s.kind === "soft")).toHaveLength(1);
    expect(d.reload).toBe(false);
    expect(d.reason).toBeNull();
  });

  it("two soft signals inside seven days fire", () => {
    const d = detectReload({ ...trained, checkins: days(3, { readiness: 3 }), rirDriftUp: true });
    expect(d.reload).toBe(true);
    expect(d.reason).toContain("readiness has been 4 or below on 3 of the last 5 days");
    expect(d.reason).toContain("leaving more reps in the tank");
  });

  it("output down more than 5% is a soft signal, 5% or less is not", () => {
    expect(
      detectReload({ ...trained, checkins: [], outputTrendPct: -6 }).signals.some((s) => s.key === "output"),
    ).toBe(true);
    expect(
      detectReload({ ...trained, checkins: [], outputTrendPct: -4 }).signals.some((s) => s.key === "output"),
    ).toBe(false);
  });
});

describe("reload detector — guardrails", () => {
  it("cannot fire inside the first two weeks of training", () => {
    const d = detectReload({ ...trained, weeksTraining: 1, checkins: days(1, { painFlag: true }) });
    expect(d.reload).toBe(false);
  });

  it("cannot fire twice inside fourteen days", () => {
    const d = detectReload({ ...trained, lastReloadDate: "2026-03-15", checkins: days(1, { painFlag: true }) });
    expect(d.reload).toBe(false);
  });

  it("forces a reload at six weeks with nothing fired", () => {
    const d = detectReload({ ...trained, lastReloadDate: "2026-01-20", checkins: [] });
    expect(d.reload).toBe(true);
    expect(d.forced).toBe(true);
    expect(d.reason).toContain("six weeks straight");
  });

  it("the week after a reload ramps back in the lower half", () => {
    const d = detectReload({ ...trained, lastReloadDate: "2026-03-16", checkins: [] });
    expect(d.reload).toBe(false);
    expect(d.rampWeek).toBe(1);
  });
});

describe("reload detector — cold start", () => {
  it("falls back to a four-week wave anchored to the athlete's own start date", () => {
    const d = detectReload({
      today: TODAY,
      checkins: days(2, { readiness: 7 }),
      sessionsLogged: 3,
      weeksTraining: 1,
      programStartDate: "2026-03-02",
    });
    expect(d.coldStart).toBe(true);
    expect(d.reload).toBe(false);
    expect(coldStartWaveWeek("2026-03-02", "2026-03-02")).toBe(1);
    expect(coldStartWaveWeek("2026-03-23", "2026-03-02")).toBe(4);
    expect(coldStartWaveWeek(TODAY, null)).toBe(2);
  });
});
