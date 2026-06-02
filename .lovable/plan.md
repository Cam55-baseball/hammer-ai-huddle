# RR-6 Wave 1 — Injury Recovery Continuity Activation

Strict additive activation under RR-6 constitution and Megaphase 151–160 namespace. Mirrors the RR-5/RR-8 build pattern that is already in production. No schema rewrites, no replay-engine changes, no mutable recovery state, no RR-7/9/10 work.

## Files created

1. `src/lib/runtime/relational/injurySchemas.ts`
   - Topic family: `relational.injury.reported | updated | recovery_checkpoint | rtp_authorized | visibility_revoked`.
   - Zod schemas extending the shared `RelationalEnvelope` (matches `narrativeSchemas.ts` / `lifeContextSchemas.ts`).
   - Allowed payload fields **only**: `body_region`, `severity_band` ∈ {light, moderate, significant}, `participation_status` ∈ {full, modified, limited, inactive}, `reported_symptoms` (bounded controlled vocabulary enum, max length capped), `recovery_focus?`, `checkpoint_type?` ∈ {mobility, strength, conditioning, throwing, general}, `visibility_scope` ∈ {self, parent, coach, safeguarding_only, demo}, `authority`, `lineage_parent_ids`, `occurred_at`, `missingness`, `confidence`.
   - Strict `.strict()` rejection of any forbidden field (diagnosis, prognosis, treatment, prescription, ETA, pain score, biometric prediction, AI RTP).
   - `RTP_AUTHORIZED_ACTORS` constant = {`parent`, `authorized_adult`}. Coach / AI / system actors rejected at schema layer for `rtp_authorized`.

2. `src/lib/runtime/relational/injuryEmitters.ts`
   - Thin wrappers over `emitAsbEvent` / `emitAsbLineage`. No DB tables, no mutable state.
   - Exports `InjuryEmissionError` and `InjuryEmitGate { safeguardingLockdown; isMinor }`.
   - Pre-emission assertions: block `actor_role` ∈ {recruiter, commercial, ai} for any RR-6 emit; coach blocked specifically from `rtp_authorized`; under `safeguardingLockdown` rewrite `visibility_scope → "safeguarding_only"`; full Zod validation; lineage preservation; reject payload strings hitting the diagnostic denylist (see §5).
   - Emitters: `emitInjuryReported`, `emitInjuryUpdated`, `emitRecoveryCheckpoint`, `emitRtpAuthorized`, `emitInjuryVisibilityRevoked`.

3. `src/lib/runtime/projections/injuryRecoveryState.ts`
   - Pure deterministic projection, memoized via existing `memoize(...)` helper from `projections/types.ts` (inherits `prepareRows` demo↔production firewall and the new parent-scope guard sealed in Wave 1D).
   - Output: `activeRecoveryState | null`, `participationStatus`, `latestCheckpointByType: Record<type, event_id>`, `visibleRecoveryTimeline: Array<...>`, `revokedEventIds: Set<string>`, `safeguardingHeld: boolean`, `missingness: { fields: string[]; reason }`.
   - Replay rules: stable under shuffled input (sorted by `(occurred_at, event_id)` in `prepareRows`), idempotent on duplicate ids, `visibility_revoked` events remove the referenced ids from the next rebuild, safeguarding precedence inherited. No `Date.now`, no randomness, no future estimates, no scoring, no RTP inference.

4. `src/lib/runtime/relational/__tests__/injurySchemas.test.ts`
   `src/lib/runtime/relational/__tests__/injuryEmitters.test.ts`
   `src/lib/runtime/relational/__tests__/injuryRecoveryState.replay.test.ts`
   `src/lib/runtime/relational/__tests__/injury-visibility.test.ts`
   `src/lib/runtime/relational/__tests__/injury-reference.test.ts`
   - Test directory is `__tests__/` to match the existing convention (and Wave 1C replay-isolation fixtures live there).
   - Each test namespaces event ids and `occurred_at` bands per the Wave 1C replay-isolation convention.
   - Coverage: replay determinism (shuffled input), duplicate-id idempotency, revocation rebuild, safeguarding precedence override, demo firewall, parent supremacy for minors, coach RTP block, recruiter / commercial actor block, denylist enforcement, missingness preservation, arbitration stability.

5. `docs/asb/injury-recovery-audit.md`
   - Sections: emotional-safety review, anti-diagnosis audit, safeguarding precedence proof, replay determinism proof, visibility matrix verification (extends `docs/asb/relational-visibility-matrix.md` for the new `safeguarding_only` scope value), manipulation/coercion review, parent supremacy review, remaining risks, final verdict.

## Files edited (minimal)

6. `src/hooks/useRelationalProjections.ts`
   - Add `useInjuryRecoveryState(athleteId, scope)` following the existing one-liner pattern. No other hook changes.

7. `src/lib/relational/copy.ts`
   - Add `INJURY_RECOVERY_VOICE`: observational, calm, non-medical, protection-first sample lines ("Recovery has been part of your recent routine.", "Training load has been adjusted recently.", "Return-to-play guidance was updated.").
   - Add `INJURY_RECOVERY_VOICE.denylist`: "fully healed", "safe to return", "career-threatening", "high risk athlete", "injury prone", "recovered ahead of schedule", "guaranteed return", and the existing diagnostic tokens ("diagnosed", "diagnosis", "disorder", "prescribed", "treatment plan", "prognosis").

8. `src/lib/runtime/relational/hammerMemory.ts`
   - Extend `MemoryCallback` with a third `{ kind: "injury_continuity"; ref: ArbitrationInjuryRef }` variant.
   - Add `ArbitrationInjuryRef { event_id; occurred_at; topic_tag; phase }`.
   - Extend `arbitrateMemoryCallback` input with `injury: ArbitrationInjuryRef | null`. Deterministic priority: safeguardingLockdown ⇒ none → newest `occurred_at` wins across all three candidates → lexical `tieKey` tie-break → fixed kind ordering `narrative < life_context < injury_continuity` for absolute ties.
   - Add `assertInjuryReferenceLegality` enforcing `INJURY_RECOVERY_VOICE.denylist`, cited-event-id requirement, inferred-confidence ceiling 0.7, and safeguarding suppression.

9. `src/components/relational/HammerConversationPanel.tsx`
   - Wire the third arbitration candidate from `useInjuryRecoveryState`. No new sections; the existing single-callback chip surface renders the `injury_continuity` variant when arbitration selects it.

10. `src/components/relational/InjuryLifecycleStrip.tsx`
    - Switch from the raw timeline read to `useInjuryRecoveryState`. Render the existing phase strip plus one calm recovery-continuity chip sourced from `INJURY_RECOVERY_VOICE`. No predictions, no countdowns, no scoring, no RTP recommendation surface. `safeguardingHeld` collapses the strip to a calm held-back line.

11. `src/pages/Relational.tsx`
    - No structural change. The strip already lives at the right slot; it just now consumes the projection.

## Stop gates held

No RR-7 / RR-9 / RR-10 activation. No recruiter, exposure, commercial, or career-arc work. No schema rewrites of `asb_events` / `asb_event_lineage`. No new primitives outside the reserved `relational.injury.*` family. No replay-engine rewrites. No mutable recovery state. No autonomous RTP, no diagnosis, no prescription, no future-estimate language anywhere.

## Verification (run after build)

- `bunx tsc --noEmit`
- Full relational vitest suite
- RR-5 + RR-6 + RR-8 suites together
- `bash scripts/preflight.sh`

Report will return: exact files changed, exact added test counts, pass/fail totals, replay-determinism guarantees, remaining risks, and the final RR-6 Wave 1 verdict.
