/**
 * Step 20 A — the automated safety audit that replaces per-exercise approval.
 * These lock the checks that decide whether a row may switch itself on.
 */
import { describe, expect, it } from "vitest";
import {
  auditCatalog,
  auditRow,
  resolveIntensityClass,
  type AuditCatalogRow,
} from "../../../supabase/functions/_shared/wic/catalog/safetyAudit.ts";

const base = (over: Partial<AuditCatalogRow> = {}): AuditCatalogRow =>
  ({
    slug: "test_row",
    name: "Split Squat",
    category: "lower_strength",
    cue: "Stay tall.",
    bucket: "Strength",
    sub_bucket: "Single-leg",
    intensity_class: "compound_lower",
    cns_cost: 3,
    min_age_years: 14,
    min_training_age_years: 1,
    season_eligibility: ["os_q1", "in_season"],
    equipment: ["dumbbells"],
    equipment_requirements: ["dumbbells"],
    regression_slug: null,
    eccentric_overload: false,
    deep_flexion: false,
    ub_tier: null,
    plyo_tier: null,
    dosage_unit: "reps",
    default_sets: 3,
    default_reps: 8,
    default_duration_seconds: null,
    default_distance_feet: null,
    default_total_reps: null,
    is_active: false,
    superseded_by: null,
    substitution_family: "split_squat",
    ...over,
  }) as AuditCatalogRow;

const index = (rows: AuditCatalogRow[]) => ({
  activeSlugs: new Set(rows.filter((r) => r.is_active).map((r) => r.slug)),
  allSlugs: new Set(rows.map((r) => r.slug)),
  liveEquipment: new Set(rows.filter((r) => r.is_active).flatMap((r) => r.equipment ?? [])),
});

describe("Step 20 catalog safety audit", () => {
  it("passes a complete, legal row", () => {
    const row = base();
    expect(auditRow(row, index([row])).failures).toEqual([]);
  });

  it("refuses a tier-3 jump below its age floor", () => {
    const row = base({ plyo_tier: "T3", min_age_years: 14 });
    expect(auditRow(row, index([row])).failures.join(" ")).toMatch(/age/i);
  });

  it("refuses eccentric overload that claims to be legal in-season", () => {
    const row = base({ eccentric_overload: true, season_eligibility: ["in_season"] });
    expect(auditRow(row, index([row])).failures.join(" ")).toMatch(/eccentric/i);
  });

  it("refuses an outside coach or brand name anywhere the athlete can see it", () => {
    const row = base({ name: "Triphasic Split Squat" });
    expect(auditRow(row, index([row])).failures.join(" ")).toMatch(/name/i);
  });

  it("refuses a regression chain that points at a row that is still off", () => {
    const parent = base({ slug: "parent_row", is_active: false });
    const child = base({ slug: "child_row", regression_slug: "parent_row" });
    expect(auditRow(child, index([parent, child])).failures.join(" ")).toMatch(/easier|regression/i);
  });

  it("refuses an equipment tag nothing in the app knows about", () => {
    const row = base({ equipment: ["moon_rocks"], equipment_requirements: ["moon_rocks"] });
    expect(auditRow(row, index([row])).failures.join(" ")).toMatch(/vocabulary/i);
  });

  it("refuses a timed movement with no time on it", () => {
    const row = base({ dosage_unit: "seconds", default_duration_seconds: null, default_reps: null });
    expect(auditRow(row, index([row])).failures.join(" ")).toMatch(/dose/i);
  });

  it("refuses a row with no bucket", () => {
    const row = base({ bucket: null, sub_bucket: null });
    expect(auditRow(row, index([row])).failures.join(" ")).toMatch(/bucket/i);
  });

  it("always resolves an intensity class so the ceiling can compare like with like", () => {
    expect(resolveIntensityClass(base({ intensity_class: null, cns_cost: 5 }))).toBeTruthy();
    expect(resolveIntensityClass(base({ intensity_class: null, cns_cost: 1 }))).toBeTruthy();
  });

  it("splits the catalog into rows that may switch on and rows that stay off", () => {
    const good = base({ slug: "good_row" });
    const bad = base({ slug: "bad_row", bucket: null });
    const result = auditCatalog([good, bad]);
    expect(result.passing.map((r) => r.slug)).toEqual(["good_row"]);
    expect(result.failing.map((r) => r.slug)).toEqual(["bad_row"]);
  });
});
