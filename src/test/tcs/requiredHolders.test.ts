/**
 * Step 24 item 8 — the load governor may never remove a row that holds a
 * category its template requires (the acceleration sprint, the main lift).
 */
import { describe, expect, it } from "vitest";
import { planTrims } from "../../../supabase/functions/_shared/wic/exposure/requiredHolders.ts";

const trims = [
  { slug: "sp_accel_10yd", action: "row_dropped", to: null },
  { slug: "sp_extra_flys", action: "row_dropped", to: null },
  { slug: "lift_main_squat", action: "tier_step_down", to: { slug: "lift_goblet", sets: 2 } },
  { slug: "lift_accessory_curl", action: "tier_step_down", to: { slug: "lift_band_curl", sets: 2 } },
];

describe("required-category rows survive a load trim", () => {
  const required = new Set(["sp_accel_10yd", "lift_main_squat"]);
  const plan = planTrims(trims, required);

  it("never drops the row holding a required category", () => {
    expect(plan.dropped.has("sp_accel_10yd")).toBe(false);
    expect(plan.protectedSlugs).toContain("sp_accel_10yd");
  });

  it("still drops rows nothing depends on", () => {
    expect(plan.dropped.has("sp_extra_flys")).toBe(true);
  });

  it("never swaps the main lift away from its required category", () => {
    expect(plan.stepped.has("lift_main_squat")).toBe(false);
    expect(plan.protectedSlugs).toContain("lift_main_squat");
  });

  it("still steps down accessory rows", () => {
    expect(plan.stepped.get("lift_accessory_curl")?.slug).toBe("lift_band_curl");
  });
});
