import { describe, expect, it } from "vitest";
import { ELITE_DRILL_CATALOG } from "@/data/drills/eliteDrillCatalog";
import { baseballDrills } from "@/data/baseball/drillDefinitions";
import { softballDrills } from "@/data/softball/drillDefinitions";
import { ownsSportDrillGear } from "../sportDrillGear";

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

for (const [sport, drills, balls] of [["baseball", baseballDrills, "baseballs"], ["softball", softballDrills, "softballs"]] as const) {
  describe(`${sport} declared equipment`, () => {
    it("partner flips cannot be supplied without a partner", () => {
      const drill = drills.find(d => d.id === "flip_drill");
      if (!drill) throw new Error("Missing catalog drill");
      expect(ownsSportDrillGear(drill, ["bat", balls])).toBe(false);
      expect(ownsSportDrillGear(drill, ["bat", balls, "partner"])).toBe(true);
    });
    it("mirror feedback accepts a mirror OR phone but not neither", () => {
      const drill = drills.find(d => d.id === "hip_load_iso");
      if (!drill) throw new Error("Missing catalog drill");
      expect(ownsSportDrillGear(drill, ["bat", "mirror"])).toBe(true);
      expect(ownsSportDrillGear(drill, ["bat", "phone"])).toBe(true);
      expect(ownsSportDrillGear(drill, ["bat"])).toBe(false);
    });
    it("tee-or-front-toss needs either tee or a protected partner setup", () => {
      const drill = drills.find(d => d.id === "elbow_first_fulcrum");
      if (!drill) throw new Error("Missing catalog drill");
      expect(ownsSportDrillGear(drill, ["bat", balls, "tee"])).toBe(true);
      expect(ownsSportDrillGear(drill, ["bat", balls, "partner", "screen"])).toBe(true);
      expect(ownsSportDrillGear(drill, ["bat", balls, "partner"])).toBe(false);
    });
  });
}