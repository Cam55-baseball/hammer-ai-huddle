# System Freeze v1 — Phase 12+ Architectural Rule of Life

The Workout Intelligence Constitution (WIC) is now a **closed-loop deterministic runtime**. Phases 1–12 are architecturally frozen; this document defines the permanent evolution rules.

## Constitutional Invariants

1. All outputs derive from a single `SystemStateV1` fingerprint.
2. No feature may bypass `checkGlobalInvariants`.
3. No engine may exist outside the registered `ENGINE_EXECUTION_ORDER`.
4. No runtime fallback logic is permitted in any WIC module.
5. `why_v2` is frozen and hash-locked after Step 8 of orchestration.
6. Persistence is **atomic-or-fail-all**: partial writes are impossible.
7. Production telemetry emits **only** `SystemStateV1`; raw engine logs require `DEBUG_WIC=1`.

## Layers (execution order in `wk-generate-daily`)

1. Certifiers (Lift → Speed → Bat Speed → Conditioning → Cross-Sport → Recovery → Arm Care)
2. Unified `why_v2` root merge + per-row merge
3. Cross-engine conflict resolver
4. Validator aggregate
5. Snapshot immutability hash
6. Engine Contract V-Final signatures (per engine)
7. `freezeWhyV2` + `hashWhyV2`
8. `compressSystemState` → `SystemStateV1`
9. `checkGlobalInvariants` (final authority)
10. `emitSystemState` (telemetry)
11. `wk_persist_prescriptions_atomic` (RPC-side: refuses `global_invariant_status = fatal`, snapshot mutation, why_v2 mutation)

## Evolution Rules

Evolution is permitted **only** by:

- Registering a new engine (must be added to `ENGINE_EXECUTION_ORDER` and receive a certifier).
- Adding a new validator to `globalValidatorRegistry`.
- Adding new diagnostic columns (via migration) surfaced through the atomic RPC.

Any other change — silent branch, ad-hoc fallback, out-of-band mutation of `why_v2`, or bypass of the invariant checker — is a constitutional violation.

## CI Super-Gate

`scripts/audits/phase-12-plus-super-gate.ts` enforces:

- `system_state_hash` stability across 10,000 runs.
- Invariant checker pass rate = 100%.
- Forced-mutation attack rejection.
- Randomized engine-ordering rejection.
- Cross-athlete replay equivalence.
- `why_v2` freeze integrity.

Any deviation is a hard merge-block.

## Final End State

The system is: fully deterministic, fully replayable, fully invariant-checked, fully governance-stamped, fully snapshot-safe, fully conflict-resolved, fully auditable at system-state level, and impossible to silently drift.
