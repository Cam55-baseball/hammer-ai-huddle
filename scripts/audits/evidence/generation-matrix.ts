/**
 * Stage 1 acceptance evidence #1 — Generation matrix.
 *
 * 6 phases × 6 training-age bands × 3 equipment levels × 3 ages × 4 day types
 * = 1,296 runs. A card must be produced in 100% of cells.
 *
 * The matrix itself lives in
 * supabase/functions/_shared/wic/matrix/generationMatrix.ts so that the edge
 * function guarding a catalog-approval batch runs exactly the same code.
 * This script is the sandbox wrapper: it reads the REAL active catalog
 * (service role, read-only), runs the matrix, writes the evidence file and
 * records the result in wk_card_matrix_runs. It writes no plan for any user.
 *
 * Run: bun scripts/audits/evidence/generation-matrix.ts
 * Evidence: scripts/audits/evidence/generation-matrix.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import {
  EXPECTED_CELLS,
  MATRIX_CATALOG_COLUMNS,
  type MatrixCatalogRow,
  runGenerationMatrix,
} from "../../../supabase/functions/_shared/wic/matrix/generationMatrix.ts";

/** Matrix honours the live flag; override with LIFTING_V2=1/0 for A/B runs. */
const LIFTING_V2 = process.env.LIFTING_V2 === "1";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("[matrix] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(2);
}
const db = createClient(url, key);

const PAGE = 1000;
async function loadCatalog(): Promise<MatrixCatalogRow[]> {
  const out: MatrixCatalogRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("wk_movement_catalog")
      .select(MATRIX_CATALOG_COLUMNS)
      .eq("is_active", true)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...((data ?? []) as unknown as MatrixCatalogRow[]));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

const catalog = await loadCatalog();
console.log(`[matrix] active catalog rows: ${catalog.length}`);

const m = runGenerationMatrix(catalog, LIFTING_V2);

/**
 * Step 21C — skill cards must not suffer.
 *
 * The same catalog is run with the rest-day calculator OFF and then ON at each
 * allowed class. Every non-lift row (warm-up, speed, skill work, arm care,
 * conditioning, recovery) must be byte-identical across all four runs: the
 * day's strength ceiling may lower the lift and nothing else.
 */
const NON_LIFT = (r: { slot?: string | null }) => String(r.slot ?? "") !== "lift";
const nonLiftShape = (res: ReturnType<typeof runGenerationMatrix>) =>
  JSON.stringify(
    res.results.map((c) => ({
      key: [c.phase, c.age, c.taYears, c.available, c.isGameDay, c.dayType].join("|"),
      rows: (c.rxs ?? []).filter(NON_LIFT).map((r) => [r.slot, r.sequence_role, r.movement_slug, r.sets, r.reps]),
    })),
  );

const baseShape = nonLiftShape(m);
const parity: Array<{ tcs_class: string; identical: boolean; differing_cells: number }> = [];
for (const tcsClass of ["H", "M", "L", "none"] as const) {
  const run = runGenerationMatrix(catalog, LIFTING_V2, { tcsClass });
  const shape = nonLiftShape(run);
  let differing = 0;
  if (shape !== baseShape) {
    const a = JSON.parse(baseShape) as Array<{ key: string; rows: unknown }>;
    const b = JSON.parse(shape) as Array<{ key: string; rows: unknown }>;
    for (let i = 0; i < a.length; i++) {
      if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) differing++;
    }
  }
  parity.push({ tcs_class: tcsClass, identical: shape === baseShape, differing_cells: differing });
  console.log(
    `[matrix] skill-card parity, calculator=${tcsClass}: ${shape === baseShape ? "identical" : `${differing} cells differ`}`,
  );
}
const parityPassed = parity.every((p) => p.identical);

const outPath = join(dirname(fileURLToPath(import.meta.url)), "generation-matrix.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(
  outPath,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      cells: m.cells,
      empty_cells: m.empty_cells,
      fingerprint: m.fingerprint,
      tiers: m.tiers,
      skill_card_parity: parity,
      results: m.results,
    },
    null,
    2,
  ),
);

const gitSha = (await new Response(Bun.spawn(["git", "rev-parse", "--short", "HEAD"]).stdout).text()).trim() || null;
const { data: row, error: recErr } = await db
  .from("wk_card_matrix_runs")
  .insert({
    source: process.env.MATRIX_SOURCE ?? "sandbox_script",
    cells: m.cells,
    empty_cells: m.empty_cells,
    active_rows: catalog.length,
    fingerprint: m.fingerprint,
    status: m.passed ? "passed" : "failed",
    git_sha: gitSha,
    notes: { tiers: m.tiers, lifting_v2: LIFTING_V2, skill_card_parity: parity },
  })
  .select("id")
  .single();
if (recErr) console.error("[matrix] could not record the run:", recErr.message);
else console.log(`[matrix] recorded run ${row.id}`);

console.log(`[matrix] cells: ${m.cells} (expected ${EXPECTED_CELLS})`);
console.log(`[matrix] tiers:`, m.tiers);
console.log(`[matrix] cells with no card: ${m.empty_cells}`);
console.log(`[matrix] fingerprint: ${m.fingerprint}`);
console.log(`[matrix] evidence → ${outPath}`);
if (!parityPassed) {
  console.error("[matrix] ❌ FAILED — the rest-day calculator changed a non-lift card.");
  process.exit(1);
}
if (!m.passed) {
  console.error("[matrix] ❌ FAILED — a cell produced no card, or the axis count is wrong.");
  process.exit(1);
}
console.log("[matrix] ✅ PASSED — a card in 100% of cells.");
