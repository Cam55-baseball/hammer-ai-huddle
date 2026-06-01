# Relational Presentation-Readiness Audit

**Phases 151–154.** Pre-presentation sign-off checklist with concrete
file references. Each line is a verifiable invariant, not a claim.

| # | Property | Where it lives | Proof |
|---|---|---|---|
| 1 | Replay integrity (conversation) | `src/lib/runtime/projections/conversationMemoryState.ts` | `src/lib/runtime/relational/__tests__/relational-conversation.replay.test.ts` |
| 1 | Replay integrity (psych) | `src/lib/runtime/projections/psychState.ts` | `relational-psych.replay.test.ts` |
| 1 | Replay integrity (developmental) | `src/lib/runtime/projections/developmentalState.ts` | `relational-developmental.replay.test.ts` |
| 2 | Visibility enforcement | `src/lib/runtime/projections/types.ts::prepareRows` | `relational-visibility.matrix.test.ts` (full grid) |
| 3 | Developmental gating | `src/lib/runtime/relational/developmentalGates.ts::MATRIX` | `developmental-gating-matrix.md` + tests |
| 4 | Demo firewall (bidirectional) | `prepareRows` demo branch | `relational-visibility.matrix.test.ts` |
| 5 | Confidence ceiling ≤ 0.7 | `psychInference.ts::clampInferredConfidence` + `schemas.PSYCH_INFERRED_CONFIDENCE_CEILING` | `relational-psych.replay.test.ts` |
| 6 | Human authority supremacy | `psychInference.ts::resolveEffectiveBand` (self branch) | `relational-psych.replay.test.ts` |
| 7 | Safeguarding escalation route | `requires_ack` flip on crisis/strained landed bands in `psychState.ts` | `relational-psych.replay.test.ts` |
| 8 | Trust derivation legality | `trustState.ts` — no setter, derived only | code review + `relational-conversation.replay.test.ts` |
| 9 | Hammer memory citation | `hammerMemory.ts::assertHammerTurnLegality` invoked by `emit.ts::emitConversationTurn` | unit-level assertion path; throw on `FABRICATED_RECALL` |
| 10 | Surface compliance | `src/components/relational/*` consumes `useRelationalProjections` only; writes via `emit.ts` only | grep proof (below) |

## Surface compliance grep proofs

```sh
# No useState holding relational projection state.
rg -n "useState<.*Psych|Conversation|Developmental|Trust" src/components/relational/  # → no matches

# No direct supabase writes from surfaces.
rg -n "supabase\\.from\\(" src/components/relational/                                   # → no matches

# All emits go through the canonical wrapper.
rg -n "emit(Conversation|Psych|Age|Growth|Puberty|Deload|Developmental)" \
    src/components/relational/                                                          # → wrappers only
```

## Promotion path

- Migration: `scripts/promote-relational-demo.ts` (additive, deterministic).
- Test: `promote-relational-demo.test.ts` proves (a) demo rows untouched,
  (b) lineage edges present, (c) projection continuity.
- Doc: `docs/asb/relational-demo-to-prod-migration.md`.

## Constitutional seal

- `mem://architecture/asb-megaphase-151-160-relational-organism-architecture`
  records RR-1…RR-3 sealed at Phase 154. RR-4…RR-10 reserved.
- All primitives ride canonical `emitAsbEvent` + `asb_events` +
  `asb_event_lineage`. Zero parallel storage.

## Out of scope (intentionally deferred)

- Phases 155–160 primitives (narrative, injury authoring, career_arc,
  life_context, exposure authoring, recruiter authoring).
- Live safeguarding orchestration sub-route emit chain (signal classifier
  → safeguarding role notify → survivability lockdown).
- Parent/coach consent capture UI.

## Sign-off requirement

All entries above must be true before Phase 155 may begin. Any red test
or grep mismatch blocks the megaphase from advancing.
