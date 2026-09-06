/**
 * Fault-family coverage guard.
 *
 * A family whose ladder cannot be reached is a family that quietly stops
 * existing for the athlete who needs it. This guard fails when:
 *   1. a ladder slug is missing, retired, or superseded in the catalog;
 *   2. a family has no tier-0 rung — nothing at all, no gear;
 *   3. a tier-0 rung is not legal in every season phase, or is age-gated
 *      above 14;
 *   4. a family has fewer than three usable rungs (one break and it's gone).
 *
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/check-family-coverage.ts
 */
import { createClient } from "@supabase/supabase-js";
import { FAULT_FAMILIES } from "../src/lib/wic/faultLedger/families";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(2);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const allSlugs = Array.from(new Set(FAULT_FAMILIES.flatMap((f) => f.ladder.map((r) => r.slug))));

const { data, error } = await supabase
  .from("wk_movement_catalog")
  .select("slug,name,is_active,superseded_by,min_age_years,season_legality")
  .in("slug", allSlugs);

if (error) {
  console.error("Catalog read failed:", error.message);
  process.exit(2);
}

type Row = {
  slug: string;
  name: string;
  is_active: boolean;
  superseded_by: string | null;
  min_age_years: number | null;
  season_legality: Record<string, boolean> | null;
};
const bySlug = new Map((data as Row[]).map((r) => [r.slug, r]));

const failures: string[] = [];
const lines: string[] = [];

for (const family of FAULT_FAMILIES) {
  const usable: string[] = [];
  for (const rung of family.ladder) {
    const row = bySlug.get(rung.slug);
    if (!row) {
      failures.push(`${family.id}: "${rung.slug}" is not in the catalog`);
      continue;
    }
    if (!row.is_active) {
      failures.push(`${family.id}: "${rung.slug}" is retired`);
      continue;
    }
    if (row.superseded_by) {
      failures.push(`${family.id}: "${rung.slug}" is superseded by "${row.superseded_by}"`);
      continue;
    }
    if (rung.tier === 0) {
      const legality = row.season_legality ?? {};
      const illegal = Object.entries(legality)
        .filter(([, v]) => v === false)
        .map(([k]) => k);
      if (illegal.length > 0) {
        failures.push(`${family.id}: tier-0 "${rung.slug}" is not legal in ${illegal.join(", ")}`);
      }
      if ((row.min_age_years ?? 0) > 14) {
        failures.push(`${family.id}: tier-0 "${rung.slug}" is gated to ${row.min_age_years}+`);
      }
    }
    usable.push(rung.slug);
  }

  const tier0 = family.ladder.filter((r) => r.tier === 0 && usable.includes(r.slug));
  if (tier0.length === 0) failures.push(`${family.id}: no usable tier-0 rung (nothing-at-all option)`);
  if (usable.length < 3) failures.push(`${family.id}: only ${usable.length} usable rungs (need 3+)`);

  lines.push(
    `${family.id.padEnd(22)} rungs ${String(usable.length).padStart(2)}/${family.ladder.length}  tier0 ${tier0.length}`,
  );
}

console.log("Fault family coverage\n---------------------");
console.log(lines.join("\n"));

if (failures.length > 0) {
  console.error(`\n${failures.length} coverage failure(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`\nAll ${FAULT_FAMILIES.length} families reachable with no equipment.`);
