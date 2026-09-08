/**
 * Benchmark provenance guard.
 *
 * A grading scale rots silently when nothing records where a number came from
 * or when it was written — that is how a 90 mph "average fastball" survived
 * for years. This guard fails when a benchmark has no source, and warns when
 * a sourced benchmark is undated or older than three years.
 *
 * Estimates are NOT failures — they are honest, and surfaced to the athlete.
 * They are counted separately so the gap stays visible.
 *
 * `convention` is its OWN category, never folded into "sourced". A convention
 * is a deliberate choice we made (the sub-floor tail slope, for example) — it
 * has a date and a rationale but no citation, and must never later be
 * mistaken for a measured figure. That mistake is how a 90 mph "average
 * fastball" survived for years.
 */

import { GRADE_BENCHMARKS } from "../src/data/gradeBenchmarks";
import { SUB_FLOOR_TAIL_PROVENANCE } from "../src/lib/benchmarks/gradeScale";

const STALE_YEARS = 3;
const now = new Date();

const missing: string[] = [];
const estimates: string[] = [];
const conventions: string[] = [];
const undated: string[] = [];
const stale: string[] = [];
const ok: string[] = [];

for (const [metric, entry] of Object.entries(GRADE_BENCHMARKS)) {
  const source = (entry as { source?: string }).source?.trim();
  const asOf = (entry as { as_of?: string | null }).as_of ?? null;

  if (!source) {
    missing.push(metric);
    continue;
  }
  if (source === "estimate") {
    estimates.push(metric);
    continue;
  }
  if (source === "convention") {
    conventions.push(`${metric}${asOf ? ` (${asOf})` : " — UNDATED"}`);
    continue;
  }
  if (!asOf) {
    undated.push(metric);
    continue;
  }
  const ageYears =
    (now.getTime() - new Date(asOf).getTime()) / (365.25 * 24 * 3600 * 1000);
  if (ageYears > STALE_YEARS) stale.push(`${metric} (${asOf})`);
  else ok.push(metric);
}

const total = Object.keys(GRADE_BENCHMARKS).length;
console.log(`[benchmark-provenance] ${total} benchmarks checked`);
console.log(`  sourced + current : ${ok.length}`);
console.log(`  sourced but stale : ${stale.length} (> ${STALE_YEARS} yrs)`);
for (const m of stale) console.log(`      ⚠ ${m}`);
console.log(`  sourced, undated  : ${undated.length}`);
for (const m of undated) console.log(`      ⚠ ${m}`);
console.log(`  conventions       : ${conventions.length} (chosen, not measured)`);
for (const m of conventions) console.log(`      · ${m}`);
console.log(`  estimates         : ${estimates.length}`);
for (const m of estimates) console.log(`      ~ ${m}`);
console.log(`  NO SOURCE         : ${missing.length}`);
for (const m of missing) console.log(`      ✗ ${m}`);

if (missing.length > 0) {
  console.error(
    `[benchmark-provenance] FAIL — ${missing.length} benchmark(s) carry no source.`,
  );
  process.exit(1);
}
if (undated.length > 0 || stale.length > 0) {
  console.error(
    `[benchmark-provenance] FAIL — ${undated.length + stale.length} sourced benchmark(s) are undated or older than ${STALE_YEARS} years. Supply a dated figure or mark it an estimate.`,
  );
  process.exit(1);
}
console.log(
  `[benchmark-provenance] sub-floor tail: source=${SUB_FLOOR_TAIL_PROVENANCE.source}, as_of=${SUB_FLOOR_TAIL_PROVENANCE.as_of} — ${SUB_FLOOR_TAIL_PROVENANCE.rationale}`,
);
console.log("[benchmark-provenance] PASS");
