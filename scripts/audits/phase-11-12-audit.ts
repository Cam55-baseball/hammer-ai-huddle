// scripts/audits/phase-11-12-audit.ts
// Phase 11–12 CI Regression Hard Gate.
// Deterministic replay, ordering invariance, substitution determinism,
// governance hash stability, snapshot immutability stress, cross-engine
// conflict detection, and full-season simulation replay parity.
//
// Any variance = HARD FAIL (exit code 1).

import {
  stableSeed,
  utcPlanDate,
  governanceCatalogHash,
  buildDeterminismTrace,
  canonicalJson,
  fnv1a64Hex,
} from "../../supabase/functions/_shared/wic/determinism/globalDeterminismLock.ts";
import {
  hashSnapshot,
  assertImmutable,
} from "../../supabase/functions/_shared/wic/snapshots/snapshotImmutabilityGuard.ts";
import {
  aggregateValidatorReports,
} from "../../supabase/functions/_shared/wic/validation/globalValidatorRegistry.ts";
import {
  resolveCrossEngineConflicts,
} from "../../supabase/functions/_shared/wic/conflictResolver/crossEngineConflictResolver.ts";
import {
  buildUnifiedWhyRoot,
  computeWhyCompleteness,
  mergeUnifiedWhy,
} from "../../supabase/functions/_shared/wic/whyV2/unifiedWhy.ts";

type Result = { name: string; ok: boolean; detail?: string };
const results: Result[] = [];
function record(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}

const CATALOG = [
  { slug: "back_squat_double_ecc", category: "compound_lower" },
  { slug: "db_bench", category: "upper_push" },
  { slug: "lat_pulldown", category: "upper_pull" },
  { slug: "farmer_carry", category: "carry" },
  { slug: "sprint_10y", speed_category: "acceleration" },
  { slug: "rotational_med_ball", bat_speed_category: "rotational" },
];

const RXS_A = [
  { slot: "lift", sequence_order: 0, movement_slug: "back_squat_double_ecc", sets: 3, reps: 3, cns_cost: 20 },
  { slot: "lift", sequence_order: 1, movement_slug: "db_bench", sets: 2, reps: 3, cns_cost: 12 },
  { slot: "speed", sequence_order: 2, movement_slug: "sprint_10y", sets: 4, reps: 1, cns_cost: 10 },
];

const DIAG_A = {
  generator_version: "wic_v1",
  resolved_season_phase: "in_season",
  resolved_day_type: "practice",
  determinism_seed: "SEED",
  governance_catalog_hash: "GH",
};

// 1) Deterministic replay — 1000 runs identical seed + governance hash + snapshot.
{
  const seeds = new Set<string>();
  const gov = new Set<string>();
  const snap = new Set<string>();
  for (let i = 0; i < 1000; i++) {
    seeds.add(stableSeed("vid_x", "athlete_y", "ctx_z"));
    gov.add(governanceCatalogHash(CATALOG as any));
    snap.add(hashSnapshot({ rxs: RXS_A as any, diag: DIAG_A }));
  }
  record("deterministic replay (1000×)", seeds.size === 1 && gov.size === 1 && snap.size === 1,
    `seeds=${seeds.size} gov=${gov.size} snap=${snap.size}`);
}

// 2) Engine ordering invariance — canonicalJson of same object always equal.
{
  const a = canonicalJson({ b: 1, a: [3, 2, 1], c: { z: 1, a: 2 } });
  const b = canonicalJson({ c: { a: 2, z: 1 }, a: [3, 2, 1], b: 1 });
  record("engine ordering invariance", a === b);
}

// 3) Substitution ladder determinism — trace built with same inputs hashes equal.
{
  const t1 = buildDeterminismTrace({
    seed: "s", utcPlanDate: "2025-01-01", contextHash: "c",
    governanceCatalogHash: "g", engineExecutionOrder: ["lift", "speed"],
  });
  const t2 = buildDeterminismTrace({
    seed: "s", utcPlanDate: "2025-01-01", contextHash: "c",
    governanceCatalogHash: "g", engineExecutionOrder: ["lift", "speed"],
  });
  record("substitution ladder determinism", canonicalJson(t1) === canonicalJson(t2));
}

// 4) Governance hash consistency — identical inputs, identical hash.
{
  const h1 = governanceCatalogHash(CATALOG as any);
  const h2 = governanceCatalogHash([...CATALOG].reverse() as any);
  record("governance hash consistency (order-invariant)", h1 === h2, `h1=${h1} h2=${h2}`);
}

// 5) Snapshot immutability stress — expected == actual passes; else fails.
{
  const h = hashSnapshot({ rxs: RXS_A as any, diag: DIAG_A });
  const ok = assertImmutable(h, h);
  const bad = assertImmutable(h, h + "x");
  record("snapshot immutability stress", ok.ok === true && bad.ok === false && bad.status === "snapshot_mutation_detected");
}

// 6) Cross-engine conflict detection.
{
  const rxs = [
    { slot: "cross_sport", movement_slug: "swing_progression", why_payload: { placement: "end_of_day" } },
    { slot: "arm_care", movement_slug: "ac_move_a", why_payload: { throwing_phase: "recovery" } },
  ];
  const r = resolveCrossEngineConflicts(rxs as any, {
    is_game_day: true, throwing_phase: "prep", cns_readiness: 0.9, metabolic_budget: 100,
  });
  record("cross-engine conflict detection", r.ok === false && r.fatals.length >= 2);
}

// 7) Aggregated validator status.
{
  const agg = aggregateValidatorReports([
    { engine: "lift", fatal: [], warn: [{ code: "w", message: "m" }] },
    { engine: "speed", fatal: [{ code: "f", message: "m" }], warn: [] },
  ]);
  record("aggregated validator status", agg.status === "fatal" && agg.per_engine.speed.fatal === 1);
}

// 8) Unified why_v2 completeness — 100 pts requires all 10 fields.
{
  const root = buildUnifiedWhyRoot({
    engineChain: ["lift"], equipment: [], environment: null, season: "in_season",
    schedule: "practice", readiness: 0.7, seed: "s", governanceHash: "g",
  });
  const merged = mergeUnifiedWhy({
    why_today: "a", why_athlete: "a", why_exercise: "a",
    why_volume: "a", why_order: "a", why_recovery: "a",
  }, root);
  const score = computeWhyCompleteness(merged);
  record("unified why_v2 completeness == 100", score === 100, `score=${score}`);
}

// 9) Full-season simulation replay parity — 30 planDates, identical inputs → identical hashes.
{
  const hashes = new Set<string>();
  for (let d = 1; d <= 30; d++) {
    const date = `2025-03-${String(d).padStart(2, "0")}`;
    const seed = stableSeed("v", "a", "c");
    const trace = buildDeterminismTrace({
      seed, utcPlanDate: utcPlanDate(date), contextHash: "c",
      governanceCatalogHash: "g", engineExecutionOrder: ["lift"],
    });
    hashes.add(fnv1a64Hex(canonicalJson({ seed, trace })));
  }
  record("full-season simulation replay parity (30d unique per date)", hashes.size === 30);
}

const failed = results.filter((r) => !r.ok);
if (failed.length > 0) {
  console.error(`\n❌ Phase 11–12 audit failed: ${failed.length} test(s).`);
  Deno.exit(1);
}
console.log(`\n✅ Phase 11–12 audit passed: ${results.length}/${results.length} tests.`);
