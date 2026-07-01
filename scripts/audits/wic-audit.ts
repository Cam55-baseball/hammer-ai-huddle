#!/usr/bin/env -S deno run -A
// WIC audit — reports movement catalog metadata gaps and prescriptions
// still written under a legacy generator version.
//
// Usage: deno run -A scripts/audits/wic-audit.ts
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the environment.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL");
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  Deno.exit(1);
}
const db = createClient(url, key);

const REQUIRED_META = [
  "movement_pattern",
  "primary_adaptation",
  "season_eligibility",
  "equipment",
  "joint_stress",
  "recovery_cost",
  "volume_cost",
  "bias",
  "duplicate_group",
  "recovery_window_hours",
] as const;

const { data: catalog, error: catErr } = await db.from("wk_movement_catalog").select("slug,name,movement_pattern,primary_adaptation,season_eligibility,equipment,joint_stress,recovery_cost,volume_cost,bias,duplicate_group,recovery_window_hours");
if (catErr) throw catErr;

let missingCount = 0;
for (const row of catalog ?? []) {
  const gaps = REQUIRED_META.filter((k) => {
    const v = (row as Record<string, unknown>)[k];
    return v === null || v === undefined || (Array.isArray(v) && v.length === 0);
  });
  if (gaps.length) {
    missingCount++;
    console.log(`[metadata gap] ${row.slug}: ${gaps.join(", ")}`);
  }
}
console.log(`\nCatalog: ${(catalog ?? []).length} movements, ${missingCount} with metadata gaps.`);

const { data: legacy, error: legErr } = await db.from("wk_prescriptions").select("plan_date,user_id,generator_version").neq("generator_version", "wic_v1").limit(500);
if (legErr) throw legErr;
console.log(`\nLegacy prescriptions (not wic_v1): ${(legacy ?? []).length}`);
for (const r of (legacy ?? []).slice(0, 20)) {
  console.log(`  ${r.plan_date}  user=${r.user_id}  version=${r.generator_version ?? "null"}`);
}
