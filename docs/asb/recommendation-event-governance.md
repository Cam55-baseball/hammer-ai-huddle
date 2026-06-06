# Recommendation Event Governance (Wave-2)

**Sprint:** Recommendation Lifecycle Canonical Emission
**Posture:** Observation-only. Topics are interpretive observability events. They **never** author `organism_truth`, `athlete_intent`, `authority_override`, `hard_stop`, or `rehabilitation_state`. Subordinate to all sealed invariant families.
**Engine pin:** `engine_version = asb-1.0.0` (canonical, write-time).
**Idempotency rule:** `idempotency_key = sha256(athlete_id | topic_id | time_material | canonical(payload))` per `src/lib/asb/engineVersion.ts` + `src/hooks/useEmitObservability.ts`. `time_material` = `"lifetime"` for one-shot lifecycle topics, UTC-midnight ISO for day-bucketed view/open topics, raw ISO otherwise.

## Wave-2 canonical topic registry

| Topic | Producer (file:line) | Bucket | Actor role | Payload | Replay lineage |
|---|---|---|---|---|---|
| `foundation.recommendation.shown` | `src/components/video-library/FoundationsShelf.tsx:52` (inside the existing `useEffect` that inserts into `foundation_video_outcomes`) | UTC-day per `(athlete_id, recommendation_id)` | athlete | `{recommendation_id, surface: "foundations_shelf", triggers}` | `asb_events` row + parallel `foundation_video_outcomes` insert (legacy, kept) |
| `foundation.recommendation.opened` | `src/components/video-library/FoundationsShelf.tsx:91` (inside `open(videoId)`) | UTC-day per `(athlete_id, recommendation_id)` | athlete | `{recommendation_id, surface: "foundations_shelf"}` | `asb_events` row + `foundation_video_outcomes.clicked_at` (legacy) |
| `foundation.recommendation.completed` | `src/hooks/useDrillAssignments.ts:180` (success branch of `useCompleteAssignment`, drill sub-channel) | UTC-day per `(athlete_id, recommendation_id)` | athlete | `{recommendation_id, source: "drill_assignment", assignment_id}` | `asb_events` + `drill_assignments.completed_at` |
| `foundation.recommendation.coach_ack` | `src/components/coach/PieV2HammerBriefPanel.tsx:144` (explicit Acknowledge button) | lifetime per `(athlete_id, coach_id, recommendation_id, payload)` | coach | `{recommendation_kind: "hammer_brief", recommendation_id, coach_id, engine_version}` | `asb_events` row — sole canonical channel |
| `foundation.drill.assigned` | `src/hooks/useDrillAssignments.ts:121` (`useAssignDrill` success) | UTC-day per `(athlete_id, drill_id)` | coach | `{drill_id, recommendation_id, has_notes}` | `asb_events` + `drill_assignments` insert |
| `foundation.drill.started` | `src/hooks/useDrillAssignments.ts:149` (pre-update of `useCompleteAssignment`) | UTC-day per `(athlete_id, drill_id, assignment_id)` | athlete | `{drill_id, recommendation_id, assignment_id}` | `asb_events` row |
| `foundation.drill.completed` | `src/hooks/useDrillAssignments.ts:170` (post-success of `useCompleteAssignment`) | UTC-day per `(athlete_id, drill_id, assignment_id)` | athlete | `{drill_id, recommendation_id, assignment_id}` | `asb_events` + `drill_assignments.completed_at` |

## Producer contract

All seven topics route through the shared `emitObservability(input)` / `useEmitOnce(key, input)` surface in `src/hooks/useEmitObservability.ts`:

- Builds canonical `AsbEmitRow` and inserts via `emitAsbEvent` (`src/lib/asb/emit.ts`).
- `engine_version` pinned to `asb-1.0.0` at write-time.
- Deterministic `idempotency_key`; Postgres `23505` unique-violation is a **dedupe path**, not failure.
- Never throws, never blocks render.

## Consumer

`src/lib/observability/recommendationFunnel.ts` exposes `computeRecommendationEffectivenessFromEvents(events: AsbEventLike[])`. Single pure projection — groups by `payload.recommendation_id`, counts per topic, derives open / completion / repeat rates, surfaces missingness per stage. Legacy `computeRecommendationEffectiveness(traces, outcomes, acks)` retained for back-compat over `foundation_recommendation_traces` rows.

## Replay & idempotency strategy

| Topic | `time_material` | Dedupe scope |
|---|---|---|
| `foundation.recommendation.shown` | UTC midnight | one canonical row per athlete × recommendation × day |
| `foundation.recommendation.opened` | UTC midnight | one canonical row per athlete × recommendation × day |
| `foundation.recommendation.completed` | UTC midnight | one canonical row per athlete × recommendation × day |
| `foundation.recommendation.coach_ack` | `"lifetime"` | one canonical row per (athlete, coach, recommendation, payload) ever |
| `foundation.drill.assigned` | UTC midnight | one canonical row per athlete × drill × day |
| `foundation.drill.started` | UTC midnight (assignment_id in payload) | one row per assignment per day |
| `foundation.drill.completed` | UTC midnight (assignment_id in payload) | one row per assignment per day |

Refresh, multi-tab, and multi-device replays converge on the same key and are absorbed by the server-side `UNIQUE(idempotency_key)` constraint on `asb_events`. Session-scoped `sessionStorage` guard in `useEmitOnce` avoids pointless round-trips.

## Constitutional bounds

- Topics never write organism truth, never feed ranking, never influence recommendation ordering (RR-9, mirrors `src/lib/videoConversionAnalytics.ts`).
- Coach ack is **intentional only** — never page renders, never mount-time.
- `engine_version` is constant `asb-1.0.0`; observability schema lock (Phase 61 SG-C4) holds — no dimension added/removed.
- Missingness preserved (Phase 60 FC, Phase 61 SG): video-watched-to-threshold sub-channel remains table-derived; the canonical-events projection exposes it via `missingness.video_watched = true` rather than smoothing.

## Evidence verification

After first production traffic:

```sql
select topic_id, count(*), min(occurred_at), max(occurred_at)
from asb_events
where topic_id like 'foundation.%'
group by topic_id
order by topic_id;
```

Refresh-determinism check:

```sql
select idempotency_key, count(*) from asb_events
where topic_id like 'foundation.%'
group by 1 having count(*) > 1;
-- expected: 0 rows (UNIQUE constraint guarantees this)
```
