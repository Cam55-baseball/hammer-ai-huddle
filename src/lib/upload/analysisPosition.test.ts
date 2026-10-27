import { expect, it } from "vitest";
import { analysisPositionContext } from "../../../supabase/functions/_shared/analysisPosition";
it("separates pitching from a pitcher's field throw", () => {
  expect(analysisPositionContext("throwing", "baseball", "P")).toContain("field throw by a pitcher, not a pitching-delivery analysis");
  expect(analysisPositionContext("pitching", "softball", "P")).toContain("windmill delivery from the circle");
  expect(analysisPositionContext("pitching", "baseball", "P")).toContain("overhand delivery from the mound");
});
it("uses confirmed catcher, infield and outfield contexts but never assumes missing position", () => {
  expect(analysisPositionContext("throwing", "softball", "C")).toContain("never invent a pop time");
  expect(analysisPositionContext("throwing", "baseball", "SS")).toContain("clean hands");
  expect(analysisPositionContext("throwing", "softball", "CF")).toContain("crow-hop");
  expect(analysisPositionContext("throwing", "baseball", null)).toContain("Position is not confirmed");
});