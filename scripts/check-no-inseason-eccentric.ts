/**
 * Drift guard — flag-driven (Stage 1, BUG-5).
 *
 * Previously this script matched the strings "ATG", "Nordic", "Copenhagen" and
 * "depth drop" against a hardcoded slug list. Every new movement had to be
 * remembered by hand, and a rename silently disarmed the guard. It now reads
 * the catalog's `deep_flexion` / `eccentric_overload` columns, so a movement is
 * governed the moment it is labelled.
 *
 * Guard 1 — no deep-flexion or eccentric-overload movement may ever be
 *           prescribed in an in-season / pre-season / post-season phase, unless
 *           the catalog row explicitly marks that phase legal (the ROM-limited
 *           maintenance slug).
 * Guard 2 — no deep-flexion movement may sit in a warm-up or speed slot.
 *
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/check-no-inseason-eccentric.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * Known, owner-approved exceptions. These rows are LEFT IN THE DATABASE on
 * purpose — they are history, and they are the proof that this guard fires.
 * They are excused here by explicit identifier, never by deletion and never by
 * a catalog edit.
 */
type KnownException = {
  user_id: string;
  plan_date: string;
  movement_slug: string;
  reason: string;
  guards: string[];
};
const exceptionsPath = join(dirname(fileURLToPath(import.meta.url)), "known-exceptions.json");
const knownExceptions: KnownException[] = (() => {
  try {
    return JSON.parse(readFileSync(exceptionsPath, "utf8")).inseason_eccentric ?? [];
  } catch {
    return [];
  }
})();
const exceptionKey = (r: { user_id: string; plan_date: string; movement_slug: string }, guard: string) =>
  `${r.user_id}|${r.plan_date}|${r.movement_slug}|${guard}`;
const exceptionKeys = new Set(
  knownExceptions.flatMap((e) => e.guards.map((g) => exceptionKey(e, g))),
);
const isExcused = (r: { user_id: string; plan_date: string; movement_slug: string }, guard: string) =>
  exceptionKeys.has(exceptionKey(r, guard));

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.warn("[drift-guard] SUPABASE_URL / SERVICE_ROLE_KEY missing — skipping");
  process.exit(0);
}
const supabase = createClient(url, key);

const IN_SEASON_PHASES = ["in_season", "pre_season", "post_season"] as const;

const { data: flagged, error: catErr } = await supabase
  .from("wk_movement_catalog")
  .select("slug, name, deep_flexion, eccentric_overload, season_legality")
  .or("deep_flexion.eq.true,eccentric_overload.eq.true");

if (catErr) {
  console.error("[drift-guard] catalog query failed", catErr);
  process.exit(2);
}

const rows = flagged ?? [];
const deepFlexion = rows.filter((r) => r.deep_flexion).map((r) => r.slug);
// A flagged movement is barred in-season, period. `season_legality` does NOT
// grant an exemption — a catalog edit must never be able to disarm the guard.
// The single documented exception is the ROM-limited maintenance slug.
const IN_SEASON_ALLOWLIST = new Set(["kot_atg_split_squat"]);
const restricted = rows.filter((r) => !IN_SEASON_ALLOWLIST.has(r.slug)).map((r) => r.slug);

console.log(
  `[drift-guard] catalog: ${rows.length} flagged movements ` +
    `(${deepFlexion.length} deep_flexion, ${rows.filter((r) => r.eccentric_overload).length} eccentric_overload)`,
);

let failed = false;

// ─── Guard 1: no flagged movement inside a competitive phase ────────────────
for (const phase of IN_SEASON_PHASES) {
  const slugs = restricted;
  if (slugs.length === 0) continue;
  const { data: violations, error } = await supabase
    .from("wk_prescriptions")
    .select("user_id, plan_date, movement_slug, phase")
    .eq("phase", phase)
    .in("movement_slug", slugs);
  if (error) {
    console.error("[drift-guard] query failed", error);
    process.exit(2);
  }
  const excused1 = (violations ?? []).filter((v) => isExcused(v, "in_season_phase"));
  const real1 = (violations ?? []).filter((v) => !isExcused(v, "in_season_phase"));
  if (excused1.length > 0) {
    console.log(
      `[drift-guard] \u2139 ${excused1.length} ${phase} row(s) excused by scripts/known-exceptions.json`,
      excused1.map((v) => v.movement_slug + " @ " + v.plan_date),
    );
  }
  const violationsOut = real1;
  if (violationsOut.length > 0) {
    failed = true;
    console.error(
      `[drift-guard] ❌ ${violationsOut.length} ${phase} deep-flexion / eccentric-overload violations`,
      violationsOut.slice(0, 10),
    );
  }
}
if (!failed) console.log("[drift-guard] ✅ no in-season deep-flexion / eccentric-overload violations");

// ─── Guard 2: deep flexion may never sit in a warm-up / prep slot ───────────
if (deepFlexion.length > 0) {
  const { data: warmupViolations, error: warmupErr } = await supabase
    .from("wk_prescriptions")
    .select("user_id, plan_date, movement_slug, slot")
    .in("slot", ["warmup", "movement_prep", "speed"])
    .in("movement_slug", deepFlexion);
  if (warmupErr) {
    console.error("[drift-guard] warmup query failed", warmupErr);
    process.exit(2);
  }
  const excused2 = (warmupViolations ?? []).filter((v) => isExcused(v, "warmup_speed_slot"));
  const real2 = (warmupViolations ?? []).filter((v) => !isExcused(v, "warmup_speed_slot"));
  if (excused2.length > 0) {
    console.log(
      `[drift-guard] \u2139 ${excused2.length} warm-up/speed row(s) excused by scripts/known-exceptions.json`,
      excused2.map((v) => v.movement_slug + " @ " + v.plan_date),
    );
  }
  if (real2.length > 0) {
    failed = true;
    console.error(
      `[drift-guard] ❌ ${real2.length} deep-flexion movements in warm-up / speed slots`,
      real2.slice(0, 10),
    );
  } else {
    console.log("[drift-guard] ✅ no deep-flexion movements in warm-up / speed slots");
  }
}

process.exit(failed ? 1 : 0);
