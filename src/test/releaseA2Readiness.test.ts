// Release A2 (owner-approved Nov 8): the Apple Health effect on the recovery side of that day's
// readiness. Owner Nov 9: stress and mental load were REMOVED entirely; the check-in's stress
// question stays as it was. Values come from the owner's requests.
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import {
  recoveryAdjustment, applyRecoveryAdjustment, recoveryThresholdsFrom, dayReadinessLine,
  PROPOSED_RECOVERY_THRESHOLDS as T, type HealthSampleRow, type RecoveryInputs,
} from "../../supabase/functions/_shared/readiness/recoveryAdjust";
import { loadRecoveryInputs } from "../../supabase/functions/_shared/readiness/recoveryInputsData";
import { FEATURE_KEYS } from "../../supabase/functions/_shared/wic/flags/featureSwitches";
import { METRICS, ALIASES } from "../../supabase/functions/_shared/ledger/metricDictionary";
import type { RunningReadiness } from "../../supabase/functions/_shared/readiness/runningReadiness";

const PLAN = "2026-11-20";
const day = (n: number) => new Date(Date.parse(`${PLAN}T12:00:00Z`) - n * 86_400_000).toISOString();
const empty: RecoveryInputs = { planDate: PLAN, health: [] };
const ON = { health: true };
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
const src = (f: string) => readFileSync(f, "utf8");

describe("Owner Nov 9 — mental measurement removed entirely", () => {
  it("no 'How mentally draining was it?' prompt on Mind items, Baserunning IQ or Royal timing", () => {
    for (const f of [
      "src/components/hammer/MindItemCard.tsx",
      "src/components/baserunning-iq/DailyDecision.tsx",
      "src/components/royal-timing/RoyalTimingModule.tsx",
    ]) expect(src(f)).not.toMatch(/MentalLoadPrompt|mentally draining|mental_load/i);
    expect(existsSync("src/components/mentalLoad/MentalLoadPrompt.tsx")).toBe(false);
    expect(existsSync("src/lib/mentalLoad/mentalLoad.ts")).toBe(false);
  });
  it("nothing saves mental load: no record_mental_load call and no mental_load metric in the dictionary", () => {
    expect(METRICS.some((m) => m.key === "mental_load")).toBe(false);
    expect(ALIASES.some((a) => a.key === "mental_load")).toBe(false);
    expect(src("supabase/seed/release0_metric_dictionary.sql")).not.toMatch(/"k":"mental_load"/);
    for (const f of ["src/hooks/useBaserunningDaily.ts", "src/components/hammer/MindItemCard.tsx", "src/components/royal-timing/RoyalTimingModule.tsx"]) {
      expect(src(f)).not.toMatch(/record_mental_load/);
    }
  });
  it("the mental_load_v1 switch is gone; readiness_health_v1 stays", () => {
    expect((FEATURE_KEYS as readonly string[]).includes("mental_load_v1")).toBe(false);
    expect((FEATURE_KEYS as readonly string[]).includes("readiness_health_v1")).toBe(true);
  });
  it("the stress answer no longer changes readiness, even with an old mental_load_v1 row switched on", async () => {
    const db = fakeDb({
      wk_feature_switches: [{ feature_key: "mental_load_v1", mode: "all", allowlist: null, updated_by: null }],
      vault_focus_quizzes: [{ stress_level: 5, created_at: `${PLAN}T07:00:00Z` }],
    });
    const loaded = await loadRecoveryInputs(db, "u1", PLAN);
    expect(loaded?.flags).toEqual({ health: false });
    expect(loaded?.inputs).toEqual({ planDate: PLAN, health: [] });
    const adj = recoveryAdjustment(loaded!.inputs, loaded!.flags, loaded!.thresholds);
    expect(adj.delta).toBe(0);
    expect(dayReadinessLine(running(0.6), adj)).not.toMatch(/stress|mentally/i);
  });
  it("the Coaching Console readiness settings no longer hold stress, mental-load or card-minute settings", () => {
    expect(Object.keys(T).some((k) => /stress|mental/i.test(k))).toBe(false);
    expect(src("src/components/intelligence/ReadinessInputsSettings.tsx")).not.toMatch(/stress|mental/i);
  });
  it("the check-in stress questions are still there (morning check-in and quick check-in)", () => {
    expect(src("src/components/vault/VaultFocusQuizDialog.tsx")).toMatch(/data\.stress_level = stressLevel/);
    expect(src("src/components/checkin/QuickCheckInSheet.tsx")).toMatch(/behavioral\.stress/);
  });
});

