/**
 * Stage 2 / 2b activation — batches of 20 with a full smoke test between each.
 *
 * Activates inactive, non-superseded catalog rows in deterministic slug order,
 * 20 at a time. After every batch it re-runs the smoke suite:
 *   1. 1,296-cell generation matrix (must stay 1,296 / tier `full`)
 *   2. in-season deep-flexion / eccentric-overload drift guard (fatal must stay 0)
 *   3. duplicate-name collision count (must stay 0)
 *
 * Stops at the FIRST batch that moves a fatal off zero or drops a cell below
 * `full`, rolls that batch back to inactive, and reports the batch number.
 *
 * Run: bun scripts/stage2/activate-batches.ts
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("[activate] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const BATCH = 20;

function sh(cmd: string): { ok: boolean; out: string } {
  try {
    return { ok: true, out: execSync(cmd, { encoding: "utf8", stdio: "pipe" }) };
  } catch (e: any) {
    return { ok: false, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

async function collisions(): Promise<number> {
  const { data, error } = await db
    .from("wk_movement_catalog")
    .select("name")
    .eq("is_active", true);
  if (error) throw error;
  const seen = new Map<string, number>();
  for (const r of data!) {
    const n = String(r.name).trim().toLowerCase();
    seen.set(n, (seen.get(n) ?? 0) + 1);
  }
  return [...seen.values()].filter((c) => c > 1).length;
}

async function smoke(label: string) {
  const matrix = sh("bun scripts/audits/evidence/generation-matrix.ts");
  const m = JSON.parse(readFileSync("scripts/audits/evidence/generation-matrix.json", "utf8"));
  const full = m.tiers?.full ?? 0;
  const cells = m.cells ?? 0;
  const guard = sh("bun scripts/check-no-inseason-eccentric.ts");
  const coll = await collisions();
  const ok = matrix.ok && guard.ok && full === 1296 && cells === 1296 && coll === 0;
  console.log(
    `[${label}] matrix ${full}/${cells} full · guard ${guard.ok ? "0 fatal" : "FATAL"} · collisions ${coll} → ${ok ? "PASS" : "FAIL"}`,
  );
  if (!ok) console.log(matrix.out.slice(-1500) + "\n" + guard.out.slice(-1500));
  return ok;
}

const { data: pending, error } = await db
  .from("wk_movement_catalog")
  .select("slug,name")
  .eq("is_active", false)
  .is("superseded_by", null)
  .order("slug");
if (error) throw error;

console.log(`[activate] pending Stage 2 / 2b rows: ${pending!.length}`);
if (!(await smoke("baseline"))) process.exit(1);

for (let i = 0; i < pending!.length; i += BATCH) {
  const batch = pending!.slice(i, i + BATCH);
  const n = i / BATCH + 1;
  const slugs = batch.map((b) => b.slug);
  const { error: upErr } = await db
    .from("wk_movement_catalog")
    .update({ is_active: true })
    .in("slug", slugs);
  if (upErr) throw upErr;
  console.log(`\n[batch ${n}] activated ${slugs.length}: ${slugs.join(", ")}`);
  if (!(await smoke(`batch ${n}`))) {
    await db.from("wk_movement_catalog").update({ is_active: false }).in("slug", slugs);
    console.log(`\n[activate] ❌ STOPPED at batch ${n} — rolled back, catalog left clean.`);
    process.exit(1);
  }
}

const { count } = await db
  .from("wk_movement_catalog")
  .select("*", { count: "exact", head: true })
  .eq("is_active", true);
console.log(`\n[activate] ✅ all batches activated. Active catalog: ${count}`);
