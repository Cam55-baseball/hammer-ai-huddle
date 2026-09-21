// Tissue Cost Scheduler — property-based reliability suite (spec §7, I1–I9).
//
// This vitest slice is a single-threaded smoke check (default 200 seasons, ~90s).
// The v1.1 §7 fast tier of >= 2,000 seasons runs in parallel:
//   bun scripts/audits/tcs-property-sweep.ts 2000 8 20260920   (~146s, 8 workers)
// and daily inside the project via the tcs-test-runner edge function, which
// writes its result to public.tcs_test_runs.
// The full ≥100,000-season sweep runs through scripts/audits/tcs-property-sweep.ts
// (16 workers, ~20 min) and on the nightly workflow. The seed is printed either
// way, so any failure can be replayed exactly.

import { describe, expect, it } from "vitest";
import { addDays, classRank, decide, decideOn, runSweep, TCS_CONFIG } from "./harness.ts";
import {
  TCS_THRESHOLDS,
  TCS_CONFIG_HASH,
} from "../../../supabase/functions/_shared/wic/schedule/tissueCost/config.ts";
import type { Profile } from "../../../supabase/functions/_shared/wic/schedule/tissueCost/types.ts";

const SEED = Number(process.env.TCS_SEED ?? 20260920);
const SEASONS = Number(process.env.TCS_SEASONS ?? 200);

describe("TCS property suite (I1–I9)", () => {
  it(`holds every invariant across ${SEASONS} simulated athlete-seasons`, () => {
    // eslint-disable-next-line no-console
    console.log(`[tcs] property sweep seed=${SEED} seasons=${SEASONS}`);
    const r = runSweep({ seed: SEED, seasons: SEASONS });
    if (r.violations.length) {
      // eslint-disable-next-line no-console
      console.error(`[tcs] REPLAY WITH: TCS_SEED=${SEED} TCS_SEASONS=${SEASONS}`);
      // eslint-disable-next-line no-console
      console.error(JSON.stringify(r.violations.slice(0, 10), null, 2));
    }
    expect(r.violations).toEqual([]);
    expect(r.daysChecked).toBeGreaterThan(SEASONS * 300);
  }, Math.max(600_000, SEASONS * 1_200));
});

describe("TCS — threshold derivation and drift protection", () => {
  it("thresholds are derived, positive and finite", () => {
    for (const levels of [
      TCS_THRESHOLDS.H.offseason,
      TCS_THRESHOLDS.H.in_season,
      TCS_THRESHOLDS.M,
      TCS_THRESHOLDS.L,
      TCS_THRESHOLDS.gameReadyLine,
    ]) {
      for (const v of Object.values(levels)) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThan(0);
      }
    }
  });

  it("config hash is stamped on every decision and is stable", () => {
    const p: Profile = { age: 17, trainingAgeBand: "advanced", phase: "offseason" };
    const d = decide(p, [], [], [], TCS_CONFIG, "2026-01-09", "UTC");
    expect(d.configHash).toBe(TCS_CONFIG_HASH);
    expect(d.version).toBe("tcs_v1");
  });
});

describe("TCS — I8 calendar safety", () => {
  const p: Profile = {
    age: 17,
    trainingAgeBand: "advanced",
    phase: "offseason",
    position: "position",
  };
  const edgeDates = [
    "2024-02-28", // leap day boundary
    "2024-02-29",
    "2024-03-01",
    "2025-12-31",
    "2026-01-01",
    "2026-03-08", // US DST spring forward
    "2026-11-01", // US DST fall back
    "2026-10-04", // AU DST
  ];

  it("works across leap day, month and year ends and DST changes", () => {
    for (const today of edgeDates) {
      const days = [0, 1, 2, 3, 4].map((i) => ({
        date: addDays(today, -5 + i),
        practiceMinutes: 60,
        lift: i === 0 ? { class: "H" as const, method: "standard" as const } : null,
      }));
      for (const tz of ["UTC", "America/Chicago", "Australia/Sydney", "Pacific/Honolulu"]) {
        const d = decide(p, days, [], [], TCS_CONFIG, today, tz);
        expect(["H", "M", "L", "none"]).toContain(d.allowedClass);
        expect(d.reasons.length).toBeGreaterThan(0);
        if (d.nextHeavyDate) {
          const off =
            (Date.parse(`${d.nextHeavyDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000;
          expect(off).toBeGreaterThanOrEqual(0);
          expect(off).toBeLessThanOrEqual(10);
        }
      }
    }
  });
});

describe("TCS — I3 / I4 targeted", () => {
  const base: Profile = {
    age: 17,
    trainingAgeBand: "advanced",
    phase: "offseason",
    position: "position",
  };
  const season = {
    profile: base,
    startDate: "2026-01-01",
    timezone: "America/Chicago",
    checkIns: [],
    days: [0, 1, 2, 3, 4, 5].map((i) => ({
      date: addDays("2026-01-01", i),
      practiceMinutes: 45,
      lift: i === 0 ? { class: "M" as const } : null,
    })),
  };

  it("I3 — adding load never raises the class or pulls the heavy day in", () => {
    const today = "2026-01-06";
    const plain = decideOn(season as never, today);
    const heavier = decideOn(season as never, today, {
      days: season.days.map((d) => ({
        ...d,
        practiceMinutes: (d.practiceMinutes ?? 0) + 120,
        jumpContacts: { tier3: 40 },
      })),
    } as never);
    expect(classRank(heavier.allowedClass)).toBeLessThanOrEqual(classRank(plain.allowedClass));
    if (plain.nextHeavyDate && heavier.nextHeavyDate) {
      expect(heavier.nextHeavyDate >= plain.nextHeavyDate).toBe(true);
    }
  });

  it("I4 — a worse check-in never pulls the lift earlier", () => {
    const today = "2026-01-06";
    const plain = decideOn(season as never, today);
    const worse = decideOn(season as never, today, {
      checkIns: season.days.map((d) => ({ date: d.date, poorSleep: true, highSoreness: true })),
    } as never);
    expect(classRank(worse.allowedClass)).toBeLessThanOrEqual(classRank(plain.allowedClass));
    if (plain.nextHeavyDate && worse.nextHeavyDate) {
      expect(worse.nextHeavyDate >= plain.nextHeavyDate).toBe(true);
    }
  });

  it("I2 — same inputs give byte-identical output", () => {
    const a = decideOn(season as never, "2026-01-06");
    const b = decideOn(season as never, "2026-01-06");
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });
});
