// A legal movement whose alternates are all filtered out (gear/phase/age)
// must not fail the card; it is reported as a warning (owner Oct 27, sled).
import { describe, expect, it } from "vitest";
import { certifyLift } from "../../supabase/functions/_shared/wic/lift/sessionBuilder.ts";

const base = { pattern: null, category: null, season_legality: null, training_age_legality: null };
const catalog = [
  { slug: "sled_light", name: "sled_light", movement_category: "hip_ext", equipment_requirements: [], substitution_family: "sled" },
  { slug: "sled_heavy", name: "sled_heavy", movement_category: "hip_ext", equipment_requirements: ["sled", "rack", "trap_bar"], substitution_family: "sled" },
  { slug: "sled_march", name: "sled_march", movement_category: "hip_ext", equipment_requirements: ["sled", "rack", "trap_bar"], substitution_family: "sled" },
].map((r) => ({ ...base, ...r }));

describe("thin swap ladder", () => {
  it("warns instead of failing when alternates exist but none fit", () => {
    const res = certifyLift({
      prescriptions: [{ slot: "lift", movement_slug: "sled_light", movement_name: "sled_light", sequence_order: 1 }] as never,
      catalog: catalog as never,
      template: { seasonPhase: "offseason_q2" },
      availableEquipment: ["band"],
    });
    expect(res.fatal.map((f) => f.code)).not.toContain("lift_unresolved_substitution");
  });
});
