/**
 * wk-dedupe-check — audits the last 30 days of wk_prescriptions and reports:
 *   (a) exact movement/name duplicates inside a single workout
 *   (b) compound movements repeated within 72h for the same user (no override)
 *   (c) OS-only / eccentric-dominant movements emitted in in/pre/post season
 *       without a matching wk_movement_overrides row
 *   (d) non-game-day lifts missing the required full-body roles
 *   (e) cross-sport work placed on the back end outside the offseason
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
  .select("user_id, plan_date, movement_slug, movement_name, phase, slot, sets, reps, sequence_order, sequence_role, why_payload")
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
const sameDayDupes: string[] = [];
const inseasonEcc: string[] = [];
const missingFullBody: string[] = [];
const misplacedCrossSport: string[] = [];

const REQUIRED_FULL_BODY_ROLES = [
  "arm_care",
  "trunk_primer",
  "compound_lower",
  "unilateral_lower",
  "upper_push",
  "upper_pull",
];

function normalizeName(name: string | null | undefined): string {
  return String(name ?? "")
    .toLowerCase()
    .replace(/[—–-].*$/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isOffseason(phase: string | null | undefined): boolean {
  return String(phase ?? "").startsWith("os_");
}

// Group by user
const byUser = new Map<string, any[]>();
for (const r of rows ?? []) {
  const arr = byUser.get(r.user_id) ?? [];
  arr.push(r);
  byUser.set(r.user_id, arr);
}

for (const [uid, list] of byUser) {
  const byDay = new Map<string, any[]>();
  for (const r of list) {
    const dayRows = byDay.get(r.plan_date) ?? [];
    dayRows.push(r);
    byDay.set(r.plan_date, dayRows);
  }

  for (const [day, dayRows] of byDay) {
    const seenExact = new Map<string, any>();
    for (const r of dayRows) {
      const exactKey = `${r.movement_slug}::${normalizeName(r.movement_name)}::${r.sets ?? ""}x${r.reps ?? ""}`;
      const prior = seenExact.get(exactKey);
      if (prior) {
        sameDayDupes.push(`${uid} — ${day}: duplicate ${r.movement_name ?? r.movement_slug} (${r.sets ?? "?"}x${r.reps ?? "?"})`);
      } else {
        seenExact.set(exactKey, r);
      }
    }

    const gameDay = dayRows.some((r) => r.why_payload?.game_day === true);
    const liftRows = dayRows.filter((r) => r.slot === "lift");
    if (!gameDay && liftRows.length > 0) {
      const roles = new Set(liftRows.map((r) => r.sequence_role).filter(Boolean));
      const missing = REQUIRED_FULL_BODY_ROLES.filter((role) => !roles.has(role));
      if (missing.length) {
        missingFullBody.push(`${uid} — ${day}: missing ${missing.join(", ")}`);
      }
    }

    for (const r of dayRows.filter((row) => row.slot === "cross_sport")) {
      const placement = r.why_payload?.placement ?? null;
      if (!isOffseason(r.phase) && placement !== "early_activation") {
        misplacedCrossSport.push(`${uid} — ${day}: ${r.movement_slug} phase=${r.phase} placement=${placement ?? "missing"}`);
      }
      if (placement === "early_activation" && Number(r.sequence_order ?? 999) > 1) {
        misplacedCrossSport.push(`${uid} — ${day}: early activation sequence_order=${r.sequence_order}, expected at the front`);
      }
    }
  }

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
console.log(`  duplicate movements same workout: ${sameDayDupes.length}`);
console.log(`  duplicate compounds within 72h:   ${dupes.length}`);
console.log(`  OS-only in-season violations:     ${inseasonEcc.length}`);
console.log(`  missing full-body roles:          ${missingFullBody.length}`);
console.log(`  misplaced cross-sport:            ${misplacedCrossSport.length}`);
if (sameDayDupes.length) {
  console.log("\n-- Same-day duplicate movements --");
  sameDayDupes.slice(0, 25).forEach((d) => console.log(`  ${d}`));
  if (sameDayDupes.length > 25) console.log(`  … +${sameDayDupes.length - 25} more`);
}
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
if (missingFullBody.length) {
  console.log("\n-- Missing full-body roles --");
  missingFullBody.slice(0, 25).forEach((d) => console.log(`  ${d}`));
  if (missingFullBody.length > 25) console.log(`  … +${missingFullBody.length - 25} more`);
}
if (misplacedCrossSport.length) {
  console.log("\n-- Misplaced cross-sport work --");
  misplacedCrossSport.slice(0, 25).forEach((d) => console.log(`  ${d}`));
  if (misplacedCrossSport.length > 25) console.log(`  … +${misplacedCrossSport.length - 25} more`);
}

if (sameDayDupes.length || dupes.length || inseasonEcc.length || missingFullBody.length || misplacedCrossSport.length) {
  console.error("[wk-dedupe-check] VIOLATIONS DETECTED — exiting 1");
  process.exit(1);
}
console.log("[wk-dedupe-check] clean ✅");
