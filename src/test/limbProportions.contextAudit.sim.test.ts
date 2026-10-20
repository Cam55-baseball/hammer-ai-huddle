/** Plan-context audit, limb-proportions row: emphasis only, never invented. */
import { describe, expect, it } from "vitest";
import { proportionProfile } from "../../supabase/functions/_shared/wic/lift/proportionEmphasis";

describe("audit: limb proportions → plan", () => {
  it("long femur and long arms tilt emphasis", () => {
    const p = proportionProfile({ femur_in: 20, torso_in: 16, height_in: 70, wingspan_in: 74 });
    expect(p.legTilt).toBe(1);
    expect(p.armTilt).toBe(1);
  });
  it("no measurements → no tilt, no invented source", () => {
    const p = proportionProfile(null);
    expect([p.legTilt, p.armTilt, p.apeIndex, p.source.leg, p.source.arm]).toEqual([0, 0, null, null, null]);
  });
});
