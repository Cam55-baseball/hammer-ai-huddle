/**
 * Step 23 A2 — fill `intensity_class` for every ACTIVE catalog row from the
 * documented mapping in `safetyAudit.ts` (INTENSITY_MAPPING_VERSION).
 *
 * The class is never invented: it is derived from the row's own category and
 * effort cost. A stored class is never overwritten. A row that cannot be
 * mapped is printed and left alone — flagged, not guessed.
 *
 * Run: bun scripts/audits/intensity-class-backfill.ts [--apply]
 */
import { createClient } from "@supabase/supabase-js";
import {
  INTENSITY_MAPPING_VERSION,
  resolveIntensityClass,
} from "../../supabase/functions/_shared/wic/catalog/safetyAudit.ts";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("[backfill] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(2);
}
const apply = process.argv.includes("--apply");
const db = createClient(url, key, { auth: { persistSession: false } });

type Row = {
  id: string;
  slug: string;
  category: string | null;
  cns_cost: number | null;
  intensity_class: string | null;
  is_active: boolean | null;
};

const rows: Row[] = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await db
    .from("wk_movement_catalog")
    .select("id,slug,category,cns_cost,intensity_class,is_active")
    .range(from, from + 999);
  if (error) throw error;
  rows.push(...((data ?? []) as Row[]));
  if (!data || data.length < 1000) break;
}

const active = rows.filter((r) => r.is_active === true);
const missing = active.filter((r) => !String(r.intensity_class ?? "").trim());
const planned: { id: string; slug: string; cls: string; from: string }[] = [];
const unmapped: string[] = [];
for (const r of missing) {
  const cls = resolveIntensityClass(r);
  if (!cls) unmapped.push(r.slug);
  else planned.push({ id: r.id, slug: r.slug, cls, from: `${r.category ?? "no category"} / cns ${r.cns_cost ?? "none"}` });
}

const byClass = new Map<string, number>();
for (const p of planned) byClass.set(p.cls, (byClass.get(p.cls) ?? 0) + 1);

console.log(`mapping ${INTENSITY_MAPPING_VERSION}`);
console.log(`active rows ${active.length} · already classed ${active.length - missing.length} · to fill ${planned.length} · unmappable ${unmapped.length}`);
for (const [c, n] of [...byClass.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  → ${c}`);
}
if (unmapped.length) console.log("unmappable (left flagged, not guessed):\n  " + unmapped.join("\n  "));

if (!apply) {
  console.log("\ndry run — pass --apply to write");
  process.exit(0);
}

let written = 0;
for (let i = 0; i < planned.length; i += 50) {
  const batch = planned.slice(i, i + 50);
  for (const p of batch) {
    const { error } = await db
      .from("wk_movement_catalog")
      .update({ intensity_class: p.cls })
      .eq("id", p.id)
      .is("intensity_class", null);
    if (error) throw error;
    written++;
  }
  console.log(`  written ${written}/${planned.length}`);
}
console.log(`[backfill] done — ${written} rows classed`);
