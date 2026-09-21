/**
 * Step 20 Part A — the safety-audit report.
 *
 * Read-only. Runs the same pure audit the nightly job runs, over every
 * inactive, non-superseded catalog row, and prints which rows would activate
 * themselves and which stay off with the exact failing check.
 *
 * Run: bun scripts/audits/auto-activation-report.ts
 */
import { createClient } from "@supabase/supabase-js";
import { auditCatalog, type AuditCatalogRow } from "../../supabase/functions/_shared/wic/catalog/safetyAudit.ts";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("[audit] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(2);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const COLS =
  "id,slug,name,category,cue,bucket,sub_bucket,intensity_class,cns_cost,min_age_years," +
  "min_training_age_years,season_eligibility,equipment_requirements,equipment,regression_slug," +
  "eccentric_overload,deep_flexion,ub_tier,plyo_tier,dosage_unit,default_sets,default_reps," +
  "default_duration_seconds,default_distance_feet,default_total_reps,is_active,superseded_by";

const rows: AuditCatalogRow[] = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await db.from("wk_movement_catalog").select(COLS).range(from, from + 999);
  if (error) throw error;
  rows.push(...((data ?? []) as unknown as AuditCatalogRow[]));
  if (!data || data.length < 1000) break;
}

const { candidates, passing, failing } = auditCatalog(rows);
console.log(`catalog ${rows.length} rows · candidates ${candidates.length} · would activate ${passing.length} · stay off ${failing.length}\n`);

// Step 23 A2 — how much of the live catalog the ceiling check can read.
const cov = intensityClassCoverage(rows);
console.log(
  `intensity class coverage: ${cov.stored + cov.derived}/${cov.active} active rows ` +
    `(${cov.stored} stored, ${cov.derived} derived) · unmapped ${cov.unmapped.length}`,
);
if (cov.unmapped.length) console.log("  unmapped: " + cov.unmapped.join(", "));

// Step 23 A1 — safety laws over rows that are already on.
const drift = auditActiveRows(rows);
console.log(`\nlive rows breaking a safety law: ${drift.length}`);
for (const d of drift) console.log(`  ${d.slug}: ${d.failures.join("; ")}`);

const counts = new Map<string, number>();
for (const f of failing) {
  for (const reason of new Set(f.failures.map((x) => x.replace(/"[^"]*"/g, "…")))) {
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
}
console.log("\nWhy rows stay off:");
for (const [reason, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${reason}`);
}
console.log("\nEvery row staying off:");
for (const f of failing) console.log(`  ${f.slug}: ${f.failures.join("; ")}`);
console.log("\nWould activate:");
for (const p of passing) console.log(`  ${p.slug}`);

