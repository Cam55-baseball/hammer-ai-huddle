import { describe, it, expect } from "vitest";
import {
  growthAdjustment, bandIndex, PITCH_SMART_BANDS, GROWTH_RULE, checkCaps, fatigueFlag, overlappingTeams, combineUsage,
  offseasonBreakDays, pitchUnlock, newPitchStep, velocityGate, PITCHER_CATCHER_LINE,
} from "../../../supabase/functions/_shared/wic/phases/youthThrowing";
import { armBudget } from "../../../supabase/functions/_shared/wic/phases/armLedger";
import { throwingBreakDays } from "../../../supabase/functions/_shared/wic/phases/rampLaw";
import { evaluateAutoOff } from "../../../supabase/functions/_shared/wic/flags/rollout";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");

describe("Step 26 B — growth-adjusted pitching age", () => {
  const today = "2026-10-01";
  it("13-year-old growing an inch in a month gets the younger band for 8 weeks, with the reason", () => {
    const g = growthAdjustment(13, [{ date: "2026-08-25", inches: 62 }, { date: "2026-09-24", inches: 63 }], today);
    expect(g.active).toBe(true);
    expect(g.band.label).toBe(PITCH_SMART_BANDS[bandIndex(13) - 1].label);
    expect(g.until).toBe("2026-11-19");
    expect(g.athleteLine).toBe(GROWTH_RULE.athleteLine);
    expect(g.staffLabel).toContain("growth-adjusted pitching age");
    expect(g.grounding).toContain("not a published figure");
    expect(g.capHighIntent && g.holdVolumeProgression).toBe(true);
  });
  it("window ends after 8 weeks", () => {
    const g = growthAdjustment(13, [{ date: "2026-06-01", inches: 62 }, { date: "2026-06-30", inches: 63 }], today);
    expect(g.active).toBe(false);
  });
  it("two inches drop two bands and extend to 16 weeks; floor is the youngest band", () => {
    const g = growthAdjustment(13, [{ date: "2026-09-01", inches: 60 }, { date: "2026-09-28", inches: 62 }], today);
    expect(g.bandsDropped).toBe(2);
    expect(g.until).toBe("2027-01-18");
    const f = growthAdjustment(8, [{ date: "2026-09-01", inches: 50 }, { date: "2026-09-28", inches: 53 }], today);
    expect(f.band.label).toBe(PITCH_SMART_BANDS[0].label);
  });
  it("under an inch never triggers", () => {
    expect(growthAdjustment(13, [{ date: "2026-09-01", inches: 60 }, { date: "2026-09-28", inches: 60.9 }], today).active).toBe(false);
  });
});

describe("Step 26 C — caps block further pitching when reached", () => {
  const z = { week: 0, season: 0, year: 0, inningsYear: 0 };
  it("weekly", () => expect(checkCaps(12, "youth", { ...z, week: 100 }, 10).blocked).toBe(true));
  it("season", () => expect(checkCaps(13, "youth", { ...z, season: 1000 }, 10).blocked).toBe(true));
  it("annual", () => expect(checkCaps(14, "youth", { ...z, year: 3000 }, 10).blocked).toBe(true));
  it("innings", () => expect(checkCaps(16, "high_school", { ...z, inningsYear: 100 }, 0, 1).blocked).toBe(true));
  it("warns as a cap fills", () => expect(checkCaps(12, "youth", { ...z, week: 75 }, 10).warnings.join()).toMatch(/Weekly/));
  it("fatigue flag stops the outing", () => {
    expect(fatigueFlag({ checkInFatigued: true }).stopOuting).toBe(true);
    expect(fatigueFlag({ veloDropPct: 0.06 }).flagged).toBe(true);
    expect(fatigueFlag({}).flagged).toBe(false);
  });
  it("overlapping teams combine into one limit", () => {
    const o = overlappingTeams([{ team: "A", start: "2026-09-01", end: "2026-11-01" }, { team: "B", start: "2026-09-15", end: "2026-12-01" }], "2026-10-01");
    expect(o.overlap).toBe(true);
    const u = combineUsage([{ week: 60, season: 500, year: 900, inningsYear: 40 }, { week: 50, season: 520, year: 800, inningsYear: 30 }]);
    expect(checkCaps(12, "youth", u, 0).blocked).toBe(true);
  });
});

describe("Step 26 C6 — pitcher-catcher tightened budget and flag", () => {
  it("combined budget is below both pitcher and catcher alone", () => {
    const pc = armBudget({ sport: "baseball", role: "pitcher_catcher", age: 15 });
    const p = armBudget({ sport: "baseball", role: "pitcher", age: 15 });
    const c = armBudget({ sport: "baseball", role: "catcher", age: 15 });
    expect(pc.daily).toBeLessThanOrEqual(Math.floor(Math.min(p.daily, c.daily) * 0.7) + 1);
    expect(PITCHER_CATCHER_LINE).toMatch(/three times/);
  });
});

