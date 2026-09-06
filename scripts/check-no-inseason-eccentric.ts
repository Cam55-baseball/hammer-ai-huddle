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
  if (violations && violations.length > 0) {
    failed = true;
    console.error(
      `[drift-guard] ❌ ${violations.length} ${phase} deep-flexion / eccentric-overload violations`,
      violations.slice(0, 10),
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
  if (warmupViolations && warmupViolations.length > 0) {
    failed = true;
    console.error(
      `[drift-guard] ❌ ${warmupViolations.length} deep-flexion movements in warm-up / speed slots`,
      warmupViolations.slice(0, 10),
    );
  } else {
    console.log("[drift-guard] ✅ no deep-flexion movements in warm-up / speed slots");
  }
}

process.exit(failed ? 1 : 0);
