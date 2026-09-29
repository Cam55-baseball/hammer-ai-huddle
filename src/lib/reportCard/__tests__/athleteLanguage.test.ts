import { describe, expect, it } from "vitest";
import { getReportCardSpec } from "../index";
import { athleteMissingness, withoutMeasurementNotation } from "../athleteLanguage";

describe("athlete-facing mechanics language", () => {
  it("contains no degree or percentage measurements for any report-card tile", () => {
    for (const [sport, module] of [["baseball", "hitting"], ["baseball", "pitching"], ["softball", "pitching"]]) {
      const spec = getReportCardSpec(sport, module);
      for (const tile of spec?.tiles ?? []) {
        const visible = [tile.standard, tile.thresholdChip ?? "", tile.explainer.whatWhy, tile.explainer.howToImprove, tile.explainer.encouragement]
          .map(withoutMeasurementNotation).join(" ");
        expect(visible, `${sport}/${module}/${tile.key}`).not.toMatch(/\d(?:\.\d+)?\s*[°%]/);
      }
    }
  });

  it("translates canonical missingness into coach-to-player language", () => {
    expect(athleteMissingness("insufficient_temporal_resolution")).toBe("This clip was filmed too slowly for us to measure this one.");
    expect(athleteMissingness("landmark_occluded")).toContain("pointed at the camera");
    expect(athleteMissingness("anchor_not_detected")).not.toContain("anchor");
  });
});