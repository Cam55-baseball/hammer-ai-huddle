import { describe, expect, it } from "vitest";
import { judgeCoachEnvelope } from "../../../supabase/functions/_shared/coach/prescriptionEnvelope";
const movement = { slug: "warmup", name: "Warmup", is_active: true, superseded_by: null, category: "warmup", sport_scope: "both", dosage_unit: "seconds", equipment: [], equipment_requirements: [], season_legality: { os_q1: true }, min_age_years: 13, cns_cost: 0, exposure_channel: "low_load" };
const row = { movement_slug: "warmup", movement_name: "Warmup", slot: "warmup", sets: 1, duration_seconds: 30, dosage_unit: "seconds" };
function input() { const catalog = new Map([[movement.slug, movement]]); return { rows: [row], resultingDay: [row], catalog, owned: [] as string[], missing: [] as string[], age: 16, trainingAge: "advanced", trainingYears: 3, sport: "baseball", positions: ["ss"], blockedIntensityClasses: [], final: { planDate: "2026-10-24", phase: "os_q1", age: 16, priorLiftDates: [], restDaysBetweenLifts: 2, weeklyLiftMax: null, liftRemoved: false, catalog }, rm28: { byChannel: {}, byTier: {}, onDate: {}, daysObserved: 0 }, governor: { block: "B1" as const, inSeason: false, growthMode: false } }; }
describe("coach calls existing WIC and Swap judges", () => {
  it("permits a declared gear-free legal item", () => { expect(judgeCoachEnvelope(input()).allowed).toBe(true); });
  it("uses all mandatory gear and one complete alternative group", () => {
    const i = input(); i.catalog.set("warmup", { ...movement, equipment_requirements: ["barbell"], equipment_alternatives: [["bands", "net"], ["dumbbell"]] } as any);
    i.owned = ["barbell", "bands"];
    expect(judgeCoachEnvelope(i).allowed).toBe(false);
    i.owned.push("net"); expect(judgeCoachEnvelope(i).allowed).toBe(true);
    i.missing = ["barbell"]; expect(judgeCoachEnvelope(i).allowed).toBe(false);
  });
  it("uses the existing age gate", () => { const i = input(); i.age = 12; i.final.age = 12; expect(judgeCoachEnvelope(i).allowed).toBe(false); });
  it("never certifies an invented name without catalog evidence", () => { const i = input(); i.catalog.clear(); expect(judgeCoachEnvelope(i).allowed).toBe(false); });
  it("uses the existing off-season-only eccentric rule", () => { const i = input(); i.final.phase = "in_season"; i.catalog.set("warmup", { ...movement, eccentric_overload: true, season_legality: { in_season: true } } as any); expect(judgeCoachEnvelope(i).allowed).toBe(false); });
});