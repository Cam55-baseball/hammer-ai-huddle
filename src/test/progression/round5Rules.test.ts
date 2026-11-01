import { describe, expect, it } from "vitest";
import { startingLevels, questionsFor, golden2wayRoleMissing, EASING_BACK_LIFT_SHARE } from "../../../supabase/functions/_shared/wic/progression/startingPoint";
import { greenlightAll, readyThresholdFrom, greenlightFraction, type AreaWeek, type DayCheckIn } from "../../../supabase/functions/_shared/wic/progression/greenlight";
import { applyGreenlightPlan } from "@/lib/hammer/prescription/greenlightPlan";

const base = { last_trained: "Right now", throw_days: "3–4", throws_per_day: "25–50", throw_distance: "90–120 ft", defense_days: "3–4", defense_reps: "50–100" };

describe("owner Nov 1 round 5 — starting levels", () => {
  it("defense throw share adds defense throws to the starting throw count", () => {
    const none = startingLevels("baseball", "5tool", { ...base, defense_throw_share: "0–25%" }, 200);
    const most = startingLevels("baseball", "5tool", { ...base, defense_throw_share: "75–100%" }, 200);
    // 3.5 days × 75 reps × 12.5% ≈ 33; × 87.5% ≈ 230; base 3.5 × 37.5 ≈ 131
    expect(none.defenseThrowsPerWeek).toBe(33);
    expect(most.defenseThrowsPerWeek).toBe(230);
    expect(most.throwsPerWeek).toBe(131 + 230);
  });
  it("throwing distance question asks about 70% effort with no pain and sets the start distance", () => {
    expect(questionsFor("baseball", "5tool").find((q) => q.id === "throw_distance")!.label).toBe("How far can you throw at about 70% effort with no pain?");
    expect(startingLevels("baseball", "5tool", base, 200).startThrowDistanceFt).toBe(90);
    expect(startingLevels("softball", "5tool", { ...base, throw_distance: "150+ ft" }, 200).startThrowDistanceFt).toBe(150);
  });
  it("easing back in lifting starts at 65–70% weight", () => {
    expect(EASING_BACK_LIFT_SHARE).toBeGreaterThanOrEqual(0.65);
    expect(EASING_BACK_LIFT_SHARE).toBeLessThanOrEqual(0.7);
    expect(greenlightFraction("lifting", EASING_BACK_LIFT_SHARE, 1)).toBeCloseTo(EASING_BACK_LIFT_SHARE * 1.05, 5);
  });
  it("easing back in keeps the same sets", () => {
    const block = { modality: "strength", status: "ready", because: [], drills: [{ name: "Squat", dosage: "4 x 5", stage: "drills" }] } as any;
    const out = applyGreenlightPlan([block], null, { lifting: EASING_BACK_LIFT_SHARE })[0];
    expect(out.drills[0].dosage).toBe("4 x 5");
    expect(out.because.join(" ")).toMatch(/68% of your normal weight with the same sets/);
  });
  it("Golden 2Way must pick a main role; other programs never need one", () => {
    expect(golden2wayRoleMissing("baseball", ["baseball_golden2way"], null)).toBe(true);
    expect(golden2wayRoleMissing("baseball", ["baseball_golden2way"], "position")).toBe(false);
    expect(golden2wayRoleMissing("softball", ["baseball_golden2way"], null)).toBe(false);
    expect(golden2wayRoleMissing("baseball", ["baseball_5tool"], null)).toBe(false);
  });
});

describe("owner Nov 1 round 5 — one ready threshold, holds until set", () => {
  const wk = "2026-10-05";
  const week = (p: number, c: number): AreaWeek[] => [{ weekStart: wk, prescribed: p, completed: c }];
  const days = (n: number, r: number): DayCheckIn[] => Array.from({ length: n }, (_, i) => ({ date: `2026-10-0${5 + i}`, readiness: r, pain: false }));
  const weeks = { throwing: week(10, 10), hitting: week(10, 10), defense: week(10, 10), bunting: week(10, 10), speed: week(10, 10), conditioning: week(10, 10), lifting: week(10, 10), jumps: week(10, 10), pitching: week(10, 10) };
  it("unset or invalid threshold → nobody steps up or back", () => {
    for (const v of [null, {}, { readyAt: 0 }, { readyAt: 2 }, { readyAt: "0.6" }]) expect(readyThresholdFrom(v)).toBeNull();
    const all = greenlightAll(weeks, days(7, 0.9), "2026-10-14", 25, null);
    for (const r of Object.values(all)) { expect(r.level).toBe(0); expect(r.change).toBe(0); }
  });
  it("test value 0.6: readiness 0.7 on 7 days is green; 0.8 threshold makes it mixed", () => {
    expect(greenlightAll(weeks, days(7, 0.7), "2026-10-14", 25, readyThresholdFrom({ readyAt: 0.6 })).hitting.level).toBe(1);
    expect(greenlightAll(weeks, days(7, 0.7), "2026-10-14", 25, 0.8).hitting.level).toBe(0);
  });
  it("every progressing area steps; bunts are never gated", () => {
    const all = greenlightAll(weeks, days(7, 0.9), "2026-10-14", 25, 0.6);
    for (const a of ["throwing", "hitting", "defense", "speed", "lifting", "jumps", "pitching"] as const) expect(all[a].level).toBe(1);
    expect(all.bunting.level).toBe(0);
    expect(all.bunting.because).toMatch(/bunting rules/);
  });
});
