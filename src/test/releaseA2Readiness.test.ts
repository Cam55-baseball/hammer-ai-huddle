// Release A2 (owner-approved Nov 8): stress, mental load and the Apple Health effect on the
// recovery side of that day's readiness. Values come from the owner's request.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  recoveryAdjustment, applyRecoveryAdjustment, recoveryThresholdsFrom, dayReadinessLine,
  PROPOSED_RECOVERY_THRESHOLDS as T, type HealthSampleRow, type RecoveryInputs,
} from "../../supabase/functions/_shared/readiness/recoveryAdjust";
import { loadRecoveryInputs } from "../../supabase/functions/_shared/readiness/recoveryInputsData";
import { mentalLoadValue, resolveMinutes } from "@/lib/mentalLoad/mentalLoad";
import type { RunningReadiness } from "../../supabase/functions/_shared/readiness/runningReadiness";

const PLAN = "2026-11-20";
const day = (n: number) => new Date(Date.parse(`${PLAN}T12:00:00Z`) - n * 86_400_000).toISOString();
const empty: RecoveryInputs = { planDate: PLAN, stress: [], mentalLoads: [], health: [] };
const ON = { mentalLoad: true, health: true };
const running = (score = 0.6): RunningReadiness => ({ score, band: score < 0.4 ? "low" : score >= 0.7 ? "high" : "normal", painFlag: false, loadRatio: 1, completionRate: 1, reasons: [], missing: [], windowDays: 14 });

/** HRV samples: `baseDays` days at baseMs, then the last 7 days at recentMs. */
function hrv(baseDays: number, baseMs: number, recentMs: number, jitter = 0.05): HealthSampleRow[] {
  const out: HealthSampleRow[] = [];
  for (let i = 0; i < baseDays; i++) {
    const ms = i < 7 ? recentMs : baseMs * (1 + (i % 2 ? jitter : -jitter));
    out.push({ captured_at: day(i), metric: "hrv_sdnn", hrv_ms: ms, source: "healthkit" });
  }
  return out;
}
function rhr(baseDays: number, base: number, recent: number): HealthSampleRow[] {
  return Array.from({ length: baseDays }, (_, i) => ({ captured_at: day(i), metric: "resting_hr", rhr_bpm: i < 7 ? recent : base + (i % 2 ? 1 : -1), source: "healthkit" }));
}

describe("Release A2 — stress answer", () => {
  it("a stressed check-in answer (5 of 5) lowers that day's readiness", () => {
    const adj = recoveryAdjustment({ ...empty, stress: [{ at: `${PLAN}T07:00:00Z`, value: 5, scale: 5 }] }, ON);
    expect(adj.chosen?.source).toBe("stress");
    expect(adj.delta).toBe(-0.1);
    expect(applyRecoveryAdjustment(running(0.6), adj)?.score).toBe(0.5);
  });
  it("a calm answer (3 of 5) changes nothing; no answer is unknown, never guessed", () => {
    expect(recoveryAdjustment({ ...empty, stress: [{ at: `${PLAN}T07:00:00Z`, value: 3, scale: 5 }] }, ON).delta).toBe(0);
    const none = recoveryAdjustment(empty, ON);
    expect(none.delta).toBe(0);
    expect(none.unknown).toContain("stress");
  });
  it("the saved morning check-in stress answer is what the readiness reads", async () => {
    const db = fakeDb({
      wk_feature_switches: [{ feature_key: "mental_load_v1", mode: "all", allowlist: null, updated_by: null }],
      vault_focus_quizzes: [{ stress_level: 4, created_at: `${PLAN}T07:00:00Z` }],
    });
    const loaded = await loadRecoveryInputs(db, "u1", PLAN);
    expect(loaded?.inputs.stress).toEqual([{ at: `${PLAN}T07:00:00Z`, value: 4, scale: 5 }]);
    expect(recoveryAdjustment(loaded!.inputs, loaded!.flags, loaded!.thresholds).delta).toBe(-0.05);
  });
  it("switches off = no reads and no effect", async () => {
    const loaded = await loadRecoveryInputs(fakeDb({ wk_feature_switches: [] }), "u1", PLAN);
    expect(loaded?.flags).toEqual({ mentalLoad: false, health: false });
    expect(recoveryAdjustment({ ...empty, stress: [{ at: PLAN, value: 5, scale: 5 }] }, loaded!.flags).delta).toBe(0);
  });
});

describe("Release A2 — mental load", () => {
  it("mental load = rating × minutes (tracked time wins over prescribed)", () => {
    const tracked = resolveMinutes({ trackedMinutes: 12, kind: "tex_vision", prescribed: { tex_vision: 20 } });
    expect(tracked).toEqual({ minutes: 12, source: "tracked" });
    expect(mentalLoadValue(6, tracked)).toBe(72);
    const prescribed = resolveMinutes({ trackedMinutes: null, kind: "royal_timing", prescribed: { royal_timing: 15 } });
    expect(mentalLoadValue(4, prescribed)).toBe(60);
  });
  it("a skipped answer or unknown minutes stays unknown (null), never guessed", () => {
    expect(mentalLoadValue(null, { minutes: 10, source: "prescribed" })).toBeNull();
    expect(resolveMinutes({ trackedMinutes: null, kind: "situations", prescribed: {} })).toBeNull();
    expect(mentalLoadValue(7, null)).toBeNull();
  });
  it("yesterday at 2× the player's own normal lowers readiness; too few answered days = unknown", () => {
    const normal = Array.from({ length: 6 }, (_, i) => ({ activity_date: day(i + 2).slice(0, 10), value: 50 }));
    const heavy = recoveryAdjustment({ ...empty, mentalLoads: [...normal, { activity_date: day(1).slice(0, 10), value: 100 }] }, ON);
    expect(heavy.chosen?.source).toBe("mental_load");
    expect(heavy.delta).toBe(-0.1);
    const thin = recoveryAdjustment({ ...empty, mentalLoads: [normal[0], { activity_date: day(1).slice(0, 10), value: 100 }] }, ON);
    expect(thin.unknown).toContain("mental_load");
    expect(thin.delta).toBe(0);
  });
});

