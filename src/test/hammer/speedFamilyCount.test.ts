/**
 * Step 21 — the speed swap-ladder check must compare like with like.
 *
 * The ladder only ever contains season-legal and training-age-legal
 * alternates. Counting the raw family (legal or not) and comparing it against
 * the ladder raised a fatal that refused whole cards for athletes whose phase
 * or training-age class ruled the alternates out.
 */
import { describe, it, expect } from "vitest";
import {
  countLegalSpeedFamilyAlternates,
  resolveSpeedSubstitutionLadder,
} from "../../../supabase/functions/_shared/wic/speed/substitutions.ts";

const movement = {
  slug: "sp_wall_iso_to_sprint",
  substitution_family: "accel_iso",
  transfer_group: "accel",
  season_legality: {},
  training_age_legality: {},
} as never;

const catalog = [
  movement,
  {
    slug: "sp_wall_drive_march",
    substitution_family: "accel_iso",
    transfer_group: "accel",
    season_legality: { in_season: false },
    training_age_legality: {},
  },
  {
    slug: "sp_hill_accel",
    substitution_family: "accel_iso",
    transfer_group: "accel",
    season_legality: {},
    training_age_legality: { foundation: false },
  },
] as never[];

describe("speed substitution family counting", () => {
  it("ignores alternates the season rules out", () => {
    expect(
      countLegalSpeedFamilyAlternates({ movement, catalog, phase: "in_season" }),
    ).toBe(1);
  });

  it("ignores alternates the athlete's training age rules out", () => {
    expect(
      countLegalSpeedFamilyAlternates({ movement, catalog, trainingAgeClass: "foundation" }),
    ).toBe(1);
  });

  it("counts every alternate when nothing rules them out", () => {
    expect(countLegalSpeedFamilyAlternates({ movement, catalog })).toBe(2);
  });

  it("never counts more alternates than the ladder can offer", () => {
    const input = { movement, catalog, phase: "in_season", trainingAgeClass: "foundation" };
    const ladder = resolveSpeedSubstitutionLadder(input as never);
    const legal = countLegalSpeedFamilyAlternates(input as never);
    expect(legal).toBeLessThanOrEqual(ladder.coach_override.length);
  });
});
