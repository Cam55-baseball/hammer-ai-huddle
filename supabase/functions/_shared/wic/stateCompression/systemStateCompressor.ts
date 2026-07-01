// Phase 12+ — System State Compression Layer
// Canonical single-source fingerprint of an entire generation run.
// This is the ONLY object allowed for cross-system comparison.

import { canonicalJson, fnv1a64Hex } from "../determinism/globalDeterminismLock.ts";

export const SYSTEM_STATE_VERSION = "system_state_v1";

export interface SystemStateV1 {
  version: string;
  seed: string;
  engine_execution_order: string[];
  governance_hash: string;
  snapshot_hash: string;
  validator_aggregate_hash: string;
  why_v2_hash: string;
  determinism_trace_hash: string;
}

export interface CompressInput {
  seed: string;
  engineExecutionOrder: string[];
  governanceHash: string;
  snapshotHash: string;
  validatorAggregate: unknown;
  whyV2Root: unknown;
  determinismTrace: unknown;
}

export function compressSystemState(input: CompressInput): SystemStateV1 {
  return {
    version: SYSTEM_STATE_VERSION,
    seed: input.seed,
    engine_execution_order: [...input.engineExecutionOrder],
    governance_hash: input.governanceHash,
    snapshot_hash: input.snapshotHash,
    validator_aggregate_hash: fnv1a64Hex(canonicalJson(input.validatorAggregate)),
    why_v2_hash: fnv1a64Hex(canonicalJson(input.whyV2Root)),
    determinism_trace_hash: fnv1a64Hex(canonicalJson(input.determinismTrace)),
  };
}

/** Single canonical fingerprint for a SystemStateV1. */
export function systemStateHash(state: SystemStateV1): string {
  return fnv1a64Hex(canonicalJson(state));
}