describe("Release A2 — larger single effect, with a cap", () => {
  it("stress, mental load and low HRV together apply only the largest one, not the sum", () => {
    const normal = Array.from({ length: 6 }, (_, i) => ({ activity_date: day(i + 2).slice(0, 10), value: 50 }));
    const adj = recoveryAdjustment({
      planDate: PLAN,
      stress: [{ at: PLAN, value: 5, scale: 5 }],                                   // −0.10
      mentalLoads: [...normal, { activity_date: day(1).slice(0, 10), value: 80 }],  // 1.6× → −0.05
      health: hrv(30, 60, 40),                                                      // low HRV → −0.10
    }, ON);
    expect(adj.effects.length).toBe(3);
    expect(adj.delta).toBe(-0.1);
  });
  it("the cap holds even if an owner sets a bigger drop", () => {
    const t = recoveryThresholdsFrom({ stressStep: 0.5, capDown: 0.15 });
    expect(recoveryAdjustment({ ...empty, stress: [{ at: PLAN, value: 5, scale: 5 }] }, ON, t).delta).toBe(-0.15);
  });
});

describe("Release A2 — Apple Health effect", () => {
  it("HRV and resting HR with fewer than 14 days of data have no effect", () => {
    const adj = recoveryAdjustment({ ...empty, health: [...hrv(13, 60, 30), ...rhr(13, 50, 70)] }, ON);
    expect(adj.delta).toBe(0);
    expect(adj.unknown).toEqual(expect.arrayContaining(["hrv", "resting_hr"]));
  });
  it("7-day ln(HRV) below baseline − 0.5 SD lowers readiness once 14+ days exist", () => {
    const adj = recoveryAdjustment({ ...empty, health: hrv(30, 60, 40) }, { mentalLoad: false, health: true });
    expect(adj.chosen?.source).toBe("hrv");
    expect(adj.delta).toBe(-T.hrvLowDrop);
  });
  it("HRV at or above baseline is neutral or slightly positive", () => {
    const adj = recoveryAdjustment({ ...empty, health: hrv(30, 60, 70) }, { mentalLoad: false, health: true });
    expect(adj.delta).toBeGreaterThanOrEqual(0);
    expect(adj.delta).toBeLessThanOrEqual(T.capUp);
  });
  it("7-day resting HR more than 5 bpm above baseline lowers readiness; 4 bpm does not", () => {
    expect(recoveryAdjustment({ ...empty, health: rhr(30, 50, 62) }, { mentalLoad: false, health: true }).delta).toBe(-T.rhrDrop);
    expect(recoveryAdjustment({ ...empty, health: rhr(30, 50, 53) }, { mentalLoad: false, health: true }).delta).toBe(0);
  });
  it("a player with no watch / no Health data is never penalized", () => {
    const adj = recoveryAdjustment(empty, ON);
    expect(adj.delta).toBe(0);
    const r = running(0.55);
    expect(applyRecoveryAdjustment(r, adj)).toBe(r);
    expect(dayReadinessLine(r, adj)).not.toMatch(/Recovery today/);
  });
});

describe("Release A2 — physical limits and capacity unchanged", () => {
  it("the adjustment returns a new readiness and never changes the 14-day running readiness", () => {
    const r = running(0.6);
    const out = applyRecoveryAdjustment(r, recoveryAdjustment({ ...empty, stress: [{ at: PLAN, value: 5, scale: 5 }] }, ON));
    expect(out).not.toBe(r);
    expect(r.score).toBe(0.6);
  });
  it("the plan builder (throw, sprint and lift caps) and the greenlight step-up rule never read it", () => {
    for (const f of [
      "supabase/functions/wk-generate-daily/index.ts",
      "supabase/functions/_shared/wic/progression/greenlight.ts",
      "supabase/functions/_shared/wic/checkInReductions.ts",
      "src/hooks/useGreenlight.ts",
    ]) expect(readFileSync(f, "utf8")).not.toMatch(/recoveryAdjust|recoveryInputsData|useDayReadiness/);
  });
  it("Today's line says workouts stay the same on a lowered-recovery day", () => {
    const adj = recoveryAdjustment({ ...empty, stress: [{ at: PLAN, value: 5, scale: 5 }] }, ON);
    expect(dayReadinessLine(running(0.6), adj)).toMatch(/Your workouts stay the same/);
  });
});

// Minimal query-builder fake: every filter returns itself; awaiting resolves the table's rows.
function fakeDb(tables: Record<string, unknown[]>) {
  return {
    from(t: string) {
      const rows = tables[t] ?? [];
      const b: any = {
        select: () => b, eq: () => b, in: () => b, gte: () => b, lt: () => b, lte: () => b, not: () => b, limit: () => b, order: () => b,
        maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(res),
      };
      return b;
    },
  };
}
