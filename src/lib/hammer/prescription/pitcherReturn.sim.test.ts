/** Owner Nov 1 round 6 Part 2 — pitcher return through the REAL shared daily builder, both sports. */
import { describe, expect, it } from "vitest";
import { buildHammerDailyPlan } from "./dailyPlan";
import { NORMAL_SIGNAL } from "./scheduleContext";
import { resolveOutingFacts } from "../../../../supabase/functions/_shared/wic/pitching/outingFacts";
import { isMoundRow, FIRST_BULLPEN_MAX, type ReturnProgram } from "../../../../supabase/functions/_shared/wic/pitching/pitcherReturn";
import type { ContextVariable, HammerAthleteContext } from "@/lib/hammer/context/athleteContext";

const gear = ["tee", "gamer_bat", "net", "field", "glove", "ball", "open_space"];
function context(values: Record<string, unknown>): HammerAthleteContext {
  const variables = Object.entries(values).map(([key, value]): ContextVariable => ({ key, value, label: key, domain: "identity", source: "test", confidence: "high", missing: false, lastUpdated: null, lineage: { owner: "test", source: "test", rawConfidence: "high" } }));
  return { variables, missing: [], missingCount: 0, isLoading: false, envelope: null, get<T>(key: string) { return variables.find(r => r.key === key) as ContextVariable<T> | undefined; } };
}
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const prog = (step: ReturnProgram["step"], sport: "baseball" | "softball"): ReturnProgram => ({ sport, started_on: "2026-06-01", days_off: 20, long_layoff: false, step, step_started_on: "2026-06-01", prescribed_dates: [], first_bullpen_on: null, completed_on: null, source: "history" });

function week(sport: "baseball" | "softball", ret: ReturnProgram | null) {
  const settings = { role: "starter" as const, rotation_anchor_date: "2026-06-05", rotation_every_days: 7, rotation_active: true, pitching_role: "starter" as const, primary_focus: null, limit_pitching: false };
  return Array.from({ length: 7 }, (_, d) => {
    const date = new Date(2026, 5, 1 + d);
    const facts = resolveOutingFacts({ planDate: iso(date), settings, outings: [], availability: [] });
    const plan = buildHammerDailyPlan(context({ sport_primary: sport, position_primary: "P", season_phase: "in", weekly_availability_days: 6, injury_history: [], equipment_effective: gear, lifecycle_band: "adult", age_years: 20, lifting_age_years: 4 }), NORMAL_SIGNAL, null, null, undefined, date,
      { subscriptionModules: [`${sport}_pitcher`], resolvedSeasonPhase: "in", pitcherOutings: facts, pitcherReturn: ret, armHistory: { rows: [] } } as any);
    const p = plan.blocks.find(b => b.modality === "pitching" && b.status === "ready");
    return { drills: (p?.drills ?? []) as any[], because: p?.because ?? [] };
  });
}

describe("pitcher return through the real builder", () => {
  for (const sport of ["baseball", "softball"] as const) {
    it(`${sport}: flat step has no mound/circle pitching, shortbox is 2/3 distance, first bullpen ≤ 25`, () => {
      const normal = week(sport, null);
      expect(normal.some(d => d.drills.some(isMoundRow))).toBe(true); // the week normally has mound/circle work
      const flat = week(sport, prog("flat", sport));
      expect(flat.every(d => !d.drills.some(isMoundRow))).toBe(true);
      expect(flat.some(d => d.because.some((b: string) => b.includes("flat ground")))).toBe(true);
      const sb = week(sport, prog("shortbox", sport));
      const sbRows = sb.flatMap(d => d.drills.filter((x: any) => x.returnStep === "shortbox"));
      expect(sbRows.length).toBeGreaterThan(0);
      expect(sbRows.every((x: any) => x.pitchTags.feet === (sport === "softball" ? 29 : 40))).toBe(true);
      const pen = week(sport, prog("bullpen", sport));
      for (const d of pen) { const m = d.drills.filter(isMoundRow); expect(m.length).toBeLessThanOrEqual(1); for (const x of m) expect(x.armEvent.count).toBeLessThanOrEqual(FIRST_BULLPEN_MAX); }
      const total = (w: ReturnType<typeof week>) => w.reduce((n, d) => n + d.drills.reduce((k: number, x: any) => k + (x.armEvent?.kind === "pitch" ? x.armEvent.count : 0), 0), 0);
      expect(total(flat)).toBeLessThanOrEqual(total(normal));
      if (sport === "softball") expect(flat.concat(sb).every(d => d.because.every((b: string) => !/mound/i.test(b) || !b.includes("Because: you")))).toBe(true);
    });
  }
});
