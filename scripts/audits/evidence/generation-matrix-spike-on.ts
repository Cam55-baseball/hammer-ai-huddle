/**
 * Step 14 proof — the 1,296-cell matrix with load-spike protection ON.
 *
 * Three runs: a real spike (recent max = 60% of today's plan), a mild one
 * (90%), and a cold start (nothing logged in 28 days). Every cell must still
 * produce a card with no fatal validator codes, and every trim must carry a
 * plain reason sentence.
 *
 * Run: bun scripts/audits/evidence/generation-matrix-spike-on.ts
 */
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  EXPECTED_CELLS,
  MATRIX_CATALOG_COLUMNS,
  type MatrixCatalogRow,
  runGenerationMatrix,
} from "../../../supabase/functions/_shared/wic/matrix/generationMatrix.ts";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("[matrix-spike] credentials required");
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
console.log(`[matrix-spike] active catalog rows: ${catalog.length}`);

const SCENARIOS: Array<{ id: string; rm28Fraction: number | null }> = [
  { id: "spike_60pct", rm28Fraction: 0.6 },
  { id: "spike_90pct", rm28Fraction: 0.9 },
  { id: "cold_start", rm28Fraction: null },
];

const summary: Record<string, unknown>[] = [];
let failed = false;

for (const s of SCENARIOS) {
  const m = runGenerationMatrix(catalog, false, { spike: { rm28Fraction: s.rm28Fraction } });
  const fatals = m.results.filter((r) => r.fatal_codes.length > 0).length;
  const trims = m.results.flatMap((r) => r.spike_trims ?? []);
  const withoutReason = trims.filter((t) => !t.reason || t.reason.trim().length === 0).length;
  const byAction = trims.reduce<Record<string, number>>(
    (a, t) => ((a[t.action] = (a[t.action] ?? 0) + 1), a),
    {},
  );
  const byChannel = trims.reduce<Record<string, number>>(
    (a, t) => ((a[t.channel] = (a[t.channel] ?? 0) + 1), a),
    {},
  );
  const ok = m.cells === EXPECTED_CELLS && m.empty_cells === 0 && fatals === 0 && withoutReason === 0;
  if (!ok) failed = true;
  summary.push({
    scenario: s.id,
    cells: m.cells,
    empty_cells: m.empty_cells,
    fatal_cells: fatals,
    cells_trimmed: m.results.filter((r) => (r.spike_trims ?? []).length > 0).length,
    trims_total: trims.length,
    trims_by_action: byAction,
    trims_by_channel: byChannel,
    trims_without_reason: withoutReason,
    example_reasons: [...new Set(trims.map((t) => t.reason))].slice(0, 6),
    passed: ok,
  });
  console.log(
    `[matrix-spike] ${s.id} cells=${m.cells} empty=${m.empty_cells} fatals=${fatals} trims=${trims.length} ${
      ok ? "OK" : "FAIL"
    }`,
  );
}

const out = {
  generated_at: new Date().toISOString(),
  expected_cells_per_run: EXPECTED_CELLS,
  runs: summary,
  passed: !failed,
};
writeFileSync(new URL("./generation-matrix-spike-on.json", import.meta.url), JSON.stringify(out, null, 2));
console.log(
  failed
    ? "[matrix-spike] ❌ FAILED"
    : "[matrix-spike] ✅ PASSED — a card in 100% of cells, 0 fatals, every trim explained.",
);
