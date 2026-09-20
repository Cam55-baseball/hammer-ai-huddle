// v1.2 §D4 — bucket audit. Read-only.
//   npx -y tsx scripts/audits/bucket-audit.ts
// Checks: exactly one bucket + sub-bucket per row, no unlabelled rows,
// no duplicate active names, no orphan regression links, no outside names.

import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
if (!url || !key) throw new Error("Missing Supabase env");

const BANNED = /driveline|cressey|westside|heenan|marinovich|ido portal|summers|poliquin|triphasic/i;

const BUCKETS = new Set([
  "Movement Prep & Tissue",
  "Lower-Body Elastic",
  "Upper-Body Elastic",
  "Hand & Wrist Chain",
  "Speed",
  "Sleds",
  "Strength",
  "Arm Care & Throwing Support",
  "Med Ball & Rotational Power",
  "Recovery & Regeneration",
]);

const supabase = createClient(url, key);

const { data, error } = await supabase
  .from("wk_movement_catalog")
  .select("slug,name,is_active,bucket,sub_bucket,method,evidence_grade,regression_slug")
  .limit(5000);
if (error) throw error;
const rows = data ?? [];
if (rows.length === 0) throw new Error('No rows returned — this script needs a key that can read the catalog.');
const slugs = new Set(rows.map((r) => r.slug));

const fail = (label: string, items: string[]) => {
  console.log(`${items.length === 0 ? "PASS" : "FAIL"}  ${label}: ${items.length}`);
  for (const i of items.slice(0, 20)) console.log(`        ${i}`);
  return items.length;
};

let failures = 0;
failures += fail(
  "rows without a bucket or sub-bucket",
  rows.filter((r) => !r.bucket || !r.sub_bucket).map((r) => r.slug),
);
failures += fail(
  "rows with a bucket outside the canonical tree",
  rows.filter((r) => r.bucket && !BUCKETS.has(r.bucket)).map((r) => `${r.slug} → ${r.bucket}`),
);
failures += fail(
  "active rows missing a label",
  rows.filter((r) => r.is_active && (!r.method || !r.evidence_grade)).map((r) => r.slug),
);

const byName = new Map<string, string[]>();
for (const r of rows.filter((x) => x.is_active)) {
  const k = r.name.trim().toLowerCase();
  byName.set(k, [...(byName.get(k) ?? []), r.slug]);
}
failures += fail(
  "duplicate active names",
  [...byName.entries()].filter(([, v]) => v.length > 1).map(([k, v]) => `${k}: ${v.join(", ")}`),
);
failures += fail(
  "orphan regression links",
  rows
    .filter((r) => r.regression_slug && !slugs.has(r.regression_slug))
    .map((r) => `${r.slug} → ${r.regression_slug}`),
);
failures += fail(
  "displayed names containing an outside name",
  rows.filter((r) => BANNED.test(r.name)).map((r) => `${r.slug}: ${r.name}`),
);

const counts = new Map<string, number>();
for (const r of rows) counts.set(r.bucket ?? "(none)", (counts.get(r.bucket ?? "(none)") ?? 0) + 1);
console.log("\nBucket counts");
for (const [b, n] of [...counts.entries()].sort()) console.log(`  ${n.toString().padStart(4)}  ${b}`);
console.log(`\n${failures === 0 ? "ALL CHECKS PASS" : `${failures} problem rows`} — ${rows.length} rows`);
