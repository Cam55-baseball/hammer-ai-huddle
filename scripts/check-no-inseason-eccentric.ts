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
      "sissy_squat",
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
