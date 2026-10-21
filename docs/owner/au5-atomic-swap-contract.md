# AU5 — Universal Swap transaction acceptance contract

**Staged, not live. No SQL applied, deployment, publish, cron or iOS changes.**

## One authority

The new `swapConversation` draft, `UniversalSwapConversation` sheet and `atomicSwap` adapter are not mounted in athlete routes. They collect three explicit answers (missing / safely available / today or always), offer catalog-backed previews only, and accept one injected transaction. No default transport, direct-table fallback, second equipment save, model-authorized prescription or claimed AI integration exists.

The server transaction is still implementation work. Its authorization and schema changes must be named and approved before application. Existing alternative writes remain the guarded existing feature, not this boundary.

## Required transaction behavior before connection

1. Derive actor from the session, never caller ownership. Self-only. Read fresh access, start/assessment, phase, injury, readiness, schedule, age, growth, training age, arm ledger and workload state from their canonical authorities; no caller `sessionAllowed` boolean can authorize execution.
2. Coordinate a plan-level lock with generation, then lock the exact prescription. Require unmarked planned/pending work for the visit's date. Compare the complete displayed row/version null-safely; missing snapshot fields are not permission to skip a guard.
3. Read current source, original anchor and target catalog rows. Require unambiguous active/non-superseded identities, canonical nonempty matching intent, category/family/unit, applicable sport/position, explicit season/training-age/game/practice legality, age floors, injury and all other existing safety gates. Missing/conflicting metadata blocks; no names or AI guesses fill it.
4. Preserve eight dose fields and all rest/intensity/placement/execution context. Compare applicable CNS, volume, joint stress, contact, recovery and throwing costs using explicit metadata and existing law. Density is not rest. Catalog default dose never authors the replacement.
5. Save one same-row identity/reason/server-owned first receipt plus canonical availability memory atomically. A failure rolls back both. Use existing `athlete_equipment_context`, not a parallel inventory store. Today writes session scope, always persistent scope; preserve unrelated facts. Unknown partner/runway facts require explicit supported memory metadata, not silent conversion to an inventory token.
6. Server-authored idempotency/receipt binds actor, request id, exact before/after, context and catalog versions. A retry of the same operation returns the same outcome; a conflicting reuse fails. No client-provided origin is authoritative.
7. Undo shares current certification and locks; do not blindly restore an original now forbidden, marked, dose-changed or concurrent-edit row. Legacy receipt validation/rejection must be explicit. Restore first instructions and absent/null cues, not newly changed catalog text.
8. Close direct identity/dose/receipt write bypasses without breaking legitimate athlete status logging. Fixed search paths, explicit authenticated execute grants, no public/anonymous internal helpers. Canonical change log and saved readback must agree.

## Metadata and authority gaps

- Both inspected schemas lack `rest_seconds`; rest lives in saved payload/context and its existing timer rules. `density_target_seconds` must not stand in for it.
- Source generated types and historical migrations disagree on `game_day_eligible`; the implementation must verify the hosted schema before selecting fields. Use canonical `game_day_legal` rules, not guessed fields.
- `alternativeRisk` permits absent facts as zero in the old display feature; that is not sufficient universal server certification.
- Universal catalog previews do not certify workload equivalence or current access. Safe exact-distance sprint swaps still require confirmed sufficient runway metadata; marches are not sprint-distance replacements.
- Existing save-equipment RPC cannot persist arbitrary unsupported partner/runway inventory tokens. New draft memory preparation rejects those rather than claiming they saved.
- No reusable SQL entitlement/context certifier was found; generator checks are currently inline. Do not release a partial SQL function that trusts cached client facts.

## Acceptance matrix

Before athlete wiring: self/non-self; expired access; no start; changed injury/phase/catalog; missing workload/intent/gear; contradictory availability; unsupported memory; marked work; stale displayed version; concurrent regeneration; repeated request; chained swaps; exact eight-field dose + rest/context; safe Undo; atomic memory failure; actual saved readback. Then four positive affected-player phone cases (machine→flips, no barbell, no open field, no roller), reason and today/always memory readback. Equipment questions remain until all replacement gates work.