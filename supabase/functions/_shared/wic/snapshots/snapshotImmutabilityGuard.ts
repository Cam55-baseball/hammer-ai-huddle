// Phase 11–12 — Snapshot Immutability Guard
// Once a snapshot hash is computed, it must never mutate downstream.

import { canonicalJson, fnv1a64Hex } from "../determinism/globalDeterminismLock.ts";

export interface SnapshotInput {
  rxs: Array<Record<string, unknown>>;
  diag: Record<string, unknown>;
}

/** Compute a stable snapshot hash from prescriptions + diagnostics. */
export function hashSnapshot(input: SnapshotInput): string {
  const slice = {
    rxs: input.rxs.map((r) => ({
      slot: r.slot,
      sequence_order: r.sequence_order,
      sequence_role: r.sequence_role ?? null,
      movement_slug: r.movement_slug,
      sets: r.sets ?? null,
      reps: r.reps ?? null,
      load_pct: r.load_pct ?? null,
      cns_cost: r.cns_cost ?? null,
    })),
    diag: {
      generator_version: input.diag.generator_version,
      resolved_season_phase: input.diag.resolved_season_phase,
      resolved_day_type: input.diag.resolved_day_type,
      determinism_seed: input.diag.determinism_seed,
      governance_catalog_hash: input.diag.governance_catalog_hash,
    },
  };
  return fnv1a64Hex(canonicalJson(slice));
}

export interface ImmutabilityResult {
  ok: boolean;
  expected: string;
  actual: string;
  status: "immutable" | "snapshot_mutation_detected";
}

export function assertImmutable(expected: string, actual: string): ImmutabilityResult {
  const ok = expected === actual;
  return {
    ok,
    expected,
    actual,
    status: ok ? "immutable" : "snapshot_mutation_detected",
  };
}
