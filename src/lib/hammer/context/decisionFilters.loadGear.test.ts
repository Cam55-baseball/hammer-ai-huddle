import { describe, expect, it } from "vitest";
import { projectEnvelope } from "./decisionFilters";
import type { HammerAthleteContext, ContextVariable } from "./athleteContext";

const ctx = (equipment: unknown): HammerAthleteContext => {
  const v = { key: "equipment_effective", label: "e", domain: "identity", value: equipment, source: "t", confidence: "high", missing: false, lastUpdated: null, lineage: { owner: "t", source: "t", rawConfidence: "high" } } as unknown as ContextVariable;
  return { variables: [v], missing: [], isLoading: false, missingCount: 0, envelope: null, get: <T,>(k: string) => (k === v.key ? v : undefined) as ContextVariable<T> | undefined };
};

describe("saved lifting gear is honored over a saved band", () => {
  it("barbell + bands is not a bodyweight-only venue", () => {
    const p = projectEnvelope(ctx(["bat", "barbell", "plates", "squat_rack", "bench", "dumbbells", "bands", "open_space", "field"]));
    expect(["bands", "bodyweight", "hotel"]).not.toContain(p.equipment);
  });
  it("bands alone stays bands", () => {
    expect(projectEnvelope(ctx(["bands"])).equipment).toBe("bands");
  });
  it("unknown gear stays unknown (assumed available)", () => {
    expect(projectEnvelope(ctx(null)).equipment).toBeNull();
  });
});
