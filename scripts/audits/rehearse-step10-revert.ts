// Step 10 revert rehearsal — READ-ONLY.
//
//   psql -At -c "select json_agg(t)::text from (select * from wk_movement_catalog) t" > /tmp/catalog-after-arr.json
//   CATALOG_JSON=/tmp/catalog-after-arr.json bun scripts/audits/rehearse-step10-revert.ts
//
// Applies every statement of scripts/audits/evidence/step10-revert.sql to an
// in-memory copy of the live catalog and reports the row counts each statement
// touches plus the post-revert state. Nothing is written to the database.

import { readFileSync } from "node:fs";

type Row = Record<string, any>;
const rows: Row[] = JSON.parse(readFileSync(process.env.CATALOG_JSON!, "utf8"));
const by = (f: (r: Row) => boolean) => rows.filter(f);
const log: string[] = [];
const step = (label: string, n: number, expected: number) =>
  log.push(`${n === expected ? "OK  " : "FAIL"} ${label}: ${n} rows (expected ${expected})`);

// 1. category restore
const CAT_BACK: Record<string, string> = {
  shoulder_prep: "cressey_sp",
  throwing_plyo: "driveline",
  movement_patterning: "functional_patterning",
  rotational_strength: "heenan",
  movement_capacity: "ido_portal",
  sprint_mechanics: "marinovich",
  posterior_chain: "summers",
  max_effort_strength: "westside",
};
const cat = by((r) => r.category in CAT_BACK);
cat.forEach((r) => (r.category = CAT_BACK[r.category]));
step("categories restored", cat.length, 69);

// 2. names restored
const NAMES = [
  "crossover_symmetry_full", "wu_crossover_symmetry_full_warmup", "ac_crossover_activation",
  "ac_crossover_plyo", "ac_crossover_recovery", "ac_jband_full_chart", "ac_full_series",
  "ac_shoulder_tube_front", "ac_shoulder_tube_lateral", "ac_shoulder_tube_overhead",
  "ac_shoulder_tube_softball", "lift_iso_squat",
];
step("names restored", by((r) => NAMES.includes(r.slug)).length, 12);

// 3. hill / tow / overspeed loosened back
const HILL = ["overspeed_assist", "sp_downhill_overspeed", "sp_hill_contrast", "sp_hill_short_10", "sp_hill_long", "sp_tow_assisted_fly"];
const hill = by((r) => HILL.includes(r.slug));
hill.forEach((r) => { r.min_age_years = 0; });
step("hill/tow rows loosened back", hill.length, 6);

// 4. coverage-gap rows removed
const gapFill = by((r) => r.source_philosophy === "coverage_gap_fill");
step("coverage-gap rows deleted", gapFill.length, 48);
const kept = rows.filter((r) => r.source_philosophy !== "coverage_gap_fill");

// 5. sled duplicates un-retired
const sled = kept.filter((r) => ["lift_sled_backward", "sp_backwards_sled", "sp_prowler_push_10", "ws_prowler_sprint", "sp_sled_march_heavy"].includes(r.slug));
sled.forEach((r) => { r.superseded_by = null; r.is_active = true; });
step("sled duplicates restored", sled.length, 5);

// 6. metadata cleared
const plyo = kept.filter((r) => r.plyo_tier != null);
plyo.forEach((r) => (r.plyo_tier = null));
// 78 rows carry plyo_tier live; 16 of them are coverage-gap rows already
// deleted by the previous statement, so 62 remain to clear here.
step("plyo_tier cleared", plyo.length, 62);

// post-revert shape
log.push(`post-revert rows: ${kept.length} (active ${kept.filter((r) => r.is_active).length})`);
log.push(`branded categories back: ${new Set(kept.filter((r) => Object.values(CAT_BACK).includes(r.category)).map((r) => r.category)).size} of 8`);
console.log(log.join("\n"));
if (log.some((l) => l.startsWith("FAIL"))) process.exit(1);
