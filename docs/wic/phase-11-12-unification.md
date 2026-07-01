# Phase 11–12 — E2E Unification & Production Lock

Additive, non-breaking. Unifies Phases 1–10 into a single deterministic execution surface.

## Modules

| Module | Path |
|---|---|
| Global Determinism Lock | `supabase/functions/_shared/wic/determinism/globalDeterminismLock.ts` |
| Snapshot Immutability Guard | `supabase/functions/_shared/wic/snapshots/snapshotImmutabilityGuard.ts` |
| Global Validator Registry | `supabase/functions/_shared/wic/validation/globalValidatorRegistry.ts` |
| Unified why_v2 | `supabase/functions/_shared/wic/whyV2/unifiedWhy.ts` |
| Cross-Engine Conflict Resolver | `supabase/functions/_shared/wic/conflictResolver/crossEngineConflictResolver.ts` |

## Locked Engine Execution Order

`lift → speed → bat_speed → conditioning → cross_sport → recovery → arm_care`

After Step 7:
8. Global Determinism Lock validation
9. Global Validator aggregation
10. Snapshot immutability validation
11. Persistence (atomic RPC only, `wk_persist_prescriptions_atomic`)

No branching allowed after Step 8.

## New Diagnostics Columns

Additive columns on `wk_generation_diagnostics`:

- `determinism_seed text`
- `determinism_trace jsonb`
- `engine_execution_order text[]`
- `global_validator_status text`
- `snapshot_hash text`
- `snapshot_integrity_status text`
- `governance_catalog_hash text`
- `why_v2_completeness_score int`

Populated on both success and failure paths.

## Snapshot Immutability

`wk_persist_prescriptions_atomic` raises `snapshot_mutation_detected`
when `p_diag.expected_snapshot_hash != p_diag.snapshot_hash`.

## Unified why_v2

Every prescription row's `why_v2` is merged with a unified root containing:

- `why_engine_chain`
- `why_global_constraints`
- `why_determinism_seed`
- `why_governance_snapshot`
- `why_substitution_path`

Six constitutional answers (`why_today`, `why_athlete`, `why_exercise`,
`why_volume`, `why_order`, `why_recovery`) plus the four unified fields
above = **10 fields × 10 pts = 100** deterministic completeness score.

`why_v2_completeness_score < 100` → fatal `why_v2_incomplete`.

## Global Fatals

- `system_governance_mismatch`
- `determinism_seed_divergence`
- `snapshot_mutation_detected`
- `cross_engine_conflict_detected`
- `why_v2_incomplete`
- `diagnostic_invariant_failure`

## CI Regression Hard Gate

`scripts/audits/phase-11-12-audit.ts` — deterministic replay (1000×),
ordering invariance, substitution ladder determinism, governance hash
consistency, snapshot immutability stress, cross-engine conflict
detection, and full-season simulation replay parity.

Run:

```
deno run -A scripts/audits/phase-11-12-audit.ts
```

Any variance → exit 1 → HARD FAIL BUILD.

## System Freeze Rules

- No new engines without modifying `ENGINE_EXECUTION_ORDER` **and**
  `ENGINE_FATALS` in `globalValidatorRegistry.ts`.
- No new validators without registration in `globalValidatorRegistry.ts`.
- No new diagnostic fields without an additive migration.
- No runtime fallback logic anywhere in WIC.
