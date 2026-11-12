import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { trainingPracticesOf } from "../../../supabase/functions/_shared/wic/schedule/practiceDay";
import { recentLoadEffect } from "../../../supabase/functions/_shared/wic/recovery/recentLoad";
import { PLAN_RULES_VERSION } from "../../../supabase/functions/_shared/planRulesVersion";

const PLAN = "2026-11-12";
const row = (o: Record<string, unknown>) => ({ scheduled_date: PLAN, status: "scheduled", intensity: "standard", practice_kind: "team", session_module: "hitting", session_type: null, ...o });

describe("Owner Nov 12 — practice-day check follows the shared rule", () => {
  it("a Baserunning IQ session alone doesn't make a practice day", () => {
    expect(trainingPracticesOf([row({ session_module: "baserunning_iq" })])).toHaveLength(0);
  });
  it("Travel/Other notes don't make a practice day", () => {
    expect(trainingPracticesOf([row({ session_module: "note", practice_kind: "other" }), row({ practice_kind: "travel" })])).toHaveLength(0);
  });
  it("a real practice still makes a practice day (blank kind counts as before)", () => {
    expect(trainingPracticesOf([row({}), row({ practice_kind: null })])).toHaveLength(2);
  });
  it("the plan builder and the athlete context both use the shared rule", () => {
    const src = readFileSync("supabase/functions/wk-generate-daily/index.ts", "utf8");
    expect(src).toContain("const trainingPractices = trainingPracticesOf(practiceRows);");
    const ctx = readFileSync("supabase/functions/_shared/wic/athleteContext.ts", "utf8");
    expect(ctx).toContain("countsAsPractice(r)");
    expect(ctx).not.toContain("(input.practicesToday ?? []).length > 0");
  });
});

describe("Owner Nov 12 — recent-load check follows the shared rule", () => {
  const base = { planDate: PLAN, games: [], outingDates: [] as string[] };
  const hard = (o: Record<string, unknown>) => row({ intensity: "high", ...o });
  it("a Travel note adds no recent load", () => {
    const r = recentLoadEffect({ ...base, practices: [hard({ scheduled_date: "2026-11-10", practice_kind: "travel" }), hard({ scheduled_date: "2026-11-11", session_module: "note", practice_kind: "other" })] });
    expect(r.practices).toBe(0);
    expect(r.applied).toBe(false);
  });
  it("a Baserunning IQ session adds no recent load", () => {
    const r = recentLoadEffect({ ...base, practices: [hard({ scheduled_date: "2026-11-10", session_module: "baserunning_iq" }), hard({ scheduled_date: "2026-11-11", session_module: "baserunning_iq" })] });
    expect(r.practices).toBe(0);
  });
  it("real practices still count exactly as before", () => {
    const r = recentLoadEffect({ ...base, practices: [hard({ scheduled_date: "2026-11-10" }), hard({ scheduled_date: "2026-11-11" })] });
    expect(r.practices).toBe(2);
    expect(r.applied).toBe(true);
  });
  it("the plan builder reads the fields the rule needs", () => {
    const src = readFileSync("supabase/functions/wk-generate-daily/index.ts", "utf8");
    expect(src).toContain('select("scheduled_date, status, intensity, practice_kind, session_module, session_type")');
  });
  it("rules version bumped so saved future days refresh", () => {
    expect(PLAN_RULES_VERSION).toBe(16);
  });
});
