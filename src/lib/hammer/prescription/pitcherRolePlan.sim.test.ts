/**
 * Owner Oct 31 Part B — 8 weeks through the REAL shared daily builder for starter,
 * bullpen arm and closer in both sports (plus a two-way player each focus).
 * Server-only pieces (lift sets/lower-body rule on saved lift rows and conditioning
 * rep counts) are checked in their pure functions below; the app's strength card is
 * checked here through the builder.
 */
import { describe, expect, it, beforeAll } from "vitest";
import { buildHammerDailyPlan } from "./dailyPlan";
import { NORMAL_SIGNAL } from "./scheduleContext";
import { setOwnerPlanDrills } from "@/lib/prescription/ownerPlanDrills";
import { resolveOutingFacts, type PitcherOutingRow, type PitcherSettingsRow } from "../../../../supabase/functions/_shared/wic/pitching/outingFacts";
import { sprintDose, reliefSets } from "../../../../supabase/functions/_shared/wic/pitching/roleCycle";
import type { ContextVariable, HammerAthleteContext } from "@/lib/hammer/context/athleteContext";
import type { OwnerDrillRow } from "@/lib/prescription/ownerDrills";

const gear = ["tee", "gamer_bat", "net", "field", "glove", "ball", "open_space"];
function context(values: Record<string, unknown>): HammerAthleteContext {
  const variables = Object.entries(values).map(([key, value]): ContextVariable => ({ key, value, label: key, domain: "identity", source: "test", confidence: "high", missing: false, lastUpdated: null, lineage: { owner: "test", source: "test", rawConfidence: "high" } }));
  return { variables, missing: [], missingCount: 0, isLoading: false, envelope: null, get<T>(key: string) { return variables.find(r => r.key === key) as ContextVariable<T> | undefined; } };
}
const base = { active: true, placements: ["hammers_today:pitching"], equipment: [], fault_keys: [], steps: ["Do it"], cue: "Zone", setup: "A catcher or a net.", pitch_types: [], pitch_role_fit: ["starter", "bullpen", "closer"], created_at: "", level: null, phase: null, pinned: false } as unknown as OwnerDrillRow;
const DRILLS: OwnerDrillRow[] = [
  { ...base, id: "a-medball", name: "2-hand med-ball overhead throws (day after start)", sports: ["baseball", "softball"], dosage: "2x8 throws, easy", pitch_mound_type: "flat_ground", pitch_intensity: "catch_light", pitch_count: 0, pitch_purposes: ["throwing_mobility", "recovery"], pitch_role_fit: ["starter"] },
  { ...base, id: "b-sb", name: "Shortbox mound (40 ft)", sports: ["baseball"], dosage: "20 pitches", pitch_mound_type: "shortbox", pitch_distance_feet: 40, pitch_intensity: "catch_light", pitch_count: 20, pitch_purposes: ["command"] },
  { ...base, id: "c-lm", name: "Light mound catch", sports: ["baseball"], dosage: "15 pitches", pitch_mound_type: "light_mound", pitch_intensity: "catch_light", pitch_count: 15, pitch_purposes: ["mechanics"] },
  { ...base, id: "d-sbc", name: "Shortbox circle (29 ft)", sports: ["softball"], dosage: "20 pitches", pitch_mound_type: "shortbox_circle", pitch_distance_feet: 29, pitch_intensity: "catch_light", pitch_count: 20, pitch_purposes: ["command"] },
  { ...base, id: "e-lc", name: "Light circle work", sports: ["softball"], dosage: "15 pitches", pitch_mound_type: "circle", pitch_intensity: "catch_light", pitch_count: 15, pitch_purposes: ["mechanics"] },
] as OwnerDrillRow[];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
type Role = "starter" | "bullpen" | "closer";

function run(sport: "baseball" | "softball", role: Role, tier = "pitcher", focus: "pitcher" | "position" | null = null) {
  const settings: PitcherSettingsRow = { role: role === "starter" ? "starter" : "reliever", rotation_anchor_date: "2026-06-05", rotation_every_days: role === "starter" ? 7 : null, rotation_active: role === "starter", pitching_role: role, primary_focus: focus, limit_pitching: false };
  const outings: PitcherOutingRow[] = [];
  const weeks: { date: string; dow: number; title: string; pitchNames: string[]; strength: string[]; pitches: number; because: string[]; position: number }[][] = [];
  for (let w = 0; w < 8; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(2026, 5, 1 + w * 7 + d); // Mon Jun 1
      const day = iso(date);
      const rows: PitcherOutingRow[] = [];
      for (let k = 0; k < 63; k++) {
        const od = new Date(2026, 5, 1 + k), oi = iso(od);
        const isOuting = role === "starter" ? od.getDay() === 5 : od.getDay() === 5 || od.getDay() === 6;
        if (!isOuting) continue;
        const past = oi < day;
        rows.push({ id: oi, outing_type: role === "starter" ? "start" : "relief", planned_date: oi, actual_date: past ? oi : null, status: past ? "thrown" : "planned" });
      }
      const facts = resolveOutingFacts({ planDate: day, settings, outings: rows, availability: role === "starter" ? [] : [{ date: day, available: date.getDay() === 2 }] });
      const plan = buildHammerDailyPlan(context({ sport_primary: sport, position_primary: tier === "pitcher" ? "P" : "SS", season_phase: "in", weekly_availability_days: 6, injury_history: [], equipment_effective: gear, lifecycle_band: "adult", age_years: 20, lifting_age_years: 4 }), NORMAL_SIGNAL, null, null, undefined, date,
        { subscriptionModules: [`${sport}_${tier}`], resolvedSeasonPhase: "in", pitcherOutings: facts, armHistory: { rows: [] } } as any);
      const p = plan.blocks.find(b => b.modality === "pitching");
      const t = plan.blocks.find(b => b.modality === "throwing" && b.status === "ready");
      const s = plan.blocks.find(b => b.modality === "strength" && b.status === "ready");
      const count = (ds: readonly any[] | undefined) => (ds ?? []).reduce((n, x) => n + (x.armEvent && x.name && !/warm-up/i.test(x.name) ? x.armEvent.count : 0), 0);
      week.push({ date: day, dow: date.getDay(), title: p?.status === "ready" ? p.title : p ? `${p.title} (${p.status})` : "no pitching card", pitchNames: (p?.drills ?? []).map((x: any) => x.name), strength: (s?.drills ?? []).map((x: any) => `${x.name} ${x.dosage}`), pitches: count(p?.status === "ready" ? p.drills : []), position: count(t?.drills), because: [...(p?.because ?? []), ...(s?.because ?? [])] });
    }
    weeks.push(week);
  }
  return weeks;
}

beforeAll(() => setOwnerPlanDrills(DRILLS));

describe("Part B through the real daily builder — 8 weeks", () => {
  for (const sport of ["baseball", "softball"] as const) for (const role of ["starter", "bullpen", "closer"] as Role[]) it(`${sport} ${role}`, () => {
    const weeks = run(sport, role);
    const problems: string[] = [];
    weeks.forEach((wk, w) => {
      const tagged = wk.filter(d => d.pitchNames.some(n => DRILLS.some(x => x.name === n && x.pitch_mound_type !== "flat_ground")));
      if (tagged.length < 3) problems.push(`week ${w + 1}: ${tagged.length} tagged mound/circle days`);
      if (!wk.some(d => d.pitchNames.some(n => /Shortbox/.test(n)))) problems.push(`week ${w + 1}: no shortbox`);
      for (const d of wk) {
        if (sport === "softball" && d.pitchNames.some(n => /mound/i.test(n))) problems.push(`${d.date}: mound wording for softball`);
        if (sport === "baseball" && d.pitchNames.some(n => /circle/i.test(n))) problems.push(`${d.date}: circle drill for baseball`);
      }
      if (role === "starter") {
        const sat = wk.find(d => d.dow === 6)!, sun = wk.find(d => d.dow === 0)!, thu = wk.find(d => d.dow === 4)!;
        if (w > 0 || true) {
          if (!sat.pitchNames.some(n => /med-ball/.test(n))) problems.push(`${sat.date}: day after start lacks med-ball`);
          if (sun.pitches > 0) problems.push(`${sun.date}: pitches on rest day`);
          if (thu.strength.some(x => /squat|deadlift|lunge/i.test(x))) problems.push(`${thu.date}: lower-body lift before start`);
        }
      } else {
        for (const d of wk) if (d.strength.some(x => /^Main lift.*\b(4|5) x/i.test(x))) problems.push(`${d.date}: reliever lift not reduced`);
      }
    });
    const sample = weeks[1].map(d => `${d.date}: ${d.title} — ${d.pitchNames.filter(n => !/warm-up/i.test(n)).join(", ") || "—"} | pitches ${d.pitches}${d.strength.length ? ` | lift: ${d.strength.slice(0, 2).join("; ")}` : ""}`);
    console.log(`\n${sport} ${role}\n${sample.join("\n")}`);
    expect(problems).toEqual([]);
  });

  it("two-way split: mainly pitcher keeps position throws ≤ ~30% of arm work", () => {
    const weeks = run("baseball", "starter", "golden2way", "pitcher").flat();
    const pitch = weeks.reduce((n, d) => n + d.pitches, 0), pos = weeks.reduce((n, d) => n + d.position, 0);
    console.log(`two-way mainly pitcher: pitching ${pitch}, position ${pos}`);
    expect(pos).toBeLessThanOrEqual(Math.ceil((pitch + pos) * 0.31));
  });

  it("server pieces: reliever lift sets and sprint progression", () => {
    expect([4, 5, 3].map(s => reliefSets(s, "bullpen"))).toEqual([3, 3, 2]);
    expect(Array.from({ length: 8 }, (_, w) => sprintDose("starter", w).reps)).toEqual([4, 5, 6, 7, 8, 9, 10, 10]);
    expect(sprintDose("closer", 3)).toEqual({ reps: 6, kind: "repeat_sprint" });
  });
});
