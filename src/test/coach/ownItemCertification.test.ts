import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { certifyCoachOwnItem, certifyCoachOwnItems, COACH_OWN_MEASURE_UNITS } from "../../../supabase/functions/_shared/coach/ownItemCertification.ts";

const read = (path: string) => readFileSync(path, "utf8");

describe("coach own-item certification (gear vocabulary + measure type)", () => {
  it("certifies a clean own item with common gear and a governed measure", () => {
    const result = certifyCoachOwnItem({ name: "Band shoulder work", sets: 2, reps: 12, dosage_unit: "reps", gear: "bands, tee" });
    expect(result.certified).toBe(true);
    expect(result.reasons).toEqual([]);
    expect(result.equipment).toEqual(["bands", "tee"]);
    expect(result.unknownGear).toEqual([]);
  });

  it("maps owner words to the common gear vocabulary", () => {
    const result = certifyCoachOwnItem({ name: "Machine hitting", reps: 10, dosage_unit: "reps", gear: "pitching machine, field space" });
    expect(result.certified).toBe(true);
    expect(result.equipment).toEqual(["pitching_machine", "open_field"]);
  });

  it("names unknown gear and refuses certification instead of dropping it", () => {
    const result = certifyCoachOwnItem({ name: "Mystery drill", reps: 10, dosage_unit: "reps", gear: "bands, mystery gear" });
    expect(result.certified).toBe(false);
    expect(result.unknownGear).toEqual(["mystery gear"]);
    expect(result.reasons.join(" ")).toContain("mystery gear");
    expect(result.reasons.join(" ")).toContain("common gear list");
  });

  it("rejects a missing or ungoverned measure type", () => {
    expect(certifyCoachOwnItem({ name: "X", reps: 5 }).certified).toBe(false);
    const innings = certifyCoachOwnItem({ name: "X", reps: 2, dosage_unit: "innings" });
    expect(innings.certified).toBe(false);
    expect(innings.reasons.join(" ")).toContain("choose a measure");
    for (const unit of COACH_OWN_MEASURE_UNITS) {
      const dose = unit === "seconds" ? { duration: 30 } : unit === "feet" ? { distance_feet: 60 } : { reps: 10 };
      expect(certifyCoachOwnItem({ name: "X", dosage_unit: unit, ...dose }).certified).toBe(true);
    }
  });

  it("requires an exact positive dose, whole counts for reps/throws, hundredths allowed for seconds", () => {
    expect(certifyCoachOwnItem({ name: "X", dosage_unit: "reps", reps: 0 }).certified).toBe(false);
    expect(certifyCoachOwnItem({ name: "X", dosage_unit: "reps", reps: 2.5 }).certified).toBe(false);
    expect(certifyCoachOwnItem({ name: "X", dosage_unit: "throws", reps: 10 }).certified).toBe(true);
    expect(certifyCoachOwnItem({ name: "X", dosage_unit: "seconds", duration: 1.47 }).certified).toBe(true);
    expect(certifyCoachOwnItem({ name: "X", dosage_unit: "feet", distance_feet: 7.5 }).certified).toBe(true);
  });

  it("requires a name and whole positive sets", () => {
    expect(certifyCoachOwnItem({ name: " ", dosage_unit: "reps", reps: 10 }).certified).toBe(false);
    expect(certifyCoachOwnItem({ name: "X", dosage_unit: "reps", reps: 10, sets: 1.5 }).certified).toBe(false);
    expect(certifyCoachOwnItem({ name: "X", dosage_unit: "reps", reps: 10, sets: 0 }).certified).toBe(false);
  });

  it("total_reps uses the total, not per-set reps", () => {
    expect(certifyCoachOwnItem({ name: "X", dosage_unit: "total_reps", total_reps: 24 }).certified).toBe(true);
    expect(certifyCoachOwnItem({ name: "X", dosage_unit: "total_reps", total_reps: 24.5 }).certified).toBe(false);
  });

  it("skips Vault-reviewed items and certifies only the coach's own", () => {
    const result = certifyCoachOwnItems([
      { name: "Reviewed drill", slug: "catalog_drill" },
      { name: "Coach drill", dosage_unit: "reps", reps: 10, gear: "dumbbells" },
    ]);
    expect(result.ok).toBe(true);
    expect(result.gearByName.get("Coach drill")).toEqual(["dumbbell"]);
    expect(result.gearByName.has("Reviewed drill")).toBe(false);
  });

  it("collects every item's reasons once", () => {
    const result = certifyCoachOwnItems([
      { name: "A", dosage_unit: "reps", reps: 0 },
      { name: "B", gear: "strange thing" },
    ]);
    expect(result.ok).toBe(false);
    expect(result.reasons.some(r => r.startsWith("A:"))).toBe(true);
    expect(result.reasons.some(r => r.includes("strange thing"))).toBe(true);
  });
});

describe("own-item certification wiring", () => {
  it("the choose path certifies own items before building plan rows", () => {
    const edge = read("supabase/functions/coach-rx-safety/index.ts");
    expect(edge).toContain("certifyCoachOwnItems");
    expect(edge).toContain("own_item_certified");
    expect(edge).toContain("certified_gear");
    // Certification runs before the row conversion.
    expect(edge.indexOf("certifyCoachOwnItems(")).toBeLessThan(edge.indexOf("coachRxToWkRows({"));
  });

  it("the envelope names the own-item workload boundary honestly", () => {
    const envelope = read("supabase/functions/_shared/coach/loadPrescriptionEnvelope.ts");
    expect(envelope).toContain("coach-written items have no reviewed workload");
    expect(envelope).toContain("its workload isn't declared in Exercise Vault");
  });

  it("certification never prices workload (no invented training logic)", () => {
    const module = read("supabase/functions/_shared/coach/ownItemCertification.ts");
    expect(module).not.toContain("cns_cost");
    expect(module).not.toMatch(/intensity_class\s*=/);
  });
});