describe("Release A2 — Apple Health effect (kept)", () => {
  it("HRV and resting HR with fewer than 14 days of data have no effect", () => {
    const adj = recoveryAdjustment({ ...empty, health: [...hrv(13, 60, 30), ...rhr(13, 50, 70)] }, ON);
    expect(adj.delta).toBe(0);
    expect(adj.unknown).toEqual(expect.arrayContaining(["hrv", "resting_hr"]));
  });
  it("7-day ln(HRV) below baseline − 0.5 SD lowers readiness once 14+ days exist", () => {
    const adj = recoveryAdjustment({ ...empty, health: hrv(30, 60, 40) }, ON);
    expect(adj.chosen?.source).toBe("hrv");
    expect(adj.delta).toBe(-T.hrvLowDrop);
    expect(applyRecoveryAdjustment(running(0.6), adj)?.score).toBe(0.5);
  });
  it("HRV at or above baseline is neutral or slightly positive", () => {
    const adj = recoveryAdjustment({ ...empty, health: hrv(30, 60, 70) }, ON);
    expect(adj.delta).toBeGreaterThanOrEqual(0);
    expect(adj.delta).toBeLessThanOrEqual(T.capUp);
  });
  it("7-day resting HR more than 5 bpm above baseline lowers readiness; 4 bpm does not", () => {
    expect(recoveryAdjustment({ ...empty, health: rhr(30, 50, 62) }, ON).delta).toBe(-T.rhrDrop);
    expect(recoveryAdjustment({ ...empty, health: rhr(30, 50, 53) }, ON).delta).toBe(0);
  });
  it("low HRV and high resting HR together apply only the larger single effect, not the sum", () => {
    const t = recoveryThresholdsFrom({ rhrDrop: 0.08 });
    const adj = recoveryAdjustment({ ...empty, health: [...hrv(30, 60, 40), ...rhr(30, 50, 62)] }, ON, t);
    expect(adj.effects.length).toBe(2);
    expect(adj.delta).toBe(-0.1);
  });
  it("the cap holds even if an owner sets a bigger drop", () => {
    const t = recoveryThresholdsFrom({ hrvLowDrop: 0.5, capDown: 0.15 });
    expect(recoveryAdjustment({ ...empty, health: hrv(30, 60, 40) }, ON, t).delta).toBe(-0.15);
  });
  it("a player with no watch / no Health data is never penalized", () => {
    const adj = recoveryAdjustment(empty, ON);
    expect(adj.delta).toBe(0);
    const r = running(0.55);
    expect(applyRecoveryAdjustment(r, adj)).toBe(r);
    expect(dayReadinessLine(r, adj)).not.toMatch(/Recovery today/);
  });
  it("switch off = no Health read and no effect", async () => {
    const loaded = await loadRecoveryInputs(fakeDb({ wk_feature_switches: [] }), "u1", PLAN);
    expect(loaded?.flags).toEqual({ health: false });
    expect(recoveryAdjustment({ ...empty, health: hrv(30, 60, 40) }, loaded!.flags).delta).toBe(0);
  });
});

describe("Release A2 — physical limits and capacity unchanged", () => {
  it("the adjustment returns a new readiness and never changes the 14-day running readiness", () => {
    const r = running(0.6);
    const out = applyRecoveryAdjustment(r, recoveryAdjustment({ ...empty, health: hrv(30, 60, 40) }, ON));
    expect(out).not.toBe(r);
    expect(r.score).toBe(0.6);
  });
  it("the plan builder (throw, sprint and lift caps) and the greenlight step-up rule never read it", () => {
    for (const f of [
      "supabase/functions/wk-generate-daily/index.ts",
      "supabase/functions/_shared/wic/progression/greenlight.ts",
      "supabase/functions/_shared/wic/checkInReductions.ts",
      "src/hooks/useGreenlight.ts",
    ]) expect(src(f)).not.toMatch(/recoveryAdjust|recoveryInputsData|useDayReadiness/);
  });
  it("Today's line says workouts stay the same on a lowered-recovery day", () => {
    const adj = recoveryAdjustment({ ...empty, health: hrv(30, 60, 40) }, ON);
    expect(dayReadinessLine(running(0.6), adj)).toMatch(/Your workouts stay the same/);
  });
});

// Minimal query-builder fake: every filter returns itself; awaiting resolves the table's rows.
function fakeDb(tables: Record<string, unknown[]>) {
  return {
    from(t: string) {
      const rows = tables[t] ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b: any = {
        select: () => b, eq: () => b, in: () => b, gte: () => b, lt: () => b, lte: () => b, not: () => b, limit: () => b, order: () => b,
        maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(res),
      };
      return b;
    },
  };
}
