/** Locked by owner Nov 6: no full pitcher catch-play warm-up → no pull-downs → no mound work. */
import { describe, it, expect, beforeAll } from "vitest";
import { pitcherMoundGate, isMoundWork, isPullDown, isCatchPlay, REDUCED_CATCH_REASON } from "./pitcherMoundGate";
import { buildHammerDailyPlan } from "./dailyPlan";
import { NORMAL_SIGNAL } from "./scheduleContext";
import { setOwnerPlanDrills } from "@/lib/prescription/ownerPlanDrills";
import { resolveOutingFacts, type PitcherOutingRow, type PitcherSettingsRow } from "../../../../supabase/functions/_shared/wic/pitching/outingFacts";
import type { ContextVariable, HammerAthleteContext } from "@/lib/hammer/context/athleteContext";
import type { OwnerDrillRow } from "@/lib/prescription/ownerDrills";

const ext = { name: "Regulation extension toss", stage: "prep", armCard: "throwing", eassCategory: "regulation", armEvent: { kind: "warmup" as const, count: 10, intent: "moderate" as const, estimated: false } };
const pull = { name: "Intent throws — pulldown phase (5oz)", stage: "drills", eassCategory: "pulldown", armEvent: { kind: "long_toss" as const, count: 6, intent: "high" as const, estimated: false } };
const box = { name: "Shortbox mound (40 ft)", stage: "full_go", armEvent: { kind: "pitch" as const, count: 20, intent: "moderate" as const, estimated: false }, pitchTags: { moundType: "shortbox" } };
const day = () => [
  { status: "ready", modality: "throwing", drills: [ext] },
  { status: "ready", modality: "pitching", drills: [pull, box] },
];
const input = (o: Partial<Parameters<typeof pitcherMoundGate>[1]> = {}) => ({ sport: "baseball" as const, role: "two_way" as const, age: 20, date: "2026-06-10", history: { rows: [] } as any, lowReadiness: false, armProtected: false, buildUp: false, ...o });
const all = (bs: any[]) => bs.flatMap((b) => b.drills);

describe("locked by owner Nov 6 — the reported 2Way day", () => {
  it("10-throw extension + pull-downs + shortbox → full ladder when it fits", () => {
    const out = pitcherMoundGate(day(), input());
    const rows = all(out);
    expect(rows.some(isMoundWork)).toBe(true);
    expect(rows.filter((d: any) => d.fullPitcherWarmup).map((d: any) => d.armEvent.count)).toEqual([5, 5, 10, 10, 10, 10, 5, 10]);
    expect(rows.some((d: any) => d.name === ext.name)).toBe(false);
    expect(rows.filter(isPullDown).every((d: any) => d.fullPitcherWarmup)).toBe(true);
  });
  for (const why of ["lowReadiness", "armProtected", "buildUp"] as const) it(`reduced catch play (${why}) → no pull-downs, no mound`, () => {
    const out = pitcherMoundGate(day(), input({ [why]: true }));
    const rows = all(out);
    expect(rows.some(isPullDown)).toBe(false);
    expect(rows.some(isMoundWork)).toBe(false);
    expect(rows.some((d: any) => /Dry mechanics/.test(d.name))).toBe(true);
    expect(out[1].because?.at(-1)).toMatch(/no pull-downs or mound work/);
  });
  it("budget can't fit the full warm-up → plain Because line", () => {
    const out = pitcherMoundGate(day(), input({ history: { unavailable: true, rows: [] } as any }));
    expect(all(out).some((d: any) => isPullDown(d) || isMoundWork(d))).toBe(false);
    expect(out[1].because).toContain(REDUCED_CATCH_REASON);
  });
});

// --- 8-week simulations through the real builder ---
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

function sim(sport: "baseball" | "softball", role: "starter" | "bullpen" | "closer", tier: "pitcher" | "golden2way") {
  const settings: PitcherSettingsRow = { role: role === "starter" ? "starter" : "reliever", rotation_anchor_date: "2026-06-05", rotation_every_days: role === "starter" ? 7 : null, rotation_active: role === "starter", pitching_role: role, primary_focus: tier === "golden2way" ? "pitcher" : null, limit_pitching: false };
  const problems: string[] = []; let mound = 0, reduced = 0;
  for (let k = 0; k < 56; k++) {
    const date = new Date(2026, 5, 1 + k), dayIso = iso(date);
    const rows: PitcherOutingRow[] = [];
    for (let j = 0; j < 63; j++) { const od = new Date(2026, 5, 1 + j), oi = iso(od); if (!(role === "starter" ? od.getDay() === 5 : od.getDay() === 5 || od.getDay() === 6)) continue; const past = oi < dayIso; rows.push({ id: oi, outing_type: role === "starter" ? "start" : "relief", planned_date: oi, actual_date: past ? oi : null, status: past ? "thrown" : "planned" }); }
    const facts = resolveOutingFacts({ planDate: dayIso, settings, outings: rows, availability: role === "starter" ? [] : [{ date: dayIso, available: date.getDay() === 2 }] });
    const low = k % 9 === 3, injured = k % 11 === 5;
    const plan = buildHammerDailyPlan(context({ sport_primary: sport, position_primary: tier === "pitcher" ? "P" : "SS", season_phase: "in", weekly_availability_days: 6, injury_history: injured ? [{ region: "shoulder", status: "active", severity: "moderate", started_at: "2026-05-01" }] : [], equipment_effective: ["glove", "ball", "field", "open_space", "net", "tee", "gamer_bat"], lifecycle_band: "adult", age_years: 20, lifting_age_years: 4, ...(low ? { readiness: 0.3 } : {}) }), NORMAL_SIGNAL, null, null, undefined, date,
      { subscriptionModules: [`${sport}_${tier}`], resolvedSeasonPhase: "in", pitcherOutings: facts, armHistory: { rows: [] } } as any);
    const arm = plan.blocks.filter(b => b.status === "ready" && (b.modality === "pitching" || b.modality === "throwing")).flatMap(b => b.drills as any[]);
    const full = arm.filter(d => d.fullPitcherWarmup).length === 8 || (sport === "softball" && arm.filter(d => d.fullPitcherWarmup).length === 5);
    if (arm.some(isMoundWork)) { mound++; if (!full) problems.push(`${dayIso}: mound work without the full warm-up`); }
    if (arm.some(isPullDown) && !full) problems.push(`${dayIso}: pull-downs after a reduced catch play`);
    if ((low || injured) && arm.some(d => isMoundWork(d) || isPullDown(d))) problems.push(`${dayIso}: ${low ? "low readiness" : "arm protected"} day kept mound/pull-downs`);
    if (!full && arm.some(isCatchPlay)) reduced++;
  }
  return { problems, mound, reduced };
}

describe("locked by owner Nov 6 — 8-week simulations", () => {
  for (const sport of ["baseball", "softball"] as const) for (const role of ["starter", "bullpen", "closer"] as const) it(`${sport} ${role}`, () => {
    const r = sim(sport, role, "pitcher");
    console.log(`${sport} ${role}: mound days ${r.mound}, reduced catch days ${r.reduced}`);
    expect(r.problems).toEqual([]);
  });
  for (const sport of ["baseball", "softball"] as const) it(`${sport} two-way pitcher`, () => {
    const r = sim(sport, "starter", "golden2way");
    console.log(`${sport} two-way: mound days ${r.mound}, reduced ${r.reduced}`);
    expect(r.problems).toEqual([]);
  });
});
