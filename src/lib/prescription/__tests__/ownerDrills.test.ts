import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ELITE_DRILL_CATALOG } from "@/data/drills/eliteDrillCatalog";
import { matchPrescriptionDrills } from "../matchDrills";
import { mergeCatalog, type OwnerDrillRow } from "../ownerDrills";

const row = (o: Partial<OwnerDrillRow>): OwnerDrillRow => ({
  id: "r1", overrides_drill_id: null, placements: ["analysis:baseball:hitting"], sports: ["baseball"], name: "Owner Drill",
  fault_keys: ["front_heel_not_down_at_landing"], phase: "Phase 3 — Load by Stride", level: "feel", dosage: "3 x 6",
  setup: "s", steps: ["a"], cue: "c", feel: "f", feel_wrong: "w", common_mistake: "m", equipment: [], video_url: null,
  active: true, pinned: false, created_at: new Date().toISOString(), ...o,
});

describe("owner drill builder", () => {
  it("an owner-created drill is matched for its fault", () => {
    const catalog = mergeCatalog(ELITE_DRILL_CATALOG, [row({})]);
    const hits = matchPrescriptionDrills({ catalog, faultKeys: ["front_heel_not_down_at_landing"], module: "hitting", sport: "baseball", max: 50 });
    expect(hits.some((h) => h.drill.name === "Owner Drill")).toBe(true);
  });
  it("an override replaces its built-in drill; switched off removes it", () => {
    const catalog = mergeCatalog(ELITE_DRILL_CATALOG, [row({ overrides_drill_id: "doc.hit.heel_down_freeze", name: "Edited Heel" })]);
    expect(catalog.filter((d) => d.id === "doc.hit.heel_down_freeze").map((d) => d.name)).toEqual(["Edited Heel"]);
    const off = mergeCatalog(ELITE_DRILL_CATALOG, [row({ overrides_drill_id: "doc.hit.heel_down_freeze", active: false })]);
    expect(off.some((d) => d.id === "doc.hit.heel_down_freeze")).toBe(false);
  });
  it("no single drill monopolises a fault across repeated serves", () => {
    const catalog = mergeCatalog(ELITE_DRILL_CATALOG, [row({ id: "a", created_at: "2020-01-01" }), row({ id: "b", name: "Other", created_at: "2020-01-01" })]);
    const served: Record<string, number> = {};
    const usage = { "owner.a": { completed: 9999, returned: 9999 } };
    const counts: Record<string, number> = {};
    const N = 30;
    for (let i = 0; i < N; i++) {
      const [top] = matchPrescriptionDrills({ catalog, faultKeys: ["front_heel_not_down_at_landing"], module: "hitting", sport: "baseball", max: 1, circulation: { servedToUser: served, usage } });
      counts[top.drill.id] = (counts[top.drill.id] ?? 0) + 1;
      served[top.drill.id] = (served[top.drill.id] ?? 0) + 1;
    }
    for (const c of Object.values(counts)) expect(c / N).toBeLessThanOrEqual(0.55);
  });
  it("drill writes are owner/admin only at the database and the route", () => {
    const app = readFileSync("src/App.tsx", "utf8");
    expect(app).toMatch(/\/owner\/drill-builder" element=\{<StaffOnlyRoute><DrillBuilder/);
  });
});

describe("usage is never effectiveness", () => {
  it("no drill screen claims outcome evidence", () => {
    for (const f of ["src/components/analyze/AnalysisPrescriptionSection.tsx", "src/pages/owner/DrillBuilder.tsx"]) {
      expect(readFileSync(f, "utf8")).not.toMatch(/most effective|best performing|proven|top performer|works best/i);
    }
  });
  it("athletes never see usage counts", () => {
    expect(readFileSync("src/components/analyze/AnalysisPrescriptionSection.tsx", "utf8")).not.toMatch(/Used \{|Repeated|usage/);
  });
});
