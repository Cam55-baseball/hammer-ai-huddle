/** Locked by owner Nov 6: pitching never appears before the throwing warm-up. */
import { describe, it, expect, beforeAll } from "vitest";
import { buildHammerDailyPlan } from "@/lib/hammer/prescription/dailyPlan";
import { NORMAL_SIGNAL } from "@/lib/hammer/prescription/scheduleContext";
import { pitchingAfterThrowing, pitchingBeforeThrowing } from "@/lib/hammer/prescription/pitchAfterThrow";
import { setOwnerPlanDrills } from "@/lib/prescription/ownerPlanDrills";
import { resolveOutingFacts, type PitcherOutingRow, type PitcherSettingsRow } from "../../supabase/functions/_shared/wic/pitching/outingFacts";
import type { ContextVariable, HammerAthleteContext } from "@/lib/hammer/context/athleteContext";
import type { OwnerDrillRow } from "@/lib/prescription/ownerDrills";

function context(values: Record<string, unknown>): HammerAthleteContext {
  const variables = Object.entries(values).map(([key, value]): ContextVariable => ({ key, value, label: key, domain: "identity", source: "test", confidence: "high", missing: false, lastUpdated: null, lineage: { owner: "test", source: "test", rawConfidence: "high" } }));
  return { variables, missing: [], missingCount: 0, isLoading: false, envelope: null, get<T>(key: string) { return variables.find(r => r.key === key) as ContextVariable<T> | undefined; } };
}
const base = { active: true, placements: ["hammers_today:pitching"], equipment: [], fault_keys: [], steps: ["Do it"], cue: "Zone", setup: "A catcher or a net.", pitch_types: [], pitch_role_fit: ["starter", "bullpen", "closer"], created_at: "", level: null, phase: null, pinned: false } as unknown as OwnerDrillRow;
const DRILLS = [
  { ...base, id: "b-sb", name: "Shortbox mound (40 ft)", sports: ["baseball"], dosage: "20 pitches", pitch_mound_type: "shortbox", pitch_distance_feet: 40, pitch_intensity: "catch_light", pitch_count: 20, pitch_purposes: ["command"] },
  { ...base, id: "c-lm", name: "Light mound catch", sports: ["baseball"], dosage: "15 pitches", pitch_mound_type: "light_mound", pitch_intensity: "catch_light", pitch_count: 15, pitch_purposes: ["mechanics"] },
  { ...base, id: "d-sbc", name: "Shortbox circle (29 ft)", sports: ["softball"], dosage: "20 pitches", pitch_mound_type: "shortbox_circle", pitch_distance_feet: 29, pitch_intensity: "catch_light", pitch_count: 20, pitch_purposes: ["command"] },
  { ...base, id: "e-lc", name: "Light circle work", sports: ["softball"], dosage: "15 pitches", pitch_mound_type: "circle", pitch_intensity: "catch_light", pitch_count: 15, pitch_purposes: ["mechanics"] },
] as OwnerDrillRow[];
beforeAll(() => setOwnerPlanDrills(DRILLS));
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;


describe("locked by owner Nov 6 — pitching after throwing", () => {
  it("moves a pitching block that a goal/bias reorder put first to right after throwing", () => {
    const out = pitchingAfterThrowing([{ modality: "warmup" }, { modality: "pitching" }, { modality: "hitting" }, { modality: "throwing" }, { modality: "lift" }]);
    expect(out.map(b => b.modality)).toEqual(["warmup", "hitting", "throwing", "pitching", "lift"]);
    expect(pitchingBeforeThrowing(out)).toBe(false);
  });
  it("windmill counts as pitching; correct order is untouched", () => {
    expect(pitchingBeforeThrowing([{ modality: "windmill" }, { modality: "throwing" }])).toBe(true);
    const ok = [{ modality: "warmup" }, { modality: "throwing" }, { modality: "pitching" }, { modality: "defense" }];
    expect(pitchingAfterThrowing(ok)).toEqual(ok);
  });
  it("guard flags a saved day with pitching first", () => {
    expect(pitchingBeforeThrowing([{ modality: "warmup" }, { modality: "pitching" }, { modality: "throwing" }])).toBe(true);
  });
});

function sim(sport: "baseball" | "softball", role: "starter" | "bullpen" | "closer", tier: "pitcher" | "golden2way") {
  const settings: PitcherSettingsRow = { role: role === "starter" ? "starter" : "reliever", rotation_anchor_date: "2026-06-05", rotation_every_days: role === "starter" ? 7 : null, rotation_active: role === "starter", pitching_role: role, primary_focus: tier === "golden2way" ? "pitcher" : null, limit_pitching: false };
  const problems: string[] = []; let both = 0;
  for (let k = 0; k < 56; k++) {
    const date = new Date(2026, 5, 1 + k), dayIso = iso(date);
    const rows: PitcherOutingRow[] = [];
    for (let j = 0; j < 63; j++) { const od = new Date(2026, 5, 1 + j), oi = iso(od); if (!(role === "starter" ? od.getDay() === 5 : od.getDay() === 5 || od.getDay() === 6)) continue; const past = oi < dayIso; rows.push({ id: oi, outing_type: role === "starter" ? "start" : "relief", planned_date: oi, actual_date: past ? oi : null, status: past ? "thrown" : "planned" }); }
    const facts = resolveOutingFacts({ planDate: dayIso, settings, outings: rows, availability: role === "starter" ? [] : [{ date: dayIso, available: date.getDay() === 2 }] });
    const low = k % 9 === 3;
    const plan = buildHammerDailyPlan(context({ sport_primary: sport, position_primary: tier === "pitcher" ? "P" : "SS", season_phase: k < 28 ? "pre" : "in", weekly_availability_days: 6, injury_history: [], equipment_effective: ["glove", "ball", "field", "open_space", "net", "tee", "gamer_bat"], lifecycle_band: "adult", age_years: 20, lifting_age_years: 4, ...(low ? { readiness: 0.3 } : {}) }), NORMAL_SIGNAL, null, null, undefined, date,
      { subscriptionModules: [`${sport}_${tier}`], resolvedSeasonPhase: k < 28 ? "pre" : "in", pitcherOutings: facts, armHistory: { rows: [] } } as any);
    const mods = plan.blocks.map(b => b.modality);
    if (mods.includes("throwing") && mods.includes("pitching")) both++;
    if (pitchingBeforeThrowing(plan.blocks)) problems.push(`${dayIso}: ${mods.join(" > ")}`);
  }
  return { problems, both };
}

describe("locked by owner Nov 6 — 8-week simulations, pitching never before throwing", () => {
  for (const sport of ["baseball", "softball"] as const) for (const role of ["starter", "bullpen", "closer"] as const) it(`${sport} ${role}${sport === "softball" ? " (windmill)" : ""}`, () => {
    const r = sim(sport, role, "pitcher");
    expect(r.both).toBeGreaterThan(0);
    expect(r.problems).toEqual([]);
  });
  for (const sport of ["baseball", "softball"] as const) it(`${sport} two-way pitcher`, () => {
    expect(sim(sport, "starter", "golden2way").problems).toEqual([]);
  });
});
