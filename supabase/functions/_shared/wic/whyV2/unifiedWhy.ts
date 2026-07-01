// Phase 11–12 — Unified why_v2 root
// Merges per-engine why_v2 payloads into a single shared root so downstream
// consumers see one consistent contract.

export interface UnifiedWhyV2Root {
  why_engine_chain: string[];
  why_global_constraints: {
    equipment: string[];
    environment: string | null;
    season: string | null;
    schedule: string | null;
    readiness: number | null;
  };
  why_determinism_seed: string;
  why_governance_snapshot: string;
  why_substitution_path: Record<string, unknown[]>;
  // Six mandatory constitutional questions — carried through per-row too.
  why_today?: string;
  why_athlete?: string;
  why_exercise?: string;
  why_volume?: string;
  why_order?: string;
  why_recovery?: string;
}

export function buildUnifiedWhyRoot(input: {
  engineChain: string[];
  equipment: string[];
  environment: string | null;
  season: string | null;
  schedule: string | null;
  readiness: number | null;
  seed: string;
  governanceHash: string;
}): UnifiedWhyV2Root {
  return {
    why_engine_chain: input.engineChain,
    why_global_constraints: {
      equipment: input.equipment,
      environment: input.environment,
      season: input.season,
      schedule: input.schedule,
      readiness: input.readiness,
    },
    why_determinism_seed: input.seed,
    why_governance_snapshot: input.governanceHash,
    why_substitution_path: {},
  };
}

/**
 * Deterministic 0–100 completeness score for a merged why_v2 payload.
 * Six constitutional answers (10 pts each) + four Phase 11-12 unified fields
 * (10 pts each) = 100 pts. Missing fields never partial-credit.
 */
export function computeWhyCompleteness(w: Record<string, unknown> | null | undefined): number {
  if (!w) return 0;
  const has = (k: string) => {
    const v = (w as Record<string, unknown>)[k];
    return v !== null && v !== undefined && v !== "";
  };
  let score = 0;
  for (const k of ["why_today", "why_athlete", "why_exercise", "why_volume", "why_order", "why_recovery"]) {
    if (has(k)) score += 10;
  }
  for (const k of ["why_engine_chain", "why_global_constraints", "why_determinism_seed", "why_governance_snapshot"]) {
    if (has(k)) score += 10;
  }
  return score;
}

/** Merge a per-row why_v2 with the unified root. Root fields override. */
export function mergeUnifiedWhy(
  perRow: Record<string, unknown> | null | undefined,
  root: UnifiedWhyV2Root,
): Record<string, unknown> {
  return { ...(perRow ?? {}), ...root } as Record<string, unknown>;
}

// Phase 12+ — Final Normalization Lock ------------------------------------

import { canonicalJson, fnv1a64Hex } from "../determinism/globalDeterminismLock.ts";

/** Deep-freeze a why_v2 payload post-generation (recursive). */
export function freezeWhyV2<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (Object.isFrozen(value)) return value;
  for (const k of Object.keys(value as Record<string, unknown>)) {
    freezeWhyV2((value as Record<string, unknown>)[k]);
  }
  return Object.freeze(value);
}

/** Canonical hash across the recursively-sorted why_v2 payload. */
export function hashWhyV2(w: unknown): string {
  return fnv1a64Hex(canonicalJson(w));
}

export class WhyV2MutationDetected extends Error {
  constructor(detail: string) {
    super(`why_v2_mutation_detected: ${detail}`);
    this.name = "WhyV2MutationDetected";
  }
}

/** Compare pre/post hash; throws on drift. */
export function assertWhyV2Immutable(expected: string, actual: string): void {
  if (expected !== actual) throw new WhyV2MutationDetected(`expected=${expected} actual=${actual}`);
}
