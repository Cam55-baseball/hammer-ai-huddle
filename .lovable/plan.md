# Relational Verification & Surface Wiring — Phases 152–154 Lock

Scope is strictly bounded: no Phase 155–160 work. This pass closes verification, seals constitutional docs, and wires the approved presentation surfaces as pure downstream projections over the substrate already shipped.

## Section 1 — Replay test suite

Add under `src/lib/runtime/relational/__tests__/`:

- `relational-conversation.replay.test.ts` — fixed event fixtures → assert `conversationMemoryState` is byte-stable across two runs, redaction zeroes `utterance_ref` and removes `trust_delta` contribution, `last_shared_scope` reflects last `relational.conversation.shared`.
- `relational-psych.replay.test.ts` — self_report supersedes inferred on same axis; inferred confidence clamped to 0.7; crisis/strained landed bands flip `requires_ack`; decay deterministic across tick counts.
- `relational-developmental.replay.test.ts` — stage regression rejected; `effectiveLoadCeiling` = min(stage_ceiling, active deload); gated topics blocked per matrix.
- `relational-visibility.matrix.test.ts` — table-driven matrix over `{self, coach, parent, org, external, demo} × {self, parent, coach, demo, undefined}` payload visibility; asserts firewall in `prepareRows` (demo↔production isolation; `self` payloads excluded from non-self scopes).

All tests deterministic — no `Date.now`, no `Math.random`, no network.

## Section 2 — Constitutional audit docs

Add under `docs/asb/`:

- `relational-visibility-matrix.md` — full scope×payload truth table mirroring the test matrix; cites `prepareRows`.
- `developmental-gating-matrix.md` — frozen stage→allowed/blocked topic table from `developmentalGates.ts::MATRIX`; load ceilings; regression illegality.
- `relational-demo-to-prod-migration.md` — additive-only promotion contract; original demo events retained; promoted events carry lineage edge with `derivation_type = "demo_promotion"`; replay equivalence guarantees.
- `relational-failure-modes.md` — FABRICATED_RECALL, RECRUITER_REFERENCE_WITHOUT_CONSENT, MISSINGNESS_HIDDEN, inferred ceiling breach, stage regression, demo leakage, self-supremacy violation; each with detection point, containment, and audit signal.

## Section 3 — Demo→production migration

Finalize `scripts/promote-relational-demo.ts`:

- Reads `asb_events` where `payload.visibility_scope = 'demo'` for given `athlete_id`.
- For each, emits a NEW event via `emitAsbEvent` with same topic, payload rewritten to target scope (`self` | `parent` | `coach`), new `event_id`, new `idempotency_key = sha("promote::" + original.event_id + "::" + target_scope)`.
- Emits `asb_event_lineage` edge `parent=original, child=new, derivation_type="demo_promotion"`.
- Original demo event left untouched (additive-only).
- Dry-run mode prints planned promotions; `--apply` writes.
- Companion test `promote-relational-demo.test.ts` proves: (a) demo rows unchanged, (b) every promoted row has a lineage edge, (c) projecting at target scope post-promotion yields the same `ConversationMemoryState` / `PsychState` shape as projecting the demo events at demo scope (replay-certifiable continuity).

## Section 4 — Constitutional seal

- Append RR-1…RR-3 invariants to `mem://architecture/asb-megaphase-151-160-relational-organism-architecture`:
  - **RR-1** Conversation memory is projection-only; Coach Hammer turns must cite `recalled_event_ids`.
  - **RR-2** Psych self-report supersedes inferred; inferred confidence ≤ 0.7; crisis/strained transitions require human ack.
  - **RR-3** Developmental stage monotonic; effective load ceiling is the minimum of stage ceiling and active deload; gated topics constitutionally blocked.
- Update `mem://index.md` Memories entry for the 151–160 megaphase to reflect Phases 152–154 sealed and RR-1…RR-3 active. RR-4…RR-10 remain reserved for 155–160.

## Section 5 — Presentation surface wiring

All surfaces are **read-only projections** via `useRelationalProjections`. Writes (where applicable) go through `emitAsbEvent` via the relational `emit.ts` wrappers only. No `useState` holding relational data; no mock arrays; no UI-derived organism state.

Components under `src/components/relational/`:

- `HammerConversationPanel.tsx` — consumes `useConversationMemory(athleteId, scope)`; renders threads, recall citations, redaction badges, derived trust score. Input box calls `emitConversationTurn` wrapper (write path additive; `assertHammerTurnLegality` enforced).
- `DevelopmentalStageChip.tsx` — consumes `useDevelopmentalState`; shows current stage, effective load ceiling, blocked-topic count. Pure read.
- `ParentTrustCard.tsx` — consumes `useTrustState` filtered to `relationship_type = "parent"` and `useConversationMemory(athleteId, "parent")`; shows derived trust score, last shared scope, consent state. Pure read.
- `SlumpReloadFlow.tsx` — consumes `usePsychState`; when `confidence` axis lands in `strained`/`crisis` shows reload prompt that emits `relational.psych.self_report` via wrapper on submit. No local mood state.
- `InjuryLifecycleStrip.tsx` — read-only projection over `relational.injury.*` (seeded demo events only at this phase); no writes wired.
- `RecruitingRoadmap.tsx` — read-only projection over `relational.recruiter.*` + developmental gate; if stage blocks recruiter topic, renders gated placeholder citing the matrix.
- `AthleteJourneyMap.tsx` — composes stage history + narrative/exposure projections (seeded demo) into a timeline; pure read.

Mounted on a single `/relational` route (or existing demo shell) gated by `DemoModeContext` so production scope sees only promoted/canonical data per Phase 151 firewall.

## Section 6 — Presentation-readiness audit

Produce `docs/asb/relational-presentation-readiness.md` checklist with concrete file:line citations proving:

1. Replay integrity — Section 1 tests green.
2. Visibility enforcement — `prepareRows` firewall + visibility matrix test.
3. Developmental gating — matrix doc + gating test.
4. Demo firewall — bidirectional isolation test.
5. Confidence ceilings — `clampInferredConfidence` + psych test.
6. Human authority supremacy — `resolveEffectiveBand` self branch + test.
7. Safeguarding escalation — `requires_ack` flip on crisis/strained landed bands.
8. Trust derivation legality — `trustState` derives, never stores.
9. Hammer memory citation — `assertHammerTurnLegality` + FABRICATED_RECALL test.
10. Surface compliance — grep proof that no `src/components/relational/*` file holds relational `useState` and no surface bypasses `emit.ts`.

## Technical notes

- No DB migrations required — all primitives ride existing `asb_events` + `asb_event_lineage`.
- No new ASB topics introduced (152–154 topics already constitutionalized in Phase 151).
- Vitest config already covers `src/**/*.test.ts`; new tests auto-discovered.
- Migration script is one-shot Node/Bun executable, not an edge function, to keep promotion an explicit operator action.
- Phases 155–160 remain frozen until this audit signs off.