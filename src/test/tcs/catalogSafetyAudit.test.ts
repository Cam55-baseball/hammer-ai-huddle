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
    equipment: ["dumbbell"],
    equipment_requirements: ["dumbbell"],
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

describe("Step 23 A — the gaps the audit missed", () => {
  it("U3 upper-body rows are 16+ and advanced only, even when already active", () => {
    const row = base({ slug: "u3_row", ub_tier: "U3", min_age_years: 12, min_training_age_years: 2, is_active: true });
    const [v] = auditActiveRows([row]);
    expect(v?.slug).toBe("u3_row");
    expect(v.failures.join(" ")).toMatch(/U3 row is live with a minimum age of 12/);
  });

  it("U3 rows also need two years of training age", () => {
    const row = base({ slug: "u3_green", ub_tier: "U3", min_age_years: 16, min_training_age_years: 0, is_active: true });
    expect(auditActiveRows([row])[0].failures.join(" ")).toMatch(/training-age/i);
  });

  it("a numeric tier-3 jump lands on the same 16+ floor as a text tier", () => {
    expect(normalizeTier({ ub_tier: null, plyo_tier: 3 })).toBe("T3");
    const row = base({ slug: "t3_num", ub_tier: null, plyo_tier: 3, min_age_years: 14, is_active: true });
    expect(auditActiveRows([row])[0].failures.join(" ")).toMatch(/T3 row is live/);
  });

  it("a legal live row raises nothing", () => {
    const row = base({ slug: "fine", ub_tier: "U3", min_age_years: 16, min_training_age_years: 2, is_active: true });
    expect(auditActiveRows([row])).toEqual([]);
  });

  it("the documented mapping classes every shape of row in the live catalog", () => {
    const cases: Array<[Partial<AuditCatalogRow>, string]> = [
      [{ category: "warmup", cns_cost: 0 }, "supplemental"],
      [{ category: "hand_wrist_chain", cns_cost: 1 }, "supplemental"],
      [{ category: "arm_care", cns_cost: 0 }, "arm_care"],
      [{ category: "upper_body_plyo", cns_cost: 5 }, "elastic"],
      [{ category: "speed_lab", cns_cost: 8 }, "elastic"],
      [{ category: "cross_sport", cns_cost: 0 }, "low"],
      [{ category: "conditioning", cns_cost: 5 }, "moderate"],
      [{ category: "pap_bridge", cns_cost: 3 }, "maximal"],
      [{ category: "strength", cns_cost: 7 }, "maximal"],
      [{ category: "strength", cns_cost: 2 }, "low"],
      [{ category: "strength", cns_cost: 4 }, "high"],
    ];
    for (const [over, expected] of cases) {
      expect(resolveIntensityClass({ ...over, intensity_class: null })).toBe(expected);
    }
  });

  it("a stored class always wins and nothing is guessed without inputs", () => {
    expect(resolveIntensityClass({ intensity_class: "high", category: "warmup", cns_cost: 1 })).toBe("high");
    expect(resolveIntensityClass({ intensity_class: null, category: null, cns_cost: null })).toBeNull();
  });

  it("reports coverage over the live catalog only", () => {
    const cov = intensityClassCoverage([
      base({ slug: "a", is_active: true, intensity_class: "high" }),
      base({ slug: "b", is_active: true, intensity_class: null, category: "warmup", cns_cost: 1 }),
      base({ slug: "c", is_active: true, intensity_class: null, category: null, cns_cost: null }),
      base({ slug: "d", is_active: false, intensity_class: null, category: null, cns_cost: null }),
    ]);
    expect(cov).toEqual({ active: 3, stored: 1, derived: 1, unmapped: ["c"] });
  });
});

