/**
 * Drift guard — fails CI if any OS-only / eccentric-dominant movement was
 * ever prescribed in an in-season phase. Enforces the elite in-season Nordic
 * / Copenhagen / depth-drop / heavy-eccentric block for eternity.
 *
 * Usage (CI):
 *   PGURL=... deno run --allow-net --allow-env scripts/check-no-inseason-eccentric.ts
 * or with tsx locally against a project pg url.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.warn("[drift-guard] SUPABASE_URL / SERVICE_ROLE_KEY missing — skipping");
  process.exit(0);
}
const supabase = createClient(url, key);

const { data: violations, error } = await supabase
  .from("wk_prescriptions")
  .select("user_id, plan_date, movement_slug, phase")
  .in("phase", ["in_season", "pre_season", "post_season"])
  .in(
    "movement_slug",
    [
      "back_squat_double_ecc",
      "front_squat_double_ecc",
      "bench_press_double_ecc",
      "incline_bench_double_ecc",
      "hip_thrust_double_ecc",
      "rdl_double_ecc",
      "trap_bar_dl_double_ecc",
      "weighted_pullup_double_ecc",
      "atg_split_squat",
      // Family siblings — same exercise under different slugs. Only the
      // ROM-limited maintenance slug `kot_atg_split_squat` is in-season legal.
      "lift_atg_split_squat",
      "lift_atg_lunge",
      "sp_atg_split_squat",
      "sissy_squat",
      "slide_lunge",
      "plyo_depth_jump",
      "reverse_nordic",
      "nordic_curl",
      "copenhagen_adduction_ecc",
    ],
  );


if (error) {
  console.error("[drift-guard] query failed", error);
  process.exit(2);
}
if (violations && violations.length > 0) {
  console.error(
    `[drift-guard] ❌ ${violations.length} in-season eccentric violations`,
    violations.slice(0, 10),
  );
  process.exit(1);
}
console.log("[drift-guard] ✅ no in-season eccentric violations");

// ─── Guard 2: deep-ROM knee flexion may never sit in a warm-up / prep slot ───
const ATG_FAMILY_SLUGS = [
  "atg_split_squat",
  "lift_atg_split_squat",
  "kot_atg_split_squat",
  "sp_atg_split_squat",
  "lift_atg_lunge",
  "sissy_squat",
  "lift_kot_sissy_squat",
];

const { data: warmupViolations, error: warmupErr } = await supabase
  .from("wk_prescriptions")
  .select("user_id, plan_date, movement_slug, slot")
  .in("slot", ["warmup", "speed"])
  .in("movement_slug", ATG_FAMILY_SLUGS);

if (warmupErr) {
  console.error("[drift-guard] warmup query failed", warmupErr);
  process.exit(2);
}
if (warmupViolations && warmupViolations.length > 0) {
  console.error(
    `[drift-guard] ❌ ${warmupViolations.length} deep-knee-flexion movements in warm-up / speed slots`,
    warmupViolations.slice(0, 10),
  );
  process.exit(1);
}
console.log("[drift-guard] ✅ no deep-knee-flexion movements in warm-up / speed slots");
