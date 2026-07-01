// Phase 12+ — Global Invariant Checker (Final Authority Layer)
// Non-bypassable. Any failure halts the pipeline with global_invariant_failure.

import { hashSnapshot } from "../snapshots/snapshotImmutabilityGuard.ts";
import { governanceCatalogHash, stableSeed } from "../determinism/globalDeterminismLock.ts";
import type { SystemStateV1 } from "../stateCompression/systemStateCompressor.ts";

export interface InvariantInput {
  systemState: SystemStateV1;
  rxs: Array<Record<string, unknown>>;
  diag: Record<string, unknown>;
  governanceRows: Array<Record<string, unknown>>;
  whyV2CompletenessScore: number;
  validatorFatals: Array<{ code: string; message?: string }>;
  lockedExecutionOrder: string[];
  determinismSeedInputs: { videoId: string | null; athleteId: string; contextHash: string };
}

export interface InvariantResult {
  ok: boolean;
  failures: Array<{ code: string; detail: string }>;
}

export class GlobalInvariantFailure extends Error {
  failures: Array<{ code: string; detail: string }>;
  constructor(failures: Array<{ code: string; detail: string }>) {
    super(`global_invariant_failure: ${failures.map((f) => f.code).join(",")}`);
    this.name = "GlobalInvariantFailure";
    this.failures = failures;
  }
}

export function checkGlobalInvariants(input: InvariantInput): InvariantResult {
  const failures: Array<{ code: string; detail: string }> = [];
  const ss = input.systemState;

  // 1. Snapshot hash must equal recomputed hash from immutable snapshot input.
  const recomputedSnap = hashSnapshot({ rxs: input.rxs, diag: input.diag });
  if (recomputedSnap !== ss.snapshot_hash) {
    failures.push({ code: "snapshot_hash_divergence", detail: `expected=${ss.snapshot_hash} actual=${recomputedSnap}` });
  }

  // 2. Governance catalog hash must match deterministic catalog slice used in run.
  const recomputedGov = governanceCatalogHash(input.governanceRows);
  if (recomputedGov !== ss.governance_hash) {
    failures.push({ code: "governance_hash_divergence", detail: `expected=${ss.governance_hash} actual=${recomputedGov}` });
  }

  // 3. why_v2_completeness_score must equal 100.
  if (input.whyV2CompletenessScore !== 100) {
    failures.push({ code: "why_v2_incomplete", detail: `score=${input.whyV2CompletenessScore}` });
  }

  // 4. Validator aggregate must contain zero unresolved fatals.
  if (input.validatorFatals.length > 0) {
    failures.push({ code: "validator_fatals_present", detail: `count=${input.validatorFatals.length}` });
  }

  // 5. Engine execution order must match locked pipeline sequence exactly.
  const a = ss.engine_execution_order;
  const b = input.lockedExecutionOrder;
  if (a.length !== b.length || a.some((v, i) => v !== b[i])) {
    failures.push({ code: "engine_execution_order_mismatch", detail: `expected=${b.join(",")} actual=${a.join(",")}` });
  }

  // 6. Determinism trace must validate stableSeed reproducibility.
  const recomputedSeed = stableSeed(
    input.determinismSeedInputs.videoId,
    input.determinismSeedInputs.athleteId,
    input.determinismSeedInputs.contextHash,
  );
  if (recomputedSeed !== ss.seed) {
    failures.push({ code: "determinism_seed_divergence", detail: `expected=${ss.seed} actual=${recomputedSeed}` });
  }

  return { ok: failures.length === 0, failures };
}

export function assertGlobalInvariants(input: InvariantInput): void {
  const r = checkGlobalInvariants(input);
  if (!r.ok) throw new GlobalInvariantFailure(r.failures);
}
