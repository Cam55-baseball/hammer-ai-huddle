import { describe, expect, it, vi } from "vitest";
import { ANALYSIS_TYPES, dispatchAnalysisType, isAnalysisType } from "../../../supabase/functions/_shared/analysisTypes";
describe("owner's three analyzer boundary", () => {
  it("allows exactly hitting, pitching and throwing", () => {
    expect([...ANALYSIS_TYPES]).toEqual(["hitting", "pitching", "throwing"]);
    for (const value of ["fielding", "catching", "bunting", "baserunning", "other", undefined]) expect(isAnalysisType(value)).toBe(false);
  });
  it.each(ANALYSIS_TYPES)("dispatches %s only to its own analyzer", type => {
    const analyzers = { hitting: vi.fn(() => "hitting"), pitching: vi.fn(() => "pitching"), throwing: vi.fn(() => "throwing") };
    expect(dispatchAnalysisType(type, analyzers)).toBe(type);
    for (const other of ANALYSIS_TYPES) expect(analyzers[other]).toHaveBeenCalledTimes(other === type ? 1 : 0);
  });
  it.each(["fielding", "catching", "bunting", "base_running"])("never dispatches unsupported %s", type => {
    const analyzers = { hitting: vi.fn(), pitching: vi.fn(), throwing: vi.fn() };
    expect(() => dispatchAnalysisType(type, analyzers)).toThrow();
    for (const analyzer of Object.values(analyzers)) expect(analyzer).not.toHaveBeenCalled();
  });
});