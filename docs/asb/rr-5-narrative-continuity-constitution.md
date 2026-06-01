# RR-5 — Narrative & Memory Continuity Constitution

**Status:** Sealed (Post-Mastery doctrine phase). Doctrine only — no
implementation.
**Scope:** the `relational.narrative.*` topic family and any future
memory-resurfacing, slump-continuity, emotional-replay, contextual-recall,
or longitudinal-identity-continuity surfaces derived from it.
**Subordinate to:** Eternal Laws, Megaphase 151–160, RR-1…RR-4, the
relational visibility matrix, the safeguarding orchestration sub-route,
and all prior immutable invariants across Phases 1–150.

Narratives are interpretive overlays on the canonical ASB ledger. They
summarize and resurface organism history; they never author organism
truth, never originate athlete feelings, and never carry constitutional
authority.

## RR-5 invariants

1. **Narratives are replay-derived, never mutable truth.** Every
   narrative artifact is a deterministic projection over the
   `relational.narrative.*` event stream plus its declared antecedents.
   No narrative may be edited in place; revisions are additive events.
2. **Memory resurfacing must cite observable history.** Any resurfaced
   memory or callback must reference one or more canonical antecedent
   events via `lineage_parent_ids`. Citation-less resurfacing is
   forbidden.
3. **No invented athlete feelings.** The system may quote self-reported
   psychological state events (RR-3 / `relational.psych.self_report`)
   and may classify inferred state with confidence/missingness visible.
   It may not fabricate, paraphrase, or amplify emotion the athlete did
   not report.
4. **No emotional manipulation.** Narrative surfaces may not exploit
   urgency, scarcity, fear, shame, identity pressure, parasocial
   attachment, comparison framing, or engagement-loop incentives.
5. **No fictional continuity.** Composite or smoothed storylines that
   imply causal links unsupported by lineage are forbidden. Gaps remain
   visible as gaps.
6. **Narrative never overrides safeguarding.** When a safeguarding
   classification is active (per the Megaphase 151–160 safeguarding
   orchestration sub-route), narrative surfaces defer to the
   safeguarding route and may be suppressed, redacted, or paused
   without notice to the athlete.
7. **Narrative cannot become organism authority.** Narrative outputs
   never author `organism_truth`, `athlete_intent`, `authority_override`,
   `hard_stop`, or `rehabilitation_state`. They never gate execution,
   never modify developmental gates, and never influence trust accrual
   directly.
8. **Memory callbacks remain lineage-visible.** Every callback exposes
   its antecedent event IDs one interaction away, at the pinned
   `engine_version` + `reasoning_version`.
9. **Slump continuity is observational.** Slump or struggle narratives
   may describe pattern continuity already present in the ledger. They
   may not predict identity, label the athlete, or close future
   possibility ("you are a slumping hitter" forbidden; "the last 12 PAs
   show contact-rate decline" allowed).
10. **Longitudinal identity continuity is reversible.** The athlete may
    redirect, reframe, or revoke a narrative thread at any time via a
    canonical narrative event. Prior narrative events remain in the
    ledger but lose downstream visibility immediately.

## Allowed memory resurfacing

- Citation-bound recall of prior canonical events (workouts, outings,
  conversations, milestones, self-reports) with visible antecedents.
- Pattern reflection over a bounded window (e.g. "your last four sleep
  self-reports trended low").
- Athlete-initiated retrospective views ("show me my October").

## Prohibited emotional inference

- Inferring feelings the athlete did not report.
- Assigning motive ("you stopped logging because you were discouraged").
- Predictive emotional framing ("this will probably feel hard").
- Composite "emotional score" surfaces without lineage decomposition.
- Hidden sentiment scoring used to mutate any other projection.

## Narrative replay invariants

- Byte-identical narrative output under identical ledger inputs at
  pinned `engine_version` + `reasoning_version`.
- Revocation events remove downstream narrative visibility on the next
  projection rebuild — no grace period, no cached narrative authority.
- Narrative output exposes lineage for every quoted antecedent.

## Contextual continuity constraints

- Context may compress (summarize) and may simplify (omit), but may
  never erase lineage or fabricate continuity.
- Contradictory antecedents must remain visible; convergence may not
  hide the contradiction graph that preceded it.

## Out of scope for RR-5

Implementation. No emitters, projections, schemas, routes, topics, or
surfaces land under RR-5 sealing. See
`docs/asb/post-mastery-expansion-roadmap.md` step 1 for activation
prerequisites.
