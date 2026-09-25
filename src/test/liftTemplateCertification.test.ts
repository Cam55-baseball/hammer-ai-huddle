// In-season lift certification regression (2026-09-25).
//
// Two defects fixed here:
//  1. The training context emits the CANONICAL phase name ("regular_season"),
//     but the template resolver only recognised the legacy "in_season" id, so
//     every in-season athlete resolved the off-season strength template.
//  2. On a day where the schedule law strips loaded work (48-hour pre-game
//     primer window, rest day, Tell Hammers hold) the missing compound
//     category was reported as FATAL, which failed the card build and served
//     the safe fallback day instead.
import { describe, expect, it } from "vitest";
import {
  certifyLift,
  type CatalogEntryLike,
} from "../../supabase/functions/_shared/wic/lift/sessionBuilder.ts";
import { resolveLiftTemplate } from "../../supabase/functions/_shared/wic/lift/templates.ts";

const catalog = [
  {
    slug: "safe_dead_bug_hold",
    name: "Dead Bug Hold",
    movement_category: "core",
    pattern: "trunk",
    category: "trunk",
    substitution_family: null,
    season_legality: null,
    training_age_legality: null,
    equipment_requirements: null,
  },
] as unknown as readonly CatalogEntryLike[];

const rxs = [
  {
    slot: "lift",
    movement_slug: "safe_dead_bug_hold",
    movement_name: "Dead Bug Hold",
    sequence_order: 1,
    sequence_role: "trunk_primer",
  },
];

describe("lift template resolution", () => {
  it("treats the canonical in-season phase name as in-season", () => {
    expect(resolveLiftTemplate({ seasonPhase: "regular_season" }).id).toBe(
      "full_body_in_season_maintenance",
    );
    expect(resolveLiftTemplate({ seasonPhase: "in_season" }).id).toBe(
      "full_body_in_season_maintenance",
    );
  });

  it("still resolves strength for an off-season training day", () => {
    expect(resolveLiftTemplate({ seasonPhase: "offseason_q2" }).id).toBe("full_body_strength");
  });
});

describe("certifyLift on a day with loaded work suppressed", () => {
  it("fails the build when loaded work was allowed but a category is missing", () => {
    const res = certifyLift({
      prescriptions: rxs as never,
      catalog: catalog as never,
      template: { seasonPhase: "regular_season" },
    });
    expect(res.fatal.some((f) => f.code === "lift_missing_compound_lower")).toBe(true);
  });

  it("reports an honest gap, not a failure, inside the pre-game primer window", () => {
    const res = certifyLift({
      prescriptions: rxs as never,
      catalog: catalog as never,
      template: { seasonPhase: "regular_season" },
      loadedWorkSuppressed: true,
    });
    expect(res.fatal).toHaveLength(0);
    expect(res.warn.some((w) => w.code === "lift_missing_compound_lower")).toBe(true);
  });
});
