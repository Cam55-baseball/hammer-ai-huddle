/**
 * Step 15 items 2 and 3 — the two tests that would have caught the release.
 *
 * Item 2: a capped day lowers intensity, it never deletes a required category.
 *         Every lift template must still validate at classes H, M and L.
 * Item 3: no prescribed row, on ANY path, may sit above the day's ceiling.
 */
import { describe, expect, it } from "vitest";
import {
  MANDATORY_RESCUE_SETS,
  pickMandatory,
} from "../../../supabase/functions/_shared/wic/lift/mandatory.ts";
import {
  LIFT_TEMPLATES,
  REQUIRED_LIFT_CATEGORIES,
} from "../../../supabase/functions/_shared/wic/lift/templates.ts";
import { blockedClassesFor } from "../../../supabase/functions/_shared/wic/schedule/tissueCost/apply.ts";
import type { AllowedClass } from "../../../supabase/functions/_shared/wic/schedule/tissueCost/types.ts";

type Row = { slug: string; category: string; intensity: string; cns: number };

/**
 * A deliberately hostile catalog: it mirrors the live shape that broke the
 * release — every core row is `high` except one supplemental row, which the
 * trunk primer had already claimed.
 */
const CATALOG: Row[] = [
  { slug: "core_a", category: "core", intensity: "high", cns: 2 },
  { slug: "core_b", category: "core", intensity: "high", cns: 1 },
  { slug: "core_light", category: "core", intensity: "supplemental", cns: 1 },
  { slug: "rot_a", category: "rotation", intensity: "high", cns: 2 },
  { slug: "rot_light", category: "rotation", intensity: "supplemental", cns: 1 },
  { slug: "low_a", category: "compound_lower", intensity: "max", cns: 4 },
  { slug: "low_light", category: "compound_lower", intensity: "supplemental", cns: 1 },
  { slug: "push_a", category: "compound_upper_push", intensity: "high", cns: 2 },
  { slug: "push_light", category: "compound_upper_push", intensity: "supplemental", cns: 1 },
  { slug: "pull_a", category: "compound_upper_pull", intensity: "high", cns: 2 },
  { slug: "pull_light", category: "compound_upper_pull", intensity: "supplemental", cns: 1 },
];

// Every other category any template can require gets the same hostile shape:
// a heavy row plus one light row.
for (const t of Object.values(LIFT_TEMPLATES)) {
  for (const cat of t.requiredCategories) {
    if (CATALOG.some((c) => c.category === cat)) continue;
    CATALOG.push({ slug: `${cat}_heavy`, category: cat, intensity: "high", cns: 2 });
    CATALOG.push({ slug: `${cat}_light`, category: cat, intensity: "supplemental", cns: 1 });
  }
}

const CAP_BY_CLASS: Record<AllowedClass, number> = { H: 6, M: 3, L: 1, none: 1 };

/** The same gate the generator applies: class first, then the day's ceiling. */
function pickers(cls: AllowedClass, taken: Set<string>) {
  const blocked = blockedClassesFor(cls);
  const cap = CAP_BY_CLASS[cls];
  const find = (slugs: string[], ignoreClass: boolean) => {
    for (const slug of slugs) {
      const r = CATALOG.find((c) => c.slug === slug);
      if (!r || taken.has(r.slug)) continue;
      if (!ignoreClass && blocked.includes(r.intensity)) continue;
      if (r.cns > cap) continue; // the ceiling is never relaxed
      return r;
    }
    return undefined;
  };
  return {
    strict: (s: string[]) => find(s, false),
    adaptationRelaxed: (s: string[]) => find(s, false),
    classRelaxed: (s: string[]) => find(s, true),
    categoryOf: (r: Row) => r.category,
  };
}

function buildSession(
  cls: AllowedClass,
  categories: readonly string[] = REQUIRED_LIFT_CATEGORIES,
) {
  const taken = new Set<string>();
  const rows: Array<{ row: Row; sets: number }> = [];
  // The trunk primer runs AFTER the required categories now, so it can no
  // longer eat the only legal core row.
  for (const category of categories) {
    const pool = CATALOG.filter((c) => c.category === category).map((c) => c.slug);
    const hit = pickMandatory<Row>(pool, pool.slice(0, 2), category, pickers(cls, taken));
    if (hit) {
      taken.add(hit.movement.slug);
      rows.push({ row: hit.movement, sets: hit.classRelaxed ? MANDATORY_RESCUE_SETS : 4 });
    }
  }
  const primer = pickers(cls, taken).strict(["core_light", "core_a", "rot_light"]);
  if (primer) {
    taken.add(primer.slug);
    rows.push({ row: primer, sets: 2 });
  }
  return rows;
}

describe("Step 15 item 2 — a cap lowers intensity, it never removes a category", () => {
  for (const cls of ["H", "M", "L"] as AllowedClass[]) {
    for (const templateId of Object.keys(LIFT_TEMPLATES)) {
      const template = LIFT_TEMPLATES[templateId as keyof typeof LIFT_TEMPLATES];
      it(`${templateId} still validates at class ${cls}`, () => {
        const rows = buildSession(cls, template.requiredCategories);
        const present = new Set(rows.map((r) => r.row.category));
        for (const required of template.requiredCategories) {
          expect(present.has(required), `${templateId} lost ${required} at class ${cls}`).toBe(true);
        }
      });
    }
  }

  it("dose, not the category, is what a low ceiling takes away", () => {
    const heavy = buildSession("H");
    const light = buildSession("L");
    expect(new Set(light.map((r) => r.row.category))).toEqual(new Set(heavy.map((r) => r.row.category)));
    const lightSets = light.reduce((n, r) => n + r.sets, 0);
    const heavySets = heavy.reduce((n, r) => n + r.sets, 0);
    expect(lightSets).toBeLessThan(heavySets);
  });

  it("the trunk primer can no longer claim the only legal core row", () => {
    const rows = buildSession("L");
    expect(rows.filter((r) => r.row.category === "core").length).toBeGreaterThan(0);
  });
});

describe("Step 15 item 3 — nothing on any path goes above the day's ceiling", () => {
  for (const cls of ["H", "M", "L", "none"] as AllowedClass[]) {
    it(`class ${cls}: no prescribed row exceeds the ceiling`, () => {
      const rows = buildSession(cls);
      for (const r of rows) {
        expect(r.row.cns, `${r.row.slug} above the ceiling at class ${cls}`).toBeLessThanOrEqual(
          CAP_BY_CLASS[cls],
        );
      }
    });
  }

  it("the ceiling is not relaxed even by the last-resort rescue", () => {
    const hit = pickMandatory<Row>(["low_a"], ["low_a"], "compound_lower", pickers("L", new Set()));
    // low_a costs 4 and the class-L ceiling is 1, so the rescue must refuse it.
    expect(hit).toBeUndefined();
  });
});
