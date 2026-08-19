// Phase 10 — Performance Support Engine regression audit.
//
// Deno script that verifies every performance-support-eligible catalog row
// carries the governance metadata required by the Conditioning, Cross-Sport,
// Recovery, and Arm Care engines. Emits a fail-fast summary for CI.
//
// Usage:
//   deno run -A scripts/audits/performance-support-audit.ts
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL");
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !key) { console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."); Deno.exit(2); }
const admin = createClient(url, key);

const { data, error } = await admin
  .from("wk_movement_catalog")
  .select(
    "slug,name,category,primary_adaptation,conditioning_category,cross_sport_category,recovery_category,arm_care_category,energy_system,recovery_class,throwing_phase,movement_transfer,sport_transfer,travel_friendly,indoor_legal,outdoor_legal,season_legality,training_age_legality",
  );
if (error) { console.error(error); Deno.exit(2); }

let cond = 0, xs = 0, rec = 0, ac = 0, fatal = 0, warn = 0;
for (const row of data ?? []) {
  const cat = String((row as any).category ?? "").toLowerCase();
  if (cat === "conditioning") {
    cond++;
    if (!(row as any).conditioning_category) { console.error(`FATAL ${row.slug}: missing conditioning_category`); fatal++; }
    if (!(row as any).energy_system) { console.warn(`WARN ${row.slug}: missing energy_system`); warn++; }
  }
  if (cat === "cross_sport") {
    xs++;
    if (!(row as any).cross_sport_category) { console.error(`FATAL ${row.slug}: missing cross_sport_category`); fatal++; }
    if (!(row as any).movement_transfer) { console.warn(`WARN ${row.slug}: missing movement_transfer`); warn++; }
  }
  if (cat === "functional_patterning" || cat === "trunk") {
    rec++;
    if (!(row as any).recovery_category) { console.warn(`WARN ${row.slug}: missing recovery_category`); warn++; }
  }
  if (cat === "arm_care") {
    ac++;
    if (!(row as any).arm_care_category) { console.error(`FATAL ${row.slug}: missing arm_care_category`); fatal++; }
    if (!(row as any).throwing_phase) { console.warn(`WARN ${row.slug}: missing throwing_phase`); warn++; }
  }
}

// Adaptation-coverage guard — every day adaptation on which conditioning is
// legal must admit at least one conditioning catalog row. This is the exact
// regression that emptied the Conditioning card for the whole in-season phase.
const CONDITIONING_LEGAL_ADAPTATIONS = [
  "muscle_capacity",
  "max_strength",
  "strength_to_power",
  "power_transfer",
  "in_season_maintenance",
  "game_readiness",
] as const;
const ADAPTATION_COMPAT: Record<string, string[]> = {
  recovery_only: ["in_season_maintenance", "movement_literacy"],
  game_readiness: ["speed_development", "bat_speed_development", "movement_literacy", "in_season_maintenance", "conditioning_repeat_explosive"],
  muscle_capacity: ["max_strength", "muscle_capacity", "in_season_maintenance", "speed_development", "bat_speed_development", "conditioning_repeat_explosive", "movement_literacy"],
  max_strength: ["max_strength", "muscle_capacity", "strength_to_power", "speed_development", "bat_speed_development", "movement_literacy"],
  strength_to_power: ["strength_to_power", "max_strength", "muscle_capacity", "power_transfer", "speed_development", "bat_speed_development", "conditioning_repeat_explosive", "movement_literacy"],
  power_transfer: ["power_transfer", "strength_to_power", "max_strength", "muscle_capacity", "speed_development", "bat_speed_development", "in_season_maintenance", "conditioning_repeat_explosive", "movement_literacy"],
  in_season_maintenance: ["in_season_maintenance", "max_strength", "muscle_capacity", "speed_development", "bat_speed_development", "power_transfer", "conditioning_repeat_explosive", "movement_literacy"],
  movement_literacy: ["movement_literacy", "muscle_capacity", "in_season_maintenance"],
};
const conditioningRows = (data ?? []).filter(
  (r: any) => String(r.category ?? "").toLowerCase() === "conditioning",
);
for (const day of CONDITIONING_LEGAL_ADAPTATIONS) {
  const allowed = ADAPTATION_COMPAT[day] ?? [];
  const admits = conditioningRows.some((r: any) => {
    const mov = r.primary_adaptation;
    return !mov || mov === day || allowed.includes(mov);
  });
  if (!admits) {
    console.error(`FATAL adaptation "${day}": no conditioning movement passes the adaptation gate`);
    fatal++;
  }
}

// Matrix header for reviewer.
const matrix = {
  season_phases: ["offseason_early","offseason_mid","offseason_late","preseason","in_season_early","in_season_mid","in_season_late","postseason","transition","deload","recovery","return_to_play"],
  training_age: ["novice","intermediate","advanced","elite"],
  environments: ["indoor","outdoor"],
  day_types: ["practice","game","tournament","travel","recovery","off"],
  positions: ["position_player","starter","reliever","two_way"],
};

console.log(JSON.stringify({
  audited_conditioning_rows: cond,
  audited_cross_sport_rows: xs,
  audited_recovery_rows: rec,
  audited_arm_care_rows: ac,
  fatal, warn,
  governance_version: "performance_support_v1",
  matrix,
}, null, 2));

Deno.exit(fatal > 0 ? 1 : 0);
