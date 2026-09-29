import { describe, expect, it } from "vitest";
import { getReportCardSpec } from "../index";
import { athleteMissingness, withoutMeasurementNotation } from "../athleteLanguage";
import { BH_UPLOAD_TILES } from "../disciplines/bh";
import { coachFacingTile } from "../coachCopy";

describe("athlete-facing mechanics language", () => {
  it("contains no degree or percentage measurements for any report-card tile", () => {
    for (const [sport, module] of [["baseball", "hitting"], ["softball", "hitting"], ["baseball", "throwing"], ["softball", "throwing"], ["baseball", "pitching"], ["softball", "pitching"]]) {
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
  it("keeps the owner hitting standards in plain language for both sports without changing diagnostic computations", () => {
    for (const sport of ["baseball", "softball"]) {
      for (const source of BH_UPLOAD_TILES) {
        const tile = coachFacingTile(source, sport);
        const visible = [tile.name, tile.standard, tile.explainer.whatWhy, tile.explainer.howToImprove, tile.explainer.encouragement].join(" ");
        expect(visible, `${sport}/${tile.key}`).not.toMatch(/\d(?:\.\d+)?\s*[°%]|\b\d+\s*(?:ms|milliseconds|fps)\b/i);
        expect(tile.compute).toBe(source.compute);
      }
    }
  });
  it("does not show numeric measurements or robotic placeholder copy in the last-line guard", () => {
    const line = withoutMeasurementNotation("Your hips slid 6.8% forward. Turn the hips instead of drifting.");
    expect(line).toBe("Turn the hips instead of drifting.");
    expect(line).not.toContain("a measured amount");
  });
});