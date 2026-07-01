## Phase 11–12 — E2E Unification & Production Lock

Additive-only unification of Phases 1–10 into a single deterministic execution surface. No UI, no schema rewrites beyond explicit additive columns.

### 1. New shared modules (backend-only)

Under `supabase/functions/_shared/wic/`:

- `determinism/globalDeterminismLock.ts`
  - `stableSeed(videoId, athleteId, contextHash)` → deterministic hash
  - UTC temporal normalizer
  - Canonical sort helpers for templates / substitutions / category resolution
  - Rejects undefined runtime fallback paths (throws `determinism_seed_divergence`)
  - Emits `determinism_trace` object
- `snapshots/snapshotImmutabilityGuard.ts`
  - `hashSnapshot(rxs, diag)`, `assertImmutable(preHash, postHash)`
  - Fatal: `snapshot_mutation_detected`
- `validation/globalValidatorRegistry.ts`
  - Registers every engine's fatal codes (Lift/Speed/Bat/Cond/XS/Rec/AC)
  - Adds global fatals: `system_governance_mismatch`, `determinism_seed_divergence`, `snapshot_mutation_detected`, `cross_engine_conflict_detected`, `why_v2_incomplete`, `diagnostic_invariant_failure`
  - `aggregate(reports[])` → single `validatorReport`
- `conflictResolver/crossEngineConflictResolver.ts`
  - Detects metabolic-load conflicts, arm-care vs throwing-phase mismatch, XS illegal transfer on game day, fatigue-readiness contradictions
  - Returns `{ resolved: Rx[] }` or fatal
- `whyV2/unifiedWhy.ts`
  - Merges per-engine `why_v2` into a single root with additive keys: `why_engine_chain`, `why_global_constraints`, `why_determinism_seed`, `why_governance_snapshot`, `why_substitution_path`
  - `computeCompleteness(why)` → 0–100 deterministic score

### 2. Additive migration — `wk_generation_diagnostics`

Add nullable columns:
- `determinism_seed text`
- `determinism_trace jsonb`
- `engine_execution_order text[]`
- `global_validator_status text`
- `snapshot_hash text`
- `snapshot_integrity_status text`
- `governance_catalog_hash text`
- `why_v2_completeness_score int`

Update `wk_persist_prescriptions_atomic` to persist these fields and to invoke `assertImmutable(p_diag->>'snapshot_hash', computed_hash)` — mismatch aborts with `snapshot_mutation_detected`.

### 3. Orchestration patch — `wk-generate-daily/index.ts`

Locked, non-branching pipeline:

```text
1  Lift (P8)
2  Speed (P9)
3  Bat Speed (P9)
4  Conditioning (P10)
5  Cross-Sport (P10)
6  Recovery (P10)
7  Arm Care (P10)
8  globalDeterminismLock.validate()
9  globalValidatorRegistry.aggregate()
10 snapshotImmutabilityGuard.assert()
11 wk_persist_prescriptions_atomic (only path)
```

- Compute `stableSeed` once at top; pass to every certifier via context.
- Run `crossEngineConflictResolver` between step 7 and 8.
- All certify* engines receive one shared `whyV2Root` accumulator instead of writing isolated payloads.
- No `catch → soft continue` after step 8; fatals abort and still persist partial diagnostics with core fields populated.

### 4. Certifier updates (import + hook only)

For `certifyLift`, `certifySpeed`, `certifyBatSpeed`, `certifyConditioning`, `certifyCrossSport`, `certifyRecovery`, `certifyArmCare`:
- Accept `{ seed, whyV2Root, governanceHash }` in context.
- Append into `whyV2Root` (no per-engine root writes).
- Return fatals into a shared `EngineReport` shape consumed by the global registry.

No behavioral changes to selection logic.

### 5. CI regression — `scripts/audits/performance-support-audit.ts`

Append Phase 11–12 suite:
- Deterministic replay: 1000 runs of `wk-generate-daily` against a fixture → identical `snapshot_hash`.
- Engine ordering invariance test.
- Substitution ladder determinism (per engine).
- Governance catalog hash stability.
- Snapshot immutability stress (mutate post-hash → expect fatal).
- Cross-engine conflict detection matrix.
- Full-season simulation replay parity (12 phases × 9 day types).
- Any variance → `Deno.exit(1)`.

### 6. Architectural freeze rules (docs)

Add `docs/wic/system-freeze-v1.md`:
- New engines require globalValidatorRegistry + engine_execution_order update.
- New validators must register in globalValidatorRegistry.
- New diagnostic fields require additive migration.
- Zero runtime fallback logic tolerated inside WIC.

### Execution order

1. Migration (additive columns + RPC update).
2. New shared modules (determinism / snapshot / validator registry / conflict resolver / unifiedWhy).
3. Patch `wk-generate-daily/index.ts` orchestration.
4. Update seven certifiers (imports + hooks).
5. Expand audit script with Phase 11–12 matrix.
6. Update `docs/wic/constitution.md` + add `docs/wic/system-freeze-v1.md`.

### Success criteria

- 1000× replay produces identical snapshot_hash.
- Zero unresolved cross-engine conflicts on the full matrix.
- `why_v2_completeness_score` = 100 on every generated row in the audit.
- Governance hash stable across identical inputs.
- CI audit exits 0.
