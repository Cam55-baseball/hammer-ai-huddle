// Required-category rule for every lift template (2026-09-25 demo incident).
//
// A required category may never produce a fatal while a legal option exists.
// When the day's filters empty a category the certifier swaps to a lighter
// template whose requirements the legal rows meet, and writes a plain reason.
// Legality is never widened: eccentric-overload rows stay out in-season and
// age-gated rows stay out for young athletes.
import { describe, expect, it } from "vitest";
import { certifyLift } from "../../supabase/functions/_shared/wic/lift/sessionBuilder.ts";
import {
  LIFT_TEMPLATES,
  resolveLiftTemplate,
} from "../../supabase/functions/_shared/wic/lift/templates.ts";

type Row = {
  slug: string;
  movement_category: string;
  equipment_requirements: string[];
  eccentric_overload?: boolean;
  min_age?: number;
};

const CATALOG: Row[] = [
  { slug: "back_squat_double_ecc", movement_category: "compound_lower", equipment_requirements: ["barbell", "rack"], eccentric_overload: true },
  { slug: "goblet_squat", movement_category: "compound_lower", equipment_requirements: ["dumbbell"] },
  { slug: "bodyweight_box_squat", movement_category: "compound_lower", equipment_requirements: [] },
  { slug: "trap_bar_deadlift", movement_category: "compound_lower", equipment_requirements: ["trap_bar"], min_age: 16 },
  { slug: "db_bench", movement_category: "compound_upper_push", equipment_requirements: ["dumbbell", "bench"] },
  { slug: "push_up", movement_category: "compound_upper_push", equipment_requirements: [] },
  { slug: "band_row", movement_category: "compound_upper_pull", equipment_requirements: ["band"] },
  { slug: "inverted_row", movement_category: "compound_upper_pull", equipment_requirements: ["bar"] },
  { slug: "dead_bug", movement_category: "core", equipment_requirements: [] },
  { slug: "med_ball_scoop_toss", movement_category: "rotation", equipment_requirements: ["med_ball"] },
  { slug: "bodyweight_rotation_reach", movement_category: "rotation", equipment_requirements: [] },
  { slug: "hip_mobility_flow", movement_category: "mobility", equipment_requirements: [] },
];

const catalog = CATALOG.map((r) => ({
  ...r,
  name: r.slug,
  pattern: null,
  category: null,
  substitution_family: null,
  season_legality: null,
  training_age_legality: null,
}));

const EQUIPMENT: Record<string, string[] | null> = {
  none: [],
  minimal: ["band", "dumbbell", "bench"],
  full: null, // no restriction
};
const PHASES = ["regular_season", "in_season", "tournament", "postseason", "offseason_q1", "offseason_q3"];
const DAY_CLASSES = ["train", "pre_game_48h", "game", "recovery", "travel", "rest"] as const;
const SPORTS = ["baseball", "softball"] as const;
const AGES = [13, 16, 19];
const IN_SEASON = new Set(["regular_season", "in_season", "tournament", "postseason"]);

/** Legal pool after every real gate: equipment, in-season eccentric ban, age. */
function legalPool(eq: string[] | null, phase: string, age: number): Row[] {
  return CATALOG.filter((r) => {
    if (eq && r.equipment_requirements.some((e) => !eq.includes(e))) return false;
    if (IN_SEASON.has(phase) && r.eccentric_overload) return false;
    if (r.min_age && age < r.min_age) return false;
    return true;
  });
}

/** What the generator puts on the card for a given day class. */
function buildLiftRows(pool: Row[], day: (typeof DAY_CLASSES)[number]) {
  const rows: Row[] = [];
  const firstOf = (cat: string) => pool.find((r) => r.movement_category === cat);
  const cats = day === "recovery" || day === "rest"
    ? ["core", "mobility"]
    : day === "pre_game_48h"
      ? ["core", "mobility"] // loaded work stripped by schedule law
      : ["compound_lower", "compound_upper_push", "compound_upper_pull", "core", "rotation", "mobility"];
  for (const c of cats) {
    const r = firstOf(c);
    if (r) rows.push(r);
  }
  return rows.map((r, i) => ({
    slot: "lift",
    movement_slug: r.slug,
    movement_name: r.slug,
    sequence_order: i + 1,
    sequence_role: r.movement_category,
  }));
}

