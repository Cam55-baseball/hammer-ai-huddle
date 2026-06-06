# Recommendation Lineage Audit

**Sprint:** Recommendation Lifecycle Canonical Emission
**Scope:** End-to-end PASS/FAIL trace from recommendation generation to outcome correlation, using canonical ASB events only.

## Pipeline

```text
Recommendation Generated
        │  (foundation engine: useFoundationVideos / recommendDrills)
        ▼
foundation.recommendation.shown        ◀── FoundationsShelf mount
        │
        ▼
foundation.recommendation.opened       ◀── FoundationsShelf.open()
        │
        ▼
foundation.drill.assigned              ◀── useAssignDrill (coach action)
        │
        ▼
foundation.drill.started               ◀── useCompleteAssignment (pre-update)
        │
        ▼
foundation.drill.completed             ◀── useCompleteAssignment (success)
foundation.recommendation.completed    ◀── useCompleteAssignment (success, drill sub-channel)
        │
        ▼
foundation.recommendation.coach_ack    ◀── PieV2HammerBriefPanel Acknowledge button
        │
        ▼
Improvement correlation                ◀── reducer projection (observational only)
```

## Stage-by-stage audit

| Stage | Topic | Producer | Consumer | Status | Evidence |
|---|---|---|---|---|---|
| 1. Generated | (engine, not emitted — internal computation) | `useFoundationVideos`, `recommendDrills` | n/a | PASS | code refs in `src/hooks/useFoundationVideos.ts`, `src/lib/pieV2/recommendDrills.ts` |
| 2. Shown | `foundation.recommendation.shown` | `FoundationsShelf.tsx:52` | `recommendationFunnel.ts::computeRecommendationEffectivenessFromEvents` | PASS | canonical emission via `emitObservability` |
| 3. Opened | `foundation.recommendation.opened` | `FoundationsShelf.tsx:91` | reducer | PASS | canonical emission |
| 4. Drill Assigned | `foundation.drill.assigned` | `useDrillAssignments.ts:121` | reducer | PASS | canonical emission post-insert |
| 5. Drill Started | `foundation.drill.started` | `useDrillAssignments.ts:149` | reducer | PASS (coarse) | coarse signal — bounded by single-tap UI, documented |
| 6. Drill Completed | `foundation.drill.completed` | `useDrillAssignments.ts:170` | reducer | PASS | canonical emission post-update |
| 6b. Recommendation Completed | `foundation.recommendation.completed` | `useDrillAssignments.ts:180` (drill sub-channel) | reducer | PASS (drill) / PARTIAL (video) | drill-side canonical; video terminal completion deferred — exposed via `missingness.video_watched=true` |
| 7. Coach Acknowledged | `foundation.recommendation.coach_ack` | `PieV2HammerBriefPanel.tsx:144` | reducer | PASS | explicit-action only; lifetime dedupe |
| 8. Improvement Correlation | (reducer-derived) | n/a | reducer | PASS (observational) | open/completion/repeat rates per Phase 57 AE-1 bounded adaptation, no causal claim |

## Replay equivalence check

Per Phase 56 RE-1…RE-10, every stage is replay-reconstructable from `asb_events` rows alone:

```sql
select event_id, topic_id, athlete_id, actor_role, occurred_at,
       payload->>'recommendation_id' as rec_id, engine_version, idempotency_key
from asb_events
where topic_id like 'foundation.%'
order by athlete_id, payload->>'recommendation_id', occurred_at;
```

Output is sufficient input to fully reproduce the reducer output via `computeRecommendationEffectivenessFromEvents`.

## Verdict

**PASS** — recommendation lifecycle is fully canonical from shown through coach_ack. Improvement correlation remains observational (no causal claim, RR-9 compliant). Video terminal-watch sub-channel surfaced as known missingness (not smoothed).
