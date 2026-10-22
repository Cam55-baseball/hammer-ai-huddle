import { describe, expect, it } from "vitest";
import { ELITE_DRILL_CATALOG } from "@/data/drills/eliteDrillCatalog";

describe("source-supported drill equipment corrections", () => {
  it("long-toss extension needs a baseball, partner and marked field", () => {
    const drill = ELITE_DRILL_CATALOG.find(d => d.id === "elite.throw.long_toss_pulldown_ladder");
    expect(drill?.equipment).toEqual(["baseballs", "partner", "field"]);
  });
  it("towel extension needs the partner's target glove and athlete's towel", () => {
    const drill = ELITE_DRILL_CATALOG.find(d => d.id === "elite.pitch.towel_extension");
    expect(drill?.equipment).toEqual(["glove", "towel", "partner"]);
  });
  it("fixed-eye delivery needs tape, a filming phone and partner alongside the net", () => {
    const drill = ELITE_DRILL_CATALOG.find(d => d.id === "elite.pitch.head_stability_target");
    expect(drill?.equipment).toEqual(["net", "tape", "partner", "phone"]);
  });
});