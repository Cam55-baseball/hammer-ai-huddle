
# Recommendation Lifecycle Canonical Emission Sprint — Plan

Observation-only. No doctrine, scoring, ranking, recommendation logic, UI redesign, or schema changes. All emission goes through the existing `emitObservability` / `useEmitOnce` infra (Wave-1) using `engine_version = asb-1.0.0` and deterministic `idempotency_key = sha256(athlete_id|topic|occurred_at|payload)`. Topics are interpretive observability events — never author `organism_truth`, `athlete_intent`, `authority_override`, `hard_stop`, or `rehabilitation_state`.

## Canonical Event Registry (Wave-2)

| Topic | Producer (file:line site) | Bucket | Actor | Closes |
|---|---|---|---|---|
| `foundation.recommendation.shown` | `FoundationsShelf.tsx` — existing `useEffect` that records `foundation_video_outcomes` insert | per `(athlete_id, video_id, UTC-day)` | athlete | RFL-009 |
| `foundation.recommendation.opened` | `FoundationsShelf.tsx` — `open(videoId)` handler (existing `clicked_at` update) | per `(athlete_id, video_id, UTC-day)` | athlete | RFL-009 |
| `foundation.recommendation.completed` | `useFoundationVideoOutcomes` / video player completion path that writes `foundation_video_outcomes.completed_at` | per `(athlete_id, video_id, UTC-day)` | athlete | RFL-009 |
| `foundation.drill.assigned` | `useAssignDrill` mutation in `src/hooks/useDrillAssignments.ts` | per `(athlete_id, drill_id, UTC-day)` | coach | RFL-008 |
| `foundation.drill.started` | `useCompleteAssignment` first-touch / `drill_prescriptions` start path | per `(athlete_id, drill_id, UTC-day)` | athlete | RFL-008 |
| `foundation.drill.completed` | `useCompleteAssignment` success branch | per `(athlete_id, drill_id, UTC-day)` | athlete | RFL-008 |
| `foundation.recommendation.coach_ack` | Coach hammer brief panel — explicit "Acknowledge" affordance (minimal addition to existing `PieV2HammerBriefPanel.tsx` review surface) | per `(athlete_id, recommendation_id, coach_id)` lifetime | coach | RFL-010 |

Coach ack is an **intentional** signal only. The existing mount-time `intelligence.hammer.viewed` (RFL-004) stays as the view event; ack is a separate explicit action.

## Implementation Steps

1. **Producer wiring** — add `emitObservability` calls alongside (not replacing) existing DB writes at the 7 sites above. Each call is `await`-free, never throws (per `src/lib/asb/emit.ts` contract).
2. **Ack affordance** — add a single "Acknowledge recommendation" button to `PieV2HammerBriefPanel.tsx` for coach role; clicking emits `foundation.recommendation.coach_ack` with `{recommendation_id, athlete_id, coach_id}`. No new doctrine, no notification side effects.
3. **Reducer extension** — extend `src/lib/observability/recommendationFunnel.ts` with a new `computeRecommendationEffectivenessFromEvents(events)` projection that derives every stage (shown / opened / drill_started / drill_completed / coach_ack) from `asb_events` topic rows, replacing table-derived inputs. Existing table-derived function kept as fallback for back-compat but marked deprecated in comments.
4. **No schema, no migration, no RLS, no edge function changes.** No edits to `client.ts`, `types.ts`, `.env`, `config.toml`, or any intelligence engine.

## Documentation Deliverables

- `docs/asb/recommendation-event-governance.md` — full registry: producer, consumer, payload schema, idempotency strategy, replay strategy, lineage path, with `file:line` evidence for each topic.
- `docs/asb/recommendation-lineage-audit.md` — end-to-end PASS/FAIL trace `Generated → Shown → Opened → Drill Assigned → Started → Completed → Coach Ack → Improvement Correlation` with sample `asb_events` row evidence and reducer-output snippet per stage.
- `docs/asb/organism-feedback-loop-ratification.md` — answers all 8 ratification questions (exposure, engagement, drill assigned/started/completed, coach ack, outcome correlation, blind spots) with evidence, plus feedback-loop completeness % and verdict.
- `docs/asb/reality-feedback-ledger.md` — update RFL-008, RFL-009, RFL-010 to `CLOSED` with producer `file:line` + consumer `file:line` evidence per existing Wave-1 format. Append-only; no row deletions.

## Verification

- Sample `asb_events` row per topic via `supabase--read_query` after first emission.
- Refresh / multi-device determinism check: same `(athlete_id, topic, occurred_at-bucket, payload)` produces same `idempotency_key` and hits 23505 dedupe path (already proven in Wave-1 ratification).
- Reducer-output snippet showing all stages populated from canonical events.

## Out of Scope

- Recommendation ranking, scoring, ordering, or content changes.
- Hammer / onboarding / recruiting / athlete-state / drill catalog mutations.
- New tables, columns, RLS policies, edge functions, or AI calls.
- RFL-001…RFL-007 (already CLOSED).

## Final Return

Recommendation Event Registry · Closed-gap report (RFL-008/009/010 CLOSED with evidence) · Recommendation lineage audit (PASS/FAIL per stage) · Feedback-loop completeness % · Remaining observability gaps (expected: none) · Recommended next reality-driven optimization sprint, selected from highest-severity row in the post-emission ledger (likely the first real Day-1 drop-off pattern observed once events flow).
