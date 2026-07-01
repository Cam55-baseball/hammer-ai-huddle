// Phase 12+ Super-Gate — SystemStateV1 stability & invariant super-check.
// Run: deno run --allow-read scripts/audits/performance-support-audit.ts
// (This module is additive to `performance-support-audit.ts`; execute directly.)

import {
  compressSystemState,
  systemStateHash,
  type SystemStateV1,
} from "../../supabase/functions/_shared/wic/stateCompression/systemStateCompressor.ts";
import { checkGlobalInvariants } from "../../supabase/functions/_shared/wic/invariants/globalInvariantChecker.ts";
import {
  stableSeed,
  governanceCatalogHash,
  buildDeterminismTrace,
  fnv1a64Hex,
  canonicalJson,
} from "../../supabase/functions/_shared/wic/determinism/globalDeterminismLock.ts";
import { hashSnapshot } from "../../supabase/functions/_shared/wic/snapshots/snapshotImmutabilityGuard.ts";
import { buildUnifiedWhyRoot, freezeWhyV2, hashWhyV2 } from "../../supabase/functions/_shared/wic/whyV2/unifiedWhy.ts";

const ENGINE_ORDER = ["lift", "speed", "bat_speed", "conditioning", "cross_sport", "recovery", "arm_care"];

function fixtureRxs(seedOffset: number) {
  return [
    { slot: "lift", sequence_order: 1, movement_slug: `sq_${seedOffset}`, cns_cost: 8 },
    { slot: "speed", sequence_order: 0, movement_slug: `sp_${seedOffset}`, cns_cost: 4 },
  ];
}

function fixtureGov(): Array<Record<string, unknown>> {
  return [
    { slug: "sq_0", family: "compound", cns_cost: 8 },
    { slug: "sp_0", family: "speed", cns_cost: 4 },
  ];
}

function buildSystemStateOnce(runIndex: number, videoId: string | null, athleteId: string): SystemStateV1 {
  const contextHash = fnv1a64Hex(canonicalJson({ ctx: "in_season", run: 0 }));
  const seed = stableSeed(videoId, athleteId, contextHash);
  const gov = fixtureGov();
  const govHash = governanceCatalogHash(gov);
  const rxs = fixtureRxs(0);
  const snapshotHash = hashSnapshot({ rxs, diag: { seed, govHash } });
  const whyRoot = freezeWhyV2(buildUnifiedWhyRoot({
    engineChain: ENGINE_ORDER, equipment: [], environment: null, season: "in_season",
    schedule: "normal", readiness: 100, seed, governanceHash: govHash,
  }));
  const detTrace = buildDeterminismTrace({
    seed, utcPlanDate: "2026-07-01", contextHash,
    governanceCatalogHash: govHash, engineExecutionOrder: ENGINE_ORDER,
  });
  const validatorAgg = { ok: true, fatal: [], warn: [] };
  const state = compressSystemState({
    seed, engineExecutionOrder: ENGINE_ORDER, governanceHash: govHash,
    snapshotHash, validatorAggregate: validatorAgg, whyV2Root: whyRoot, determinismTrace: detTrace,
  });
  return state;
}

const RUNS = 10_000;
let hashSet = new Set<string>();
for (let i = 0; i < RUNS; i++) {
  hashSet.add(systemStateHash(buildSystemStateOnce(i, null, "athlete-A")));
}
if (hashSet.size !== 1) {
  console.error(`FAIL: system_state_hash unstable across ${RUNS} runs (distinct=${hashSet.size})`);
  Deno.exit(1);
}
console.log(`✓ system_state_hash stable across ${RUNS} runs`);

// Invariant checker pass-rate
let passed = 0;
for (let i = 0; i < 1_000; i++) {
  const s = buildSystemStateOnce(i, null, "athlete-A");
  const r = checkGlobalInvariants({
    systemState: s,
    rxs: fixtureRxs(0),
    diag: { seed: s.seed, govHash: s.governance_hash },
    governanceRows: fixtureGov(),
    whyV2CompletenessScore: 100,
    validatorFatals: [],
    lockedExecutionOrder: ENGINE_ORDER,
    determinismSeedInputs: { videoId: null, athleteId: "athlete-A", contextHash: fnv1a64Hex(canonicalJson({ ctx: "in_season", run: 0 })) },
  });
  if (r.ok) passed++;
}
if (passed !== 1_000) {
  console.error(`FAIL: invariant pass rate ${passed}/1000`);
  Deno.exit(1);
}
console.log("✓ invariant pass rate 100%");

// Forced mutation attack — snapshot hash must diverge.
{
  const s = buildSystemStateOnce(0, null, "athlete-A");
  const mutatedRxs = fixtureRxs(0);
  (mutatedRxs[0] as any).sets = 99;
  const r = checkGlobalInvariants({
    systemState: s,
    rxs: mutatedRxs,
    diag: { seed: s.seed, govHash: s.governance_hash },
    governanceRows: fixtureGov(),
    whyV2CompletenessScore: 100,
    validatorFatals: [],
    lockedExecutionOrder: ENGINE_ORDER,
    determinismSeedInputs: { videoId: null, athleteId: "athlete-A", contextHash: fnv1a64Hex(canonicalJson({ ctx: "in_season", run: 0 })) },
  });
  if (r.ok) {
    console.error("FAIL: mutation attack was accepted");
    Deno.exit(1);
  }
  console.log(`✓ mutation attack rejected (${r.failures[0]?.code})`);
}

// Cross-season replay equivalence — same context → same hash across two athletes only differs by seed.
{
  const a = buildSystemStateOnce(0, null, "athlete-A");
  const b = buildSystemStateOnce(0, null, "athlete-B");
  if (a.seed === b.seed || a.snapshot_hash !== b.snapshot_hash) {
    console.error("FAIL: cross-athlete equivalence broken");
    Deno.exit(1);
  }
  console.log("✓ cross-athlete replay equivalence holds");
}

// Randomized ordering input (engineExecutionOrder shuffled) must fail invariant.
{
  const s = buildSystemStateOnce(0, null, "athlete-A");
  const shuffled = [...ENGINE_ORDER].reverse();
  const r = checkGlobalInvariants({
    systemState: s,
    rxs: fixtureRxs(0),
    diag: { seed: s.seed, govHash: s.governance_hash },
    governanceRows: fixtureGov(),
    whyV2CompletenessScore: 100,
    validatorFatals: [],
    lockedExecutionOrder: shuffled,
    determinismSeedInputs: { videoId: null, athleteId: "athlete-A", contextHash: fnv1a64Hex(canonicalJson({ ctx: "in_season", run: 0 })) },
  });
  if (r.ok) {
    console.error("FAIL: shuffled engine order accepted");
    Deno.exit(1);
  }
  console.log("✓ shuffled engine order rejected");
}

// why_v2 freeze — mutation attempts must be silently ignored (strict mode would throw).
{
  const w = freezeWhyV2({ a: 1, nested: { b: 2 } }) as any;
  const before = hashWhyV2(w);
  try { w.a = 99; } catch (_) { /* ok */ }
  try { (w.nested as any).b = 99; } catch (_) { /* ok */ }
  const after = hashWhyV2(w);
  if (before !== after) {
    console.error("FAIL: why_v2 freeze allowed mutation");
    Deno.exit(1);
  }
  console.log("✓ why_v2 freeze holds");
}

console.log("\n[phase 12+ super-gate] ALL CHECKS PASSED");
