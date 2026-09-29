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
  it("shows two separate heel standards and never repeats the superseded back-heel advice", () => {
    for (const sport of ["baseball", "softball"]) {
      const front = BH_UPLOAD_TILES.find((tile) => tile.key === "heel_plant");
      const back = BH_UPLOAD_TILES.find((tile) => tile.key === "back_heel_early_rise");
      expect(front).toBeDefined();
      expect(back).toBeDefined();
      if (!front || !back) continue;
      const frontCopy = coachFacingTile(front, sport);
      const backCopy = coachFacingTile(back, sport);
      expect(frontCopy.standard).toContain("front heel");
      expect(backCopy.standard).toContain("back heel");
      expect([frontCopy, backCopy].flatMap((tile) => [tile.standard, ...Object.values(tile.explainer)]).join(" ")).not.toMatch(/back heel (?:may|can|is allowed to) rise|don't pin your back heel down|do not force the back heel down/i);
    }
  });
  it("uses softball-specific hitting copy rather than a baseball card with its label swapped", () => {
    for (const source of BH_UPLOAD_TILES) {
      const softball = coachFacingTile(source, "softball");
      expect([softball.standard, ...Object.values(softball.explainer)].join(" "), source.key)
        .not.toMatch(/baseball|BP round|his knee peak|back heel (?:may|can) rise/i);
      expect(softball.compute).toBe(source.compute);
    }
  });
  it("does not show numeric measurements or robotic placeholder copy in the last-line guard", () => {
    const line = withoutMeasurementNotation("Your hips slid 6.8% forward. Turn the hips instead of drifting.");
    expect(line).toBe("Turn the hips instead of drifting.");
    expect(line).not.toContain("a measured amount");
  });
});