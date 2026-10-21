import { describe, expect, it } from "vitest";
import { checkSwapCatalogPair, requireSwapCatalogSource, type SwapCatalogFacts } from "../../../supabase/functions/_shared/planSwap/catalogGate";

const saved = { movement_slug: "machine", sets: 3, reps: 10, total_reps: 30, duration_seconds: null,
  distance_feet: null, dosage_unit: "reps", tempo: null, load_pct: null };
const source = { slug: "machine", name: "Machine timing", is_active: true, superseded_by: null,
  movement_category: "hitting", substitution_family: "timing", primary_adaptation: "ball_timing",
  dosage_unit: "reps", equipment_requirements: ["pitching_machine"], cns_cost: 1, volume_cost: 2,
  contacts_per_rep: 0, joint_stress: 3, recovery_window_hours: 24, sport_scope: "baseball",
  position_scope: ["hitter"], min_age_years: 13, min_training_age_years: 0, contraindications: [],
  season_legality: { os_q1: true, in_season: true }, training_age_legality: { beginner: true },
  eccentric_overload: false, is_eccentric_dominant: false, game_day_legal: true, practice_day_legal: true };
const target = { ...source, slug: "flips", name: "Partner flips", equipment_requirements: ["partner"] };
const facts: SwapCatalogFacts = { phase: "os_q1", sport: "baseball", position: "hitter", ageYears: 16,
  trainingAge: "beginner", trainingAgeYears: 0, injuryRestrictions: [], gameDay: false, practiceDay: false };
describe("server Swap catalog necessary conditions", () => {
  it("keeps machine to flips at exactly 3 sets, 10 reps and 30 total reps", () => {
    const { movement_slug: _, ...dose } = saved;
    expect(checkSwapCatalogPair(source, target, saved, facts)).toEqual(dose);
  });
  it("retired, undeclared and dose-conflicting sources cannot begin a Swap", () => {
    for (const patch of [{ superseded_by: "new" }, { superseded_by: undefined }, { primary_adaptation: null },
      { equipment_requirements: null }, { dosage_unit: "seconds" }, { slug: "other" }]) {
      expect(() => requireSwapCatalogSource({ ...source, ...patch }, saved)).toThrow();
    }
  });
  it("same category and intent never permit competitive-phase eccentric overload", () => {
    expect(() => checkSwapCatalogPair(source, { ...target, eccentric_overload: true }, saved,
      { ...facts, phase: "in_season" })).toThrow();
  });
  it("lower CNS never offsets higher joint stress or recovery time", () => {
    for (const patch of [{ cns_cost: 0, joint_stress: 4 }, { cns_cost: 0, recovery_window_hours: 25 }]) {
      expect(() => checkSwapCatalogPair(source, { ...target, ...patch }, saved, facts)).toThrow();
    }
  });
  it("each missing workload channel blocks instead of counting as zero", () => {
    for (const key of ["cns_cost", "volume_cost", "contacts_per_rep", "joint_stress", "recovery_window_hours"]) {
      expect(() => checkSwapCatalogPair(source, { ...target, [key]: null }, saved, facts)).toThrow();
      expect(() => checkSwapCatalogPair({ ...source, [key]: null }, target, saved, facts)).toThrow();
    }
  });
  it("sport, position, age, injury, season and practice legality constrain both rows", () => {
    for (const patch of [{ sport_scope: "softball" }, { position_scope: null }, { min_age_years: 17 },
      { contraindications: ["shoulder"] }, { season_legality: null }, { practice_day_legal: false }]) {
      const context = { ...facts, injuryRestrictions: ["shoulder"], practiceDay: true };
      expect(() => checkSwapCatalogPair(source, { ...target, ...patch }, saved, context)).toThrow();
      expect(() => checkSwapCatalogPair({ ...source, ...patch }, target, saved, context)).toThrow();
    }
  });
  it("matching names or family cannot replace exact intent or measurement units", () => {
    for (const patch of [{ primary_adaptation: "swing_path" }, { dosage_unit: "seconds" }, { superseded_by: "new" }]) {
      expect(() => checkSwapCatalogPair(source, { ...target, ...patch }, saved, facts)).toThrow();
    }
  });
  it("restriction spelling cannot hide a declared injury conflict", () => {
    expect(() => checkSwapCatalogPair(source, { ...target, contraindications: ["Shoulder-Pain"] }, saved,
      { ...facts, injuryRestrictions: ["shoulder pain"] })).toThrow();
  });
});