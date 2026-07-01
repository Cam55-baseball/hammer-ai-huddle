## Phase 12+ Hardening — System Completion & Long-Term Stability Seal

Additive-only hardening pass over sealed Phases 1–12. No new features. Locks the WIC runtime into a closed-loop deterministic system with a single canonical fingerprint (`SystemStateV1`), a non-bypassable global invariant checker, and a 10,000-run CI super-gate.

### 1. New shared modules (backend-only, under `supabase/functions/_shared/wic/`)

- `stateCompression/systemStateCompressor.ts`
  - Exports `SystemStateV1` type with the 7 canonical hash fields (`seed`, `engine_execution_order`, `governance_hash`, `snapshot_hash`, `validator_aggregate_hash`, `why_v2_hash`, `determinism_trace_hash`).
  - `compressSystemState(inputs) → SystemStateV1` — deterministic, sorted, stable JSON hash.
  - `systemStateHash(state)` — single canonical fingerprint. This is the ONLY object allowed for cross-system comparisons downstream (telemetry, diagnostics, CI).
- `invariants/globalInvariantChecker.ts`
  - `assertGlobalInvariants({ systemState, rxs, diag, governanceSlice, whyV2Root, validatorAggregate, executionOrder, determinismTrace })`.
  - Fatal `global_invariant_failure` on any mismatch across the 6 hard invariants (snapshot recompute, governance hash match, `why_v2_completeness_score == 100`, zero unresolved fatals, locked ordering equality, stableSeed reproducibility).
  - Halts pipeline — no partial continuation.
- `whyV2/unifiedWhy.ts` (edit — not new)
  - Add `freezeWhyV2(why)` (deep `Object.freeze` on all nested nodes).
  - Add `hashWhyV2(why)` (recursively sorted key stable hash).
  - Post Step 8 in orchestration, any mutation attempt throws `why_v2_mutation_detected`.
- `engineContract/engineContractVFinal.ts`
  - Wrapper `withEngineContract(certifyFn)` that enforces every certifier returns `engine_signature_hash`, `deterministic_output_hash`, `substitution_trace_hash`, `category_resolution_hash`.
  - Rejects unresolved categories and unverified substitutions before the engine result is accepted.
- `telemetry/minimalTelemetryEmitter.ts`
  - `emitSystemState(systemState)` — production emits ONLY `SystemStateV1`.
  - Raw engine logs gated behind `DEBUG_WIC=1`.
  - No intermediate artifact persistence.

### 2. Orchestration patch — `supabase/functions/wk-generate-daily/index.ts`

Insert after Step 10 (snapshot immutability) and before Step 11 (persistence):

```text
10a  compressSystemState(...) → SystemStateV1
10b  freezeWhyV2(whyV2Root) + hash
10c  assertGlobalInvariants(SystemStateV1, ...)
10d  emitSystemState(SystemStateV1)
11   wk_persist_prescriptions_atomic (unchanged call site)
```

- Wrap all seven certifiers via `withEngineContract(...)` — imports only; no logic changes inside engines.
- All existing catch/soft-continue branches after Step 8 remain forbidden; any invariant failure aborts and persists partial diagnostics with `global_validator_status='fatal'` + `SystemStateV1` fields populated.

### 3. Persistence hardening — additive migration + RPC edit

**Migration (additive, nullable):** add to `wk_generation_diagnostics`:
- `system_state jsonb`
- `system_state_hash text`
- `engine_signature_hashes jsonb`
- `why_v2_hash text`
- `validator_aggregate_hash text`
- `global_invariant_status text`

**RPC:** update `wk_persist_prescriptions_atomic` to:
- Recompute `systemStateHash` from provided diag inputs and raise `system_state_hash_mismatch` on divergence.
- Verify governance hash alignment with `wk_movement_catalog` slice used in run.
- Wrap the entire persist as a single transaction — atomic-or-fail-all is already the contract; add explicit `RAISE EXCEPTION` on any invariant mismatch before any INSERT executes.

### 4. CI super-gate — extend `scripts/audits/performance-support-audit.ts`

Append Phase 12+ FINAL suite:
- 10,000-run `SystemStateV1` hash stability against fixed fixtures → any divergence exits 1.
- Global invariant checker pass rate must be 100%.
- Deterministic replay across shuffled input ordering (inputs re-sorted canonically must yield identical `system_state_hash`).
- Forced mutation attack: mutate `whyV2Root` post-freeze → must throw `why_v2_mutation_detected`. Mutate snapshot post-hash → must throw `snapshot_mutation_detected`. Mutate governance slice → must throw `global_invariant_failure`.
- Cross-season replay equivalence: replay Phase 1–12 fixture matrix (12 phases × 9 day types) and confirm identical `system_state_hash` per matrix cell.
- Any deviation → `Deno.exit(1)` → HARD BLOCK MERGE.

### 5. Documentation — `docs/wic/system-freeze-v1.md` addendum

Append the Architectural Rule of Life:
- System is CLOSED-LOOP DETERMINISTIC.
- All outputs derive from `SystemStateV1`.
- No feature may bypass the invariant checker.
- No engine may exist outside the registered execution chain.
- Zero runtime fallback logic anywhere in WIC.
- Evolution is ONLY additive via: new engines (must register in ordering + validator registry), new validators (must register in `globalValidatorRegistry`), new diagnostics fields (must ship an additive migration).

Also update `docs/wic/constitution.md` "Sources of authority" table to list the four new modules.

### Execution order

1. Additive migration for the 6 new diagnostic columns + RPC update.
2. New shared modules (`systemStateCompressor`, `globalInvariantChecker`, `engineContractVFinal`, `minimalTelemetryEmitter`) + edits to `unifiedWhy.ts`.
3. Patch `wk-generate-daily/index.ts` orchestration (Steps 10a–10d + certifier wrappers).
4. Extend audit script with the 10,000-run FINAL suite.
5. Update `system-freeze-v1.md` and `constitution.md`.

### Success criteria

- 10,000× replay produces identical `system_state_hash`.
- Global invariant checker: 100% pass on the audit matrix.
- All four mutation-attack scenarios fail safely with the correct fatal code.
- Production telemetry surface emits only `SystemStateV1`.
- CI audit exits 0.

### Notes

- Fully additive. No schema rewrites, no UI changes, no engine logic changes — only wrappers and hashes.
- Preserves all Phase 11–12 constructs (`determinism_seed`, `snapshot_hash`, `engine_execution_order`, `why_v2_completeness_score`); the new `SystemStateV1` is the canonical fingerprint that binds them together.
