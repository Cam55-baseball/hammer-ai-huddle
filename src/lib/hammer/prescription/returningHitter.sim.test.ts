/** Owner Nov 1 round 6 Part 3 — returning hitters through the REAL shared daily builder, both sports. */
import { describe, expect, it } from "vitest";
import { buildHammerDailyPlan } from "./dailyPlan";
import { NORMAL_SIGNAL } from "./scheduleContext";
import { pitchSourceOf, type HitterProgram } from "../../../../supabase/functions/_shared/wic/hitting/returningHitter";
import type { ContextVariable, HammerAthleteContext } from "@/lib/hammer/context/athleteContext";

const gear = ["tee", "gamer_bat", "net", "field", "glove", "ball", "open_space", "pitching_machine"];
function context(values: Record<string, unknown>): HammerAthleteContext {
  const variables = Object.entries(values).map(([key, value]): ContextVariable => ({ key, value, label: key, domain: "identity", source: "test", confidence: "high", missing: false, lastUpdated: null, lineage: { owner: "test", source: "test", rawConfidence: "high" } }));
  return { variables, missing: [], missingCount: 0, isLoading: false, envelope: null, get<T>(key: string) { return variables.find(r => r.key === key) as ContextVariable<T> | undefined; } };
}
const prog = (o: Partial<HitterProgram>): HitterProgram => ({ sport: "baseball", started_on: "2026-06-01", reason: "no_live", environment: "normal", effort: "low", bridge: false, last_change_on: "2026-06-01", prescribed: {}, completed_on: null, ...o });
function hittingWeek(sport: "baseball" | "softball", ret: HitterProgram | null) {
  return Array.from({ length: 7 }, (_, d) => {
    const date = new Date(2026, 5, 1 + d);
    const plan = buildHammerDailyPlan(context({ sport_primary: sport, position_primary: "SS", season_phase: "off", weekly_availability_days: 6, injury_history: [], equipment_effective: gear, lifecycle_band: "adult", age_years: 17, lifting_age_years: 2 }), NORMAL_SIGNAL, null, null, undefined, date,
      { subscriptionModules: [`${sport}_5tool`], resolvedSeasonPhase: "off_season", hitterReturn: ret, armHistory: { rows: [] } } as any);
    const h = plan.blocks.find(b => b.modality === "hitting" && b.status === "ready");
    return { drills: (h?.drills ?? []) as any[], because: h?.because ?? [] };
  }).filter(d => d.drills.length);
}
const swings = (w: ReturnType<typeof hittingWeek>) => w.map(d => d.drills.map(x => x.dosage.replace(/ · (Low|Medium|Full) effort$/, "")));

describe("returning hitter through the real builder", () => {
  for (const sport of ["baseball", "softball"] as const) it(`${sport}: effort on every swing row, same doses, environment only changes for low-impact/bridge`, () => {
    const normal = hittingWeek(sport, null);
    expect(normal.length).toBeGreaterThan(0);
    const low = hittingWeek(sport, prog({ sport }));
    expect(swings(low)).toEqual(swings(normal));
    expect(low.every(d => d.because.some(b => b.includes("low effort")))).toBe(true);
    expect(low.flatMap(d => d.drills).filter(x => x.swingEffort).length).toBeGreaterThan(0);
    expect(low.flatMap(d => d.drills.map(x => x.name))).toEqual(normal.flatMap(d => d.drills.map(x => x.name))); // normal environment kept
    const bridge = hittingWeek(sport, prog({ sport, bridge: true }));
    expect(bridge.flatMap(d => d.drills).some(x => ["machine", "live"].includes(pitchSourceOf(x) ?? ""))).toBe(false);
  });
});
