/**
 * Step 23 — a sprint category filled by its closest legal movement is FILLED.
 *
 * The selector is allowed to cover a required category (e.g. acceleration)
 * with a near neighbour when the athlete's own pool has nothing else. The
 * certifier used to read that slot as missing and refuse the whole card, which
 * is the same "two sides counting different things" fault as Step 21. Both
 * sides must count the same thing: a covered slot is a note, never a failure.
 */
import { describe, expect, it } from "vitest";
import { certifySpeed } from "../../../supabase/functions/_shared/wic/speed/sessionBuilder.ts";

const catalog = [
  {
    slug: "sp_band_resisted_start",
    name: "Band-Resisted Start",
    speed_category: "resisted",
    substitution_family: "start_contrast",
    equipment_requirements: [],
    season_legality: {},
    training_age_legality: {},
    default_sets: 3,
  },
] as never[];

const input = (extra: Record<string, unknown>) =>
  ({
    prescriptions: [{
      slot: "speed",
      movement_slug: "sp_band_resisted_start",
      movement_name: "Band-Resisted Start",
      sequence_order: 1,
    }],
    catalog,
    template: { seasonPhase: "in_season", dayType: "training", primaryAdaptation: "speed" },
    ...extra,
  }) as never;

describe("a required sprint category covered by a near neighbour", () => {
  it("fails the build when nobody says the slot was covered", () => {
    const r = certifySpeed(input({}));
    const codes = r.fatal.map((f: { code: string }) => f.code);
    expect(codes).toContain("speed_unresolved_template");
  });

  it("builds the card, with a note, when the selector covered the slot", () => {
    const r = certifySpeed(input({ fallbackCoveredCategories: ["acceleration"] }));
    expect(r.fatal).toEqual([]);
    expect(r.warn.map((w: { code: string }) => w.code)).toContain("speed_category_fallback_covered");
  });

  it("still says so plainly when the slot genuinely could not be filled", () => {
    const r = certifySpeed(input({ unfillableRequiredCategories: ["acceleration"] }));
    expect(r.fatal).toEqual([]);
    expect(r.warn.map((w: { code: string }) => w.code)).toContain("speed_template_gap");
  });
});
