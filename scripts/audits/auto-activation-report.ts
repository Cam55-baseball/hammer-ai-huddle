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

const counts = new Map<string, number>();
for (const f of failing) {
  for (const reason of new Set(f.failures.map((x) => x.replace(/"[^"]*"/g, "…")))) {
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
}
console.log("Why rows stay off:");
for (const [reason, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${reason}`);
}
console.log("\nFirst 30 rows staying off:");
for (const f of failing.slice(0, 30)) console.log(`  ${f.slug}: ${f.failures.join("; ")}`);
console.log("\nFirst 30 that would activate:");
for (const p of passing.slice(0, 30)) console.log(`  ${p.slug}`);
