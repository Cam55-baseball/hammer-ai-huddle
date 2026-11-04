/**
 * LOCKED BY OWNER NOV 4 (round 4) — invariant tests. Do not loosen, skip or rewrite these to
 * make a change pass; a failure here means a locked owner rule regressed.
 */
import { describe, expect, it } from "vitest";
import { buildHammerDailyPlan } from "@/lib/hammer/prescription/dailyPlan";
import { buildEassPrescription, type EassContext } from "@/lib/hammer/prescription/eassLibrary";
import { withCooldownInRecovery } from "@/lib/hammer/prescription/throwPlacement";
import { NORMAL_SIGNAL } from "@/lib/hammer/prescription/scheduleContext";
import type { ContextVariable, HammerAthleteContext } from "@/lib/hammer/context/athleteContext";
import { PLAN_RULES_VERSION, staleSavedDates } from "../../supabase/functions/_shared/planRulesVersion";
import { factsFromRows } from "../../supabase/functions/_shared/wic/throwing/readCatchPlayFacts";
import { catchPlayPlanInputs, earnStatus, DEFAULT_CATCH_PLAY_STANDARDS } from "../../supabase/functions/_shared/wic/throwing/catchPlay";
import { armStrengthUnlockPrompt } from "@/lib/hammer/armStrengthUnlock";

function ctx(values: Record<string, unknown>): HammerAthleteContext {
  const variables = Object.entries(values).map(([key, value]): ContextVariable => ({ key, value, label: key, domain: "identity", source: "test", confidence: "high", missing: false, lastUpdated: null, lineage: { owner: "test", source: "test", rawConfidence: "high" } }));
  return { variables, missing: [], missingCount: 0, isLoading: false, envelope: null, get<T>(key: string) { return variables.find((r) => r.key === key) as ContextVariable<T> | undefined; } };
}
const gear = ["field", "glove", "ball", "bands", "partner", "net", "bucket"];
const MINUTES = /\b\d+(\s*[-–]\s*\d+)?\s*(min|mins|minutes)\b/i;
const THROW_ITEM = /catch|toss|throw/i;
const COOL = /cooldown|cool-down|cool down/i;

const eassBase: EassContext = { sport: "baseball", position: "infield", seasonPhase: "off", ageYears: 17, trainingAgeYears: 3, injuryRegions: [], armSore: false, isGameDay: false, isThrowingDay: true, isRecoveryDay: false, readinessScore: 0.8 };

describe("locked by owner Nov 4 r4 — (1) catch play is counted in throws, never minutes", () => {
  it("locked by owner Nov 4 r4: no EASS throwing item in any mode is prescribed in minutes", () => {
    const variants: Partial<EassContext>[] = [{}, { injuryRegions: ["shoulder"] }, { injuryRegions: ["elbow"] }, { isRecoveryDay: true }, { isGameDay: true }, { isThrowingDay: false }, { seasonPhase: "in" }, { seasonPhase: "pre" }, { position: "pitcher" }, { position: "outfield" }, { position: "catcher" }];
    for (const sport of ["baseball", "softball"] as const) for (const v of variants) {
      const p = buildEassPrescription({ ...eassBase, sport, ...v });
      for (const d of p.drills) if (THROW_ITEM.test(d.name)) expect(`${d.name}: ${d.dosage}`).not.toMatch(MINUTES);
      expect(p.drills.some((d) => /sub-max catch play/i.test(d.name))).toBe(false);
    }
  });
  it("locked by owner Nov 4 r4: arm-protected days use the counted light-catch ladder", () => {
    const p = buildEassPrescription({ ...eassBase, injuryRegions: ["shoulder"] });
    const rows = p.drills.filter((d) => /^Light catch/.test(d.name));
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.dosage).toMatch(/\d+ft x \d+ throws/);
  });
  for (const sport of ["baseball", "softball"] as const) it(`locked by owner Nov 4 r4: ${sport} built days have no warm-up or throwing item in minutes (8 weeks)`, () => {
    for (let d = 0; d < 56; d++) {
      const plan = buildHammerDailyPlan(ctx({ sport_primary: sport, position_primary: "SS", season_phase: d < 21 ? "off" : d < 42 ? "pre" : "in", age_years: 18, lifecycle_band: "college", lifting_age_years: 2, development_priorities: ["throwing"], weekly_availability_days: 6, injury_history: [], equipment_effective: gear }), NORMAL_SIGNAL, null, null, undefined, new Date(2026, 0, 5 + d), { subscriptionModules: [`${sport}_5tool`] });
      for (const b of plan.blocks) for (const x of b.drills) {
        if (b.modality === "warmup" && THROW_ITEM.test(x.name) || b.modality === "throwing" || b.modality === "pitching") {
          if (THROW_ITEM.test(x.name)) expect(`${x.name}: ${x.dosage}`).not.toMatch(MINUTES);
        }
      }
    }
  });
});

