# P0-2 — Athlete Context Spine Consumer Activation & Intelligence Validation

## Phase 0 — Housekeeping (close P0-1)

- `docs/asb/reality-feedback-ledger.md`:
  - Close **RFL-023** (athlete context persistence missing).
  - Partial-close **RFL-025** (knowledgeGaps now reads spine; remaining: deeper field coverage).
  - Mark **RFL-026 / RFL-027 / RFL-028** as IMPLEMENTED (spine, equipment scopes, longitudinal events).
- `.lovable/plan.md`: mark P0-1 DONE, open P0-2.

## Phase A — Consumer Activation Audit

Inventory every reader of `useHammerAthleteContext()` / envelope and every downstream module that should depend on athlete context. Confirmed initial set:

- `src/hooks/useHammerChat.ts`
- `src/hooks/useHammerOnboardingDirector.ts`
- `src/lib/hammer/onboarding/knowledgeGaps.ts`
- `src/pages/AthleteCommand.tsx`
- `src/components/hammer/HammerDailyPlan.tsx`

Plus discovery sweep across workout generation, speed engine, roadmap engine, recommendation engine, daily plan composer (via `rg`) — each classified **ACTIVE / PARTIAL / INACTIVE** with variables-available vs variables-consumed table.

## Phase B — Workout Intelligence Activation

For workout generator(s), patch read paths only (no new architecture) so outputs vary on:
lifting age, training age, detraining, injury history, season phase, `equipmentEffective`, weekly availability, development priorities, goal summary, lifecycle band.

Each patch = pull from envelope, branch in existing selection logic, log lineage.

## Phase C — Speed Intelligence Activation

Wire speed systems to already-projected: acceleration profile, top speed, stride profile, asymmetry, workload, speed freshness. Patch passive consumers; no new model.

## Phase D — Roadmap Activation

Wire roadmap generator to: goal_summary, goal_horizon, lifecycle band, season phase, development priorities.

## Phase E — Recommendation Activation

Wire recommendation surfaces to: envelope, `equipmentEffective`, development priorities, injury constraints, workload profile.

## Phase F — Differentiation Test

Script `scripts/audits/spine-differentiation-test.ts` synthesizing 5 athletes (novice, advanced, detrained, injured, hotel-equipment), running through Hammer / dailyPlan / workout / roadmap entrypoints, diffing outputs, writing evidence into the ratification doc.

## Phase G — Hostile Context Test

Extend `scripts/audits/spine-hostile-audit.ts` with empty / partial / stale / conflicting / overridden envelopes — assert lawful (non-null, non-crashing, lineage-visible) outputs.

## Phase H — Intelligence Re-estimate

Recompute: context completeness, consumer activation %, decision utilization %, adaptation capability, overall development intelligence %.

## Phase I — Ratification

Create `docs/asb/athlete-context-spine-consumer-activation-ratification.md` answering all 11 ratification questions, GO/NO-GO verdict, remaining P0 blockers.

## Deliverables

- `docs/asb/athlete-context-spine-consumer-activation-ratification.md` (new)
- `docs/asb/reality-feedback-ledger.md` (RFL closures)
- `.lovable/plan.md` (P0-1 done, P0-2 active)
- `scripts/audits/spine-differentiation-test.ts` (new)
- `scripts/audits/spine-hostile-audit.ts` (extended)
- Patches to workout / speed / roadmap / recommendation / dailyPlan read paths — additive only, no schema changes, no UI changes, no doctrinal changes.

## Out of scope

- New tables, migrations, RLS.
- New UI surfaces.
- New workout / speed / roadmap / recommendation philosophies.
- Elite-tier context variables (deferred to later P-tier).
