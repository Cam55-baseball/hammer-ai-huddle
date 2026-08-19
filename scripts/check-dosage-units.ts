/**
 * Preflight lint: movement-catalog dose-unit integrity.
 *
 * The rule this enforces is the one that was violated when
 * `lift_couch_stretch_loaded` (a 45-second loaded hold) stored its dose as
 * `default_reps: 45` while declaring `dosage_unit: 'seconds'`. The generator
 * emitted `2×45` on a `compound_lower` row, the dosage-envelope validator saw
 * a 45-rep in-season compound, raised a fatal, and every card on Hammers Today
 * showed "Plan couldn't publish".
 *
 * Fails when any catalog row declares a non-`reps` `dosage_unit` while still
 * carrying a `default_reps` value.
 *
 * Credentials: needs an authenticated read of `wk_movement_catalog`
 * (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`). Without them the script skips
 * — the unit-aware validator in `_shared/wic/validator.ts` still enforces the
 * same rule at generation time.
 */
const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";

const REP_UNITS = new Set(["reps", "rep", ""]);

type Row = {
  slug: string;
  name: string;
  dosage_unit: string | null;
  default_reps: number | null;
};

async function main() {
  if (!url || !key) {
    console.log(
      "[dosage-units] SKIPPED — no catalog credentials in env. " +
        "Runtime enforcement in the WIC validator still applies.",
    );
    return;
  }

  const res = await fetch(
    `${url}/rest/v1/wk_movement_catalog?select=slug,name,dosage_unit,default_reps`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!res.ok) {
    console.log(
      `[dosage-units] SKIPPED — catalog read returned ${res.status}. ` +
        "Runtime enforcement in the WIC validator still applies.",
    );
    return;
  }

  const rows = (await res.json()) as Row[];
  const violations = rows.filter(
    (r) =>
      r.default_reps != null &&
      !REP_UNITS.has(String(r.dosage_unit ?? "reps").toLowerCase().trim()),
  );

  if (violations.length > 0) {
    console.error(
      `\n[dosage-units] FAILED — ${violations.length} row(s) store a non-rep dose in default_reps:\n`,
    );
    for (const v of violations) {
      console.error(`  ✗ ${v.slug} (${v.name}) — unit "${v.dosage_unit}" but default_reps=${v.default_reps}`);
    }
    console.error(
      "\nMove the value into default_duration_seconds / default_distance_feet / " +
        "default_total_reps and null out default_reps. Never widen the dosage " +
        "envelope to make a mis-united row legal.\n",
    );
    process.exit(1);
  }

  console.log(`[dosage-units] PASSED — ${rows.length} movements, 0 unit violations.`);
}

main().catch((err) => {
  console.error("[dosage-units] ERROR", err);
  process.exit(1);
});
