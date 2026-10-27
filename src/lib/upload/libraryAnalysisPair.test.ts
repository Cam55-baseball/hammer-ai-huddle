import { expect, it } from "vitest";
import { canSaveLibraryPair } from "../../../supabase/functions/_shared/libraryAnalysisPair";
const report = { summary: ["Observed clip"], feedback: "Visible movement", drills: [] };
it.each(["baseball", "softball"])("requires video WITH its readable report for %s analysis saves", () => {
  for (const module of ["hitting", "pitching", "throwing"]) {
    expect(canSaveLibraryPair({ video_url: "stored-video", module, ai_analysis: report }, true)).toBe(true);
    expect(canSaveLibraryPair({ video_url: "stored-video", module, ai_analysis: null }, true)).toBe(false);
    expect(canSaveLibraryPair({ module, ai_analysis: report }, true)).toBe(false);
  }
});
it("does not turn unsupported video categories into analysis", () => {
  for (const module of ["fielding", "catching", "bunting"]) expect(canSaveLibraryPair({ video_url: "stored-video", module, ai_analysis: report }, true)).toBe(false);
});
it("keeps deliberate non-analysis library recording available elsewhere", () => {
  expect(canSaveLibraryPair({ video_url: "stored-video", module: "fielding" }, false)).toBe(true);
});