describe("locked by owner Nov 4 r4 — (2) arm cool-down lives in Recovery, never the warm-up", () => {
  for (const sport of ["baseball", "softball"] as const) for (const mods of [[`${sport}_5tool`], [`${sport}_pitcher`], [`${sport}_golden2way`]]) {
    it(`locked by owner Nov 4 r4: ${sport} ${mods[0]} — no cool-down in warm-up; when prescribed it is on Recovery (8 weeks)`, () => {
      let seen = 0;
      for (let d = 0; d < 56; d++) {
        const plan = buildHammerDailyPlan(ctx({ sport_primary: sport, position_primary: mods[0].endsWith("pitcher") ? "P" : "SS", season_phase: d < 28 ? "off" : "in", age_years: 18, lifecycle_band: "college", lifting_age_years: 2, development_priorities: ["throwing"], weekly_availability_days: 6, injury_history: [], equipment_effective: gear }), NORMAL_SIGNAL, null, null, undefined, new Date(2026, 0, 5 + d), { subscriptionModules: mods });
        for (const b of plan.blocks) {
          if (b.modality === "recovery") { if (b.drills.some((x) => COOL.test(x.name))) seen++; continue; }
          expect(b.drills.filter((x) => COOL.test(x.name)).map((x) => `${b.modality}: ${x.name}`)).toEqual([]);
        }
      }
      expect(seen).toBeGreaterThan(0);
    });
  }
  it("locked by owner Nov 4 r4: placement moves the row unchanged and opens Recovery if missing", () => {
    const toSteps = (d: readonly { name: string }[]) => d.map((x) => x.name);
    const cool = { name: "Arm-care cooldown", dosage: "sleeper stretch 2x30s per side" };
    const out = withCooldownInRecovery([{ modality: "warmup", status: "ready", title: "Warm-up", steps: [], drills: [{ name: "CARs" }, cool] }], { toSteps });
    expect(out[0].drills.map((x) => x.name)).toEqual(["CARs"]);
    const r = out.find((b) => b.modality === "recovery")!;
    expect(r.drills[0]).toMatchObject(cool);
  });
});

describe("locked by owner Nov 4 r4 — (3) no drift after rule changes", () => {
  const row = (plan_date: string, v: number | null, updated_at = "2026-11-04T16:15:00Z") => ({ plan_date, payload: v == null ? {} : { rules_version: v }, updated_at });
  it("locked by owner Nov 4 r4: older-rules days today and later rebuild; past, current and logged days stay", () => {
    const rows = [row("2026-11-03", null), row("2026-11-04", null), row("2026-11-05", 1), row("2026-11-06", PLAN_RULES_VERSION), row("2026-11-07", null)];
    expect(staleSavedDates(rows, { today: "2026-11-04", protectedDates: new Set(["2026-11-07"]), latestClipAt: null })).toEqual(["2026-11-04", "2026-11-05"]);
  });
  it("locked by owner Nov 4 r4: a newer analyzed throwing clip than the save rebuilds that day", () => {
    const rows = [row("2026-11-05", PLAN_RULES_VERSION, "2026-11-04T10:00:00Z"), row("2026-11-06", PLAN_RULES_VERSION, "2026-11-04T20:00:00Z")];
    expect(staleSavedDates(rows, { today: "2026-11-04", protectedDates: new Set(), latestClipAt: "2026-11-04T12:00:00Z" })).toEqual(["2026-11-05"]);
  });
});

describe("locked by owner Nov 4 r4 — (4) clip → prompt → arm-strength gate → rebuild chain", () => {
  const today = "2026-11-04";
  const green = Array.from({ length: 14 }, (_, i) => ({ entry_date: `2026-10-${String(22 + Math.min(i, 9)).padStart(2, "0")}`, physical_readiness: 5, pain_location: [], soreness_locations: [], stiffness_locations: [] }));
  const checks = [1, 2].map((n) => ({ plan_date: `2026-11-0${n}`, payload: { outcome: "full", maxDistanceFt: 120, positionDistanceFt: 120 } }));
  const video = { id: "v1", created_at: "2026-11-03T18:00:00Z", module: "throwing", sport: "baseball" };
  const gate = (findings: any[], videos: any[]) => {
    const f = factsFromRows({ quizzes: green, findings, checks, answers: {}, videos }, "baseball");
    return earnStatus(catchPlayPlanInputs(f, { today, sport: "baseball", position: "IF", age: 20 }).earn as any ?? ({} as any), DEFAULT_CATCH_PLAY_STANDARDS);
  };
  it("locked by owner Nov 4 r4: a completed clean throwing clip hides the prompt and counts as the gate's clip", () => {
    expect(armStrengthUnlockPrompt({ throwingToday: true, lastThrowingClipIso: null, today, freshDays: 60 })).not.toBeNull();
    expect(armStrengthUnlockPrompt({ throwingToday: true, lastThrowingClipIso: video.created_at, today, freshDays: 60 })).toBeNull();
    const f = factsFromRows({ quizzes: green, findings: [], checks, answers: {}, videos: [video] }, "baseball");
    expect(f.clips).toEqual([{ date: "2026-11-03", faultKeys: [] }]);
    const p = catchPlayPlanInputs(f, { today, sport: "baseball", position: "IF", age: 20 });
    expect(p.earn.unlockMessage).toBeNull();
  });
  it("locked by owner Nov 4 r4: the gate reads that clip's faults against armRiskFaults", () => {
    const risky = factsFromRows({ quizzes: green, findings: [{ video_id: "v1", skill_domain: "throwing", sport: "baseball", created_at: video.created_at, fault_key: "th_across_body" }], checks, answers: {}, videos: [video] }, "baseball");
    expect(risky.clips).toEqual([{ date: "2026-11-03", faultKeys: ["th_across_body"] }]);
    const p = catchPlayPlanInputs(risky, { today, sport: "baseball", position: "IF", age: 20 });
    expect(p.earn.armStrength).toBe(false);
    const unmarked = factsFromRows({ quizzes: green, findings: [{ video_id: "v1", skill_domain: "throwing", sport: "baseball", created_at: video.created_at, fault_key: "th_no_crow_hop" }], checks, answers: {}, videos: [video] }, "baseball");
    expect(catchPlayPlanInputs(unmarked, { today, sport: "baseball", position: "IF", age: 20 }).earn.unlockMessage).toBeNull();
    void gate;
  });
  it("locked by owner Nov 4 r4: the saved day before the clip is rebuilt so the plan uses it", () => {
    expect(staleSavedDates([{ plan_date: "2026-11-05", payload: { rules_version: PLAN_RULES_VERSION }, updated_at: "2026-11-03T10:00:00Z" }], { today, protectedDates: new Set(), latestClipAt: video.created_at })).toEqual(["2026-11-05"]);
  });
});
