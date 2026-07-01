// Phase 9 — Explosive Performance Engine regression audit.
//
// Deno script that walks the wk_movement_catalog and confirms that every
// speed / bat-speed row carries the governance metadata required by the
// Explosive Performance Engine. Emits a fail-fast summary suitable for CI.
//
// Usage:
//   deno run -A scripts/audits/explosive-governance-audit.ts
//
// Env:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL");
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  Deno.exit(2);
}
const admin = createClient(url, key);

const { data, error } = await admin
  .from("wk_movement_catalog")
  .select(
    "slug,name,slot,speed_category,bat_speed_category,pap_classification,movement_velocity,substitution_family,transfer_group,season_legality,training_age_legality,game_day_legal,practice_day_legal",
  );
if (error) {
  console.error(error);
  Deno.exit(2);
}

let speedRows = 0, batRows = 0, fatal = 0, warn = 0;
for (const row of data ?? []) {
  const slot = String((row as any).slot ?? "").toLowerCase();
  if (slot === "speed") {
    speedRows++;
    if (!(row as any).speed_category) { console.error(`FATAL ${row.slug}: missing speed_category`); fatal++; }
    if (!(row as any).pap_classification) { console.warn(`WARN ${row.slug}: missing pap_classification`); warn++; }
    if (!(row as any).movement_velocity) { console.warn(`WARN ${row.slug}: missing movement_velocity`); warn++; }
  }
  if (slot === "bat_speed") {
    batRows++;
    if (!(row as any).bat_speed_category) { console.error(`FATAL ${row.slug}: missing bat_speed_category`); fatal++; }
    if (!(row as any).pap_classification) { console.warn(`WARN ${row.slug}: missing pap_classification`); warn++; }
  }
}

console.log(JSON.stringify({
  audited_speed_rows: speedRows,
  audited_bat_speed_rows: batRows,
  fatal, warn,
  governance_version: "explosive_v1",
}, null, 2));

Deno.exit(fatal > 0 ? 1 : 0);