describe("Step 27 B — Hammers offseason-to-off-days ratio", () => {
  it("base 4 per month: 4-month offseason opens with 16 no-throw days", () => {
    expect(offseasonBreakDays(120, { age: 20 }).days).toBe(16);
    expect(throwingBreakDays(120, 17).days).toBe(16);
  });
  it("under 18 rises to 5–8 per month from the athlete's own signals, never flat", () => {
    const a = offseasonBreakDays(120, { age: 16, painLast90d: true });
    const b = offseasonBreakDays(120, { age: 16, painLast90d: true, growthFlag: true, armTankLow: true, heavyLastSeason: true });
    expect(a.perMonth).toBe(5);
    expect(b.perMonth).toBe(8);
    expect(offseasonBreakDays(120, { age: 13, growthFlag: true, painLast90d: true, heavyLastSeason: true, armTankLow: true, poorPriorBreakTolerance: true }).perMonth).toBe(8);
    expect(a.rule).toMatch(/Hammers rule/);
  });
  it("the fixed annual rest rule is gone", () => {
    const src = fs.readFileSync(path.join(ROOT, "supabase/functions/_shared/wic/phases/rampLaw.ts"), "utf8");
    expect(src).not.toMatch(/ageContinuousRestDays/);
    expect(throwingBreakDays(120, 13).days).toBeLessThanOrEqual(32);
  });
});

describe("Step 27 C/D — readiness, not birthdays", () => {
  const ready = { commandAtIntent: true, cleanMechanics: true, capacityMarkersMet: true, painLast30d: false, insideBudget: true, growthWindow: false };
  it("a new pitch unlocks only on readiness, and never by age", () => {
    expect(pitchUnlock(ready).unlocked).toBe(true);
    expect(pitchUnlock({ ...ready, growthWindow: true }).unlocked).toBe(false);
    expect(pitchUnlock({ ...ready, painLast30d: true }).missing).toContain("30 days with no arm pain");
  });
  it("new pitch share builds gradually and pain pulls it back a step", () => {
    expect(newPitchStep(0, true, false).step).toBe(1);
    expect(newPitchStep(2, true, true).step).toBe(1);
    expect(newPitchStep(0, false, false).share).toBe(0.1);
  });
  it("velocity work is open at every age through the readiness gates, mechanics alongside", () => {
    const v = { rampComplete: true, capacityMarkersMet: true, painFlag: false, insideBudgets: true, growthWindow: false };
    expect(velocityGate(v)).toMatchObject({ unlocked: true, withMechanics: true });
    expect(velocityGate({ ...v, rampComplete: false }).unlocked).toBe(false);
  });
  it("no age unlock table or under-14 velocity block remains", () => {
    const src = fs.readFileSync(path.join(ROOT, "supabase/functions/_shared/wic/phases/youthThrowing.ts"), "utf8");
    expect(src).not.toMatch(/curveball|slider|knuckle|screwball|forkball|splitter/i);
    expect(src).not.toMatch(/age\s*<\s*14/);
  });
});

describe("Step 26 A — the nightly auto-off", () => {
  it("zero criticals keeps the switch where it is; one critical steps it down", () => {
    const ok = { mode: "all" as const, shadowCheck: { status: "passed", mismatches: 0, fallbackRate: 0 }, errorsToday: 0, baselineErrors: 0 };
    expect(evaluateAutoOff({ ...ok, criticalNotes: 0 }).demoted).toBe(false);
    expect(evaluateAutoOff({ ...ok, criticalNotes: 1 }).demoted).toBe(true);
  });
  it("no live exercise slug in code carries an outside name", () => {
    const hits: string[] = [];
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) { if (!/node_modules|migrations/.test(p)) walk(p); continue; }
        if (!/\.(ts|tsx)$/.test(e.name)) continue;
        const m = fs.readFileSync(p, "utf8").match(/["'](ac_|lift_|sp_)?(cressey|driveline|jobes|oates|heenan|poliquin|summers|holler|pfaff|triphasic)_[a-z0-9_]+["']/g);
        if (m) hits.push(...m.filter((x) => !/cressey_sp/.test(x)).map((x) => `${p}: ${x}`));
      }
    };
    walk(path.join(ROOT, "supabase/functions"));
    walk(path.join(ROOT, "src/lib"));
    expect(hits).toEqual([]);
  });
});