describe("every template × day class × season × equipment × sport × age", () => {
  const cells: string[] = [];
  for (const sport of SPORTS)
    for (const phase of PHASES)
      for (const [eqName, eq] of Object.entries(EQUIPMENT))
        for (const day of DAY_CLASSES)
          for (const age of AGES) cells.push(JSON.stringify({ sport, phase, eqName, day, age }));

  it(`produces zero fatals across ${cells.length} cells`, () => {
    const failures: string[] = [];
    for (const cell of cells) {
      const { phase, eqName, day, age } = JSON.parse(cell);
      const eq = EQUIPMENT[eqName];
      const pool = legalPool(eq, phase, age);
      const rxs = buildLiftRows(pool, day);
      const res = certifyLift({
        prescriptions: rxs as never,
        catalog: catalog as never,
        template: {
          seasonPhase: phase,
          dayType: day === "recovery" || day === "rest" ? "recovery" : day,
          isGameDay: day === "game",
          isRecoveryDay: day === "recovery" || day === "rest",
        },
        availableEquipment: eq ?? undefined,
        loadedWorkSuppressed: day === "pre_game_48h" || day === "rest",
      });
      if (res.fatal.length > 0) failures.push(`${cell} → ${res.fatal.map((f) => f.code).join(",")}`);
      // Never widened: no eccentric row in-season, no age-gated row too young.
      for (const r of rxs) {
        const row = CATALOG.find((c) => c.slug === r.movement_slug)!;
        if (IN_SEASON.has(phase)) expect(row.eccentric_overload).not.toBe(true);
        if (row.min_age) expect(age).toBeGreaterThanOrEqual(row.min_age);
      }
    }
    expect(failures).toEqual([]);
  });

  it("covers every template the resolver can return", () => {
    const seen = new Set<string>();
    for (const phase of PHASES)
      for (const day of DAY_CLASSES)
        seen.add(
          resolveLiftTemplate({
            seasonPhase: phase,
            dayType: day,
            isGameDay: day === "game",
            isRecoveryDay: day === "recovery" || day === "rest",
          }).id,
        );
    for (const a of ["power", "force", "elastic"])
      seen.add(resolveLiftTemplate({ seasonPhase: "offseason_q2", primaryAdaptation: a }).id);
    const activated = Object.keys(LIFT_TEMPLATES).filter((id) => id !== "full_body_return_to_play");
    expect([...seen].sort()).toEqual(activated.sort());
  });
});

describe("template swap when a required category is emptied", () => {
  it("swaps to the recovery plan with a plain reason instead of failing", () => {
    const rxs = ["dead_bug", "hip_mobility_flow", "push_up"].map((s, i) => ({
      slot: "lift", movement_slug: s, movement_name: s, sequence_order: i + 1,
    }));
    const res = certifyLift({
      prescriptions: rxs as never,
      catalog: catalog as never,
      template: { seasonPhase: "offseason_q2" },
    });
    expect(res.fatal).toEqual([]);
    expect(res.templateId).toBe("full_body_recovery");
    const w = res.warn.find((x) => x.code === "lift_template_swapped");
    expect(w?.message).toMatch(/no legal compound lower/);
  });

  it("still fails when no lighter template can be met either", () => {
    const rxs = [{ slot: "lift", movement_slug: "push_up", movement_name: "push_up", sequence_order: 1 }];
    const res = certifyLift({
      prescriptions: rxs as never,
      catalog: catalog as never,
      template: { seasonPhase: "offseason_q2" },
    });
    expect(res.fatal.some((f) => f.code === "lift_not_full_body")).toBe(true);
  });
});
