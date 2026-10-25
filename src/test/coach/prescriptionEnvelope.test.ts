import { describe, expect, it } from "vitest";
import { judgeCoachEnvelope } from "../../../supabase/functions/_shared/coach/prescriptionEnvelope";
const movement = { slug: "warmup", name: "Warmup", is_active: true, superseded_by: null, category: "warmup", sport_scope: "both", dosage_unit: "seconds", equipment: [], equipment_requirements: [], season_legality: { os_q1: true }, min_age_years: 13, cns_cost: 0, exposure_channel: "low_load" };
const row = { movement_slug: "warmup", movement_name: "Warmup", slot: "warmup", sets: 1, duration_seconds: 30, dosage_unit: "seconds" };
function input() { const catalog = new Map([[movement.slug, movement]]); return { rows: [row], resultingDay: [row], catalog, owned: [] as string[], missing: [] as string[], age: 16, trainingAge: "advanced", trainingYears: 3, sport: "baseball", positions: ["ss"], blockedIntensityClasses: [], final: { planDate: "2026-10-24", phase: "os_q1", age: 16, priorLiftDates: [], restDaysBetweenLifts: 2, weeklyLiftMax: null, liftRemoved: false, catalog }, rm28: { byChannel: {}, byTier: {}, onDate: {}, daysObserved: 0, loggedDaysByChannel: {} }, governor: { block: "B1" as const, inSeason: false, growthMode: false } }; }
describe("coach calls existing WIC and Swap judges", () => {
  it("permits a declared gear-free legal item", () => { expect(judgeCoachEnvelope(input()).allowed).toBe(true); });
  it("uses all mandatory gear and one complete alternative group", () => {
    const i = input(); i.catalog.set("warmup", { ...movement, equipment_requirements: ["barbell"], equipment_alternatives: [["bands", "net"], ["dumbbell"]] } as any);
    i.owned = ["barbell", "bands"];
    expect(judgeCoachEnvelope(i).warnings.some(w => w.code === "missing_equipment")).toBe(true);
    i.owned.push("net"); expect(judgeCoachEnvelope(i).allowed).toBe(true);
    i.missing = ["barbell"]; const result = judgeCoachEnvelope(i);
    expect(result.allowed).toBe(true);
    expect(result.warnings).toContainEqual({ code: "missing_equipment", date: "2026-10-24", rule: "Warmup: Player reported no barbell." });
  });
  it("turns the existing age gate into a reason-class warning", () => { const i = input(); i.age = 12; i.final.age = 12; const r = judgeCoachEnvelope(i); expect(r.allowed).toBe(true); expect(r.warnings.find(w => w.code === "age_gate")).toMatchObject({ medical: true, date: "2026-10-24" }); });
  it("turns season and recovery-intensity stops into warnings", () => {
    const i = input(); i.catalog.set("warmup", { ...movement, season_legality: { in_season: false }, intensity_class: "high" } as any); i.final.phase = "in_season"; i.blockedIntensityClasses = ["high"];
    const r = judgeCoachEnvelope(i); expect(r.warnings.map(w => w.code)).toEqual(expect.arrayContaining(["recovery_intensity"]));
    expect(r.reasons.some(x => /season|lighter/.test(x))).toBe(false);
  });
  it("labels impossible dose data Fix this entry", () => { const i = input(); i.rows = [{ ...row, duration_seconds: 0 }]; expect(judgeCoachEnvelope(i).reasons.join(" ")).toContain("Fix this entry"); });
  it("does not inherit an old approval after a gear correction reopens review", () => {
    expect(judgeCoachEnvelope({ ...input(), pendingReview: ["warmup"] }).allowed).toBe(false);
    expect(judgeCoachEnvelope({ ...input(), pendingReview: [] }).allowed).toBe(true);
  });
  it("never certifies an invented name without catalog evidence", () => { const i = input(); i.catalog.clear(); expect(judgeCoachEnvelope(i).allowed).toBe(false); });
  it("keeps TEST-only items restricted to the declared recipient", () => {
    const i = input(); i.catalog.set("warmup", { ...movement, visible_to: ["test-player"] } as any);
    expect(judgeCoachEnvelope({ ...i, userId: "real-player" }).allowed).toBe(false);
    expect(judgeCoachEnvelope({ ...i, userId: "test-player" }).allowed).toBe(true);
    expect(judgeCoachEnvelope(i).allowed).toBe(false);
  });
  it("never routes a throwing item into a hitting card", () => {
    const i = input(); i.rows = [{ ...row, slot: "hitting" }]; i.resultingDay = i.rows;
    i.catalog.set("warmup", { ...movement, category: "throwing_plyo" });
    expect(judgeCoachEnvelope(i).allowed).toBe(false);
    i.catalog.set("warmup", { ...movement, category: "bat_speed", bat_speed_category: "elastic_rotation", dosage_unit: "reps" } as any);
    i.rows = [{ ...row, slot: "hitting", dosage_unit: "reps", reps: 1 } as any]; i.resultingDay = i.rows;
    expect(judgeCoachEnvelope(i).allowed).toBe(true);
  });
  it("uses the shared recovery domain for mobility rather than any catalog category", () => {
    const i = input(); i.rows = [{ ...row, slot: "mobility" }]; i.resultingDay = i.rows;
    i.catalog.set("warmup", { ...movement, recovery_category: "mobility" } as any);
    expect(judgeCoachEnvelope(i).allowed).toBe(true);
    i.catalog.set("warmup", { ...movement, category: "throwing_plyo" });
    expect(judgeCoachEnvelope(i).allowed).toBe(false);
  });
  it("uses the existing off-season-only eccentric rule", () => { const i = input(); i.final.phase = "in_season"; i.catalog.set("warmup", { ...movement, eccentric_overload: true, season_legality: { in_season: true } } as any); expect(judgeCoachEnvelope(i).allowed).toBe(false); });
  it("does not certify an unknown or non-finite dose", () => { const i = input(); i.rows = [{ ...row, duration_seconds: Number.NaN }]; expect(judgeCoachEnvelope(i).allowed).toBe(false); });
  it("rejects fractional rep counts instead of rounding them", () => {
    const i = input(); i.catalog.set("warmup", { ...movement, dosage_unit: "reps" });
    i.rows = [{ ...row, dosage_unit: "reps", reps: 1.4 } as any];
    expect(judgeCoachEnvelope(i).allowed).toBe(false);
  });
  it("counts total reps once rather than falling back to one rep per set", () => {
    const i = input();
    i.catalog.set("warmup", { ...movement, category: "bat_speed", bat_speed_category: "elastic_rotation", dosage_unit: "total_reps" } as any);
    i.rows = [{ ...row, slot: "hitting", dosage_unit: "total_reps", sets: 2, total_reps: 24 } as any]; i.resultingDay = i.rows;
    i.rm28 = { ...i.rm28, byChannel: { SWING: 10 }, byTier: { "SWING:high": 10 }, loggedDaysByChannel: { SWING: 8 } };
    const result = judgeCoachEnvelope(i);
    expect(result.allowed).toBe(true);
    expect(result.warnings.some(w => w.code === "workload_cap")).toBe(true);
  });
  it("runs the existing bat-speed certifier for hitting rather than skipping its slot", () => {
    const i = input(); i.rows = [{ ...row, slot: "hitting", dosage_unit: "reps", reps: 1 } as any]; i.resultingDay = i.rows;
    i.catalog.set("warmup", { ...movement, category: "bat_speed", dosage_unit: "reps" });
    expect(judgeCoachEnvelope(i).reasons).toContain("warmup has no bat_speed_category (explosive_v1 required).");
  });
  it("runs the existing recovery certifier for mobility", () => {
    const i = input(); i.rows = [{ ...row, slot: "mobility" }]; i.resultingDay = i.rows;
    expect(judgeCoachEnvelope(i).reasons).toContain("warmup missing recovery_category");
  });
  it("refuses a saved day's unknown movement instead of omitting it from exposure", () => {
    const i = input(); i.resultingDay = [row, { ...row, movement_slug: "unknown", movement_name: "Unmapped work" }];
    expect(judgeCoachEnvelope(i).allowed).toBe(false);
  });
  it("refuses missing saved swing counts instead of counting one rep", () => {
    const i = input(); i.catalog.set("swing", { ...movement, slug: "swing", category: "bat_speed" });
    i.resultingDay = [row, { ...row, movement_slug: "swing", movement_name: "Saved swing", slot: "hitting" }];
    expect(judgeCoachEnvelope(i).allowed).toBe(false);
  });
  it("does not turn missing jump contacts into the shared one-contact fallback", () => {
    const i = input();
    i.catalog.set("jump", { ...movement, slug: "jump", exposure_channel: "elastic", contacts_per_rep: null } as any);
    i.resultingDay = [row, { ...row, movement_slug: "jump", movement_name: "Saved jump", reps: 4 } as any];
    expect(judgeCoachEnvelope(i).reasons).toContain("Saved jump: its contacts per rep aren't declared in Exercise Vault. Keep your plan and save this workout for later.");
    i.catalog.set("jump", { ...movement, slug: "jump", exposure_channel: "elastic", contacts_per_rep: 2 } as any);
    expect(judgeCoachEnvelope(i).allowed).toBe(true);
  });
  it("does not certify fractional upper-body plyometric contact declarations", () => {
    const i = input();
    i.catalog.set("plyo", { ...movement, slug: "plyo", exposure_channel: "ub_plyo", contacts_per_rep: 0.5 } as any);
    i.resultingDay = [row, { ...row, movement_slug: "plyo", movement_name: "Saved plyo", reps: 4 } as any];
    expect(judgeCoachEnvelope(i).allowed).toBe(false);
    i.catalog.set("plyo", { ...movement, slug: "plyo", exposure_channel: "ub_plyo", contacts_per_rep: 2 } as any);
    expect(judgeCoachEnvelope(i).allowed).toBe(true);
  });
});