/**
 * wk-dedupe-check — audits the last 30 days of wk_prescriptions and reports:
 *   (a) compound movements repeated within 72h for the same user (no override)
 *   (b) OS-only / eccentric-dominant movements emitted in in/pre/post season
 *       without a matching wk_movement_overrides row
 *
 * Report-only. Non-zero exit on violations so it can gate CI.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/audits/wk-dedupe-check.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.warn("[wk-dedupe-check] SUPABASE_URL / SERVICE_ROLE_KEY missing — skipping");
  process.exit(0);
}
const supabase = createClient(url, key);

const OS_ONLY_SLUGS = [
  "back_squat_double_ecc",
  "front_squat_double_ecc",
  "bench_press_double_ecc",
  "incline_bench_double_ecc",
  "hip_thrust_double_ecc",
  "rdl_double_ecc",
  "trap_bar_dl_double_ecc",
  "weighted_pullup_double_ecc",
  "nordic_curl",
  "reverse_nordic",
  "copenhagen_adduction_ecc",
  "plyo_depth_jump",
];

const since = new Date();
since.setDate(since.getDate() - 30);
const sinceStr = since.toISOString().slice(0, 10);

const { data: rows, error } = await supabase
  .from("wk_prescriptions")
  .select("user_id, plan_date, movement_slug, phase, slot, why_payload")
  .gte("plan_date", sinceStr)
  .order("user_id", { ascending: true })
  .order("plan_date", { ascending: true });
if (error) {
  console.error("[wk-dedupe-check] query failed", error);
  process.exit(2);
}

const { data: overrides } = await supabase
  .from("wk_movement_overrides")
  .select("user_id, movement_slug, ack_date")
  .gte("ack_date", sinceStr);
const overrideKey = (uid: string, slug: string, d: string) => `${uid}::${slug}::${d}`;
const overrideSet = new Set((overrides ?? []).map((o: any) => overrideKey(o.user_id, o.movement_slug, o.ack_date)));

const dupes: string[] = [];
const inseasonEcc: string[] = [];

// Group by user
const byUser = new Map<string, any[]>();
for (const r of rows ?? []) {
  const arr = byUser.get(r.user_id) ?? [];
  arr.push(r);
  byUser.set(r.user_id, arr);
}

for (const [uid, list] of byUser) {
  // (a) 72h compound repeat check — compound slot only
  const lifts = list.filter((r) => r.slot === "lift");
  for (let i = 0; i < lifts.length; i++) {
    for (let j = i + 1; j < lifts.length; j++) {
      if (lifts[i].movement_slug !== lifts[j].movement_slug) continue;
      const d1 = new Date(lifts[i].plan_date + "T00:00:00");
      const d2 = new Date(lifts[j].plan_date + "T00:00:00");
      const hours = (d2.getTime() - d1.getTime()) / 3600000;
      if (hours > 0 && hours < 72) {
        dupes.push(`${uid} — ${lifts[i].movement_slug} repeated ${hours}h apart (${lifts[i].plan_date} → ${lifts[j].plan_date})`);
      }
    }
  }
  // (b) OS-only in-season without override
  for (const r of list) {
    if (!OS_ONLY_SLUGS.includes(r.movement_slug)) continue;
    if (!["in_season", "pre_season", "post_season"].includes(r.phase)) continue;
    if (overrideSet.has(overrideKey(uid, r.movement_slug, r.plan_date))) continue;
    // Also honor override info recorded in why_payload
    if (r.why_payload?.override) continue;
    inseasonEcc.push(`${uid} — ${r.movement_slug} in phase=${r.phase} on ${r.plan_date}`);
  }
}

console.log(`[wk-dedupe-check] scanned ${rows?.length ?? 0} prescriptions over last 30 days`);
console.log(`  duplicate compounds within 72h: ${dupes.length}`);
console.log(`  OS-only in-season violations:   ${inseasonEcc.length}`);
if (dupes.length) {
  console.log("\n-- 72h duplicate compounds --");
  dupes.slice(0, 25).forEach((d) => console.log(`  ${d}`));
  if (dupes.length > 25) console.log(`  … +${dupes.length - 25} more`);
}
if (inseasonEcc.length) {
  console.log("\n-- OS-only in-season violations --");
  inseasonEcc.slice(0, 25).forEach((d) => console.log(`  ${d}`));
  if (inseasonEcc.length > 25) console.log(`  … +${inseasonEcc.length - 25} more`);
}

if (dupes.length || inseasonEcc.length) {
  console.error("[wk-dedupe-check] VIOLATIONS DETECTED — exiting 1");
  process.exit(1);
}
console.log("[wk-dedupe-check] clean ✅");
