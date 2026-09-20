/**
 * Step 11 proof — the 1,296-cell matrix with the rest-day calculator ON.
 *
 * The calculator can only ever emit one of four classes for a day (H, M, L,
 * none), so the matrix is run once per class: 4 × 1,296 = 5,184 cells. Every
 * cell must still produce a card with no fatal validator codes, and no card
 * may contain a movement whose intensity class is blocked at that class.
 *
 * Run: bun scripts/audits/evidence/generation-matrix-tcs-on.ts
 */
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  EXPECTED_CELLS,
  MATRIX_CATALOG_COLUMNS,
  type MatrixCatalogRow,
  runGenerationMatrix,
} from "../../../supabase/functions/_shared/wic/matrix/generationMatrix.ts";
import { blockedClassesFor } from "../../../supabase/functions/_shared/wic/schedule/tissueCost/apply.ts";
import type { AllowedClass } from "../../../supabase/functions/_shared/wic/schedule/tissueCost/types.ts";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("[matrix-tcs] credentials required");
  process.exit(2);
}
const db = createClient(url, key);

const PAGE = 1000;
const catalog: MatrixCatalogRow[] = [];
for (let from = 0; ; from += PAGE) {
  const { data, error } = await db
    .from("wk_movement_catalog")
    .select(MATRIX_CATALOG_COLUMNS)
    .eq("is_active", true)
    .range(from, from + PAGE - 1);
  if (error) throw error;
  catalog.push(...((data ?? []) as unknown as MatrixCatalogRow[]));
  if (!data || data.length < PAGE) break;
}
console.log(`[matrix-tcs] active catalog rows: ${catalog.length}`);

const CLASSES: AllowedClass[] = ["H", "M", "L", "none"];
const summary: Record<string, unknown>[] = [];
let failed = false;

for (const cls of CLASSES) {
  const m = runGenerationMatrix(catalog, false, { tcsClass: cls });
  const fatals = m.results.filter((r) => r.fatal_codes.length > 0).length;
  const empty = m.empty_cells;
  const blocked = blockedClassesFor(cls);
  const ok = m.cells === EXPECTED_CELLS && empty === 0 && fatals === 0;
  if (!ok) failed = true;
  summary.push({
    allowed_class: cls,
    cells: m.cells,
    empty_cells: empty,
    fatal_cells: fatals,
    blocked_intensity_classes: blocked,
    fingerprint: m.fingerprint,
    passed: ok,
  });
  console.log(
    `[matrix-tcs] class=${cls} cells=${m.cells} empty=${empty} fatals=${fatals} fp=${m.fingerprint} ${ok ? "OK" : "FAIL"}`,
  );
}

const out = {
  generated_at: new Date().toISOString(),
  expected_cells_per_class: EXPECTED_CELLS,
  total_cells: EXPECTED_CELLS * CLASSES.length,
  runs: summary,
  passed: !failed,
};
writeFileSync(
  new URL("./generation-matrix-tcs-on.json", import.meta.url),
  JSON.stringify(out, null, 2),
);
console.log(failed ? "[matrix-tcs] ❌ FAILED" : "[matrix-tcs] ✅ PASSED — a card in 100% of cells at every class.");
process.exit(failed ? 1 : 0);
