# Backlog #6 — Performance Intelligence Delivery + Weekly Organism Digest v1

Deterministic, lineage-cited delivery layer over the sealed ASB ledger. Read-only. Additive-only. No schema changes. No generative prose. No fabricated forecasts.

## Scope

Three new routes, no existing route replaced:
- `/digest` — Athlete weekly organism digest
- `/coach/digest` — Organizational digest (no rankings)
- `/forecast` — Bounded athlete projection surface

## Route Map

```text
/digest              → AthleteDigest.tsx       (auth: athlete self)
/coach/digest        → CoachDigest.tsx         (gated by useCoachRoster().size > 0)
/forecast            → ForecastSurface.tsx     (auth: athlete self)
```

Sidebar: add "Weekly Digest" + "Forecast" under athlete section; add "Org Digest" under existing Coach Console section.

## Component Map

```text
src/pages/
  AthleteDigest.tsx
  CoachDigest.tsx
  ForecastSurface.tsx

src/components/digest/
  WeeklyDigestHeader.tsx        (window picker: this week / last week, engine_version badge)
  OrganismChangeCard.tsx        (event-count delta vs prior 7d)
  WorkloadShiftCard.tsx         (scheduled-day delta)
  EscalationResolutionCard.tsx  (emerged / persisted / resolved counts)
  BehavioralTrendCard.tsx       (topic-frequency delta, behavioral.*)
  RecoveryContinuityCard.tsx    (recovery.* event-density delta)
  MissingSignalCard.tsx         (no_signal / stale topics in window)
  DigestTimelineStrip.tsx       (horizontal canonical-event spine)
  DigestReplayCTA.tsx           (1-click → /replay/:eventId, reuses ReplayDrilldownCTA)
  DigestEmptyState.tsx          ("No organism history yet.")

src/components/forecast/
  ForecastWindowCard.tsx        (continuation window)
  ProjectionConfidenceCard.tsx  (confidence + missingness)
  ForecastBoundaryCard.tsx      (renders "Bounded projection — not deterministic future state.")
  ForecastSourceStrip.tsx       (sourceEventIds list, all drillable)
```

Reuses existing primitives: `ConfidencePill`, `MissingnessChip`, `IntelligenceCardShell`, `LineageDrilldownButton`, `EngineVersionBadge`, `EmptyStateExplainer`, `ReplayDrilldownCTA`.

## Data Flow

```text
asb_events ─┐
asb_event_lineage ─┤   single SELECT (14d window for digest, 21d for forecast)
asb_state_snapshots ─┤
notification_acks ─┘
                │
                ▼
   src/lib/digest/projections.ts   (pure, deterministic)
                │
                ▼
   src/hooks/digest/useDigestProjection.ts
   src/hooks/digest/useForecastProjection.ts
   src/hooks/digest/useCoachDigestProjection.ts (per-athlete bucket → org rollup)
                │
                ▼
   Cards render structured strings only
```

No writes. No AI calls. No edge functions. No new tables.

## Deterministic Selector Contract

All selectors in `src/lib/digest/projections.ts` return:

```ts
{
  value: number | string,
  delta: number | null,
  confidence: 'n/a' | 'low' | 'medium' | 'high',
  missingness: 'ok' | 'partial' | 'stale' | 'no_signal',
  sourceEventIds: string[],
  engineVersion: string | null,
}
```

Implemented:
- `compareWindowCounts(events, topicPrefix, currWindow, prevWindow)`
- `compareTopicFrequency(events, topicPrefix, currWindow, prevWindow)`
- `detectEscalationEmergence(events, currWindow)` — topics in `foundation.pattern.*`, `behavioral.escalation.*`, `behavioral.risk.*`
- `detectEscalationResolution(events, currWindow, prevWindow)` — escalations in prior window absent in current
- `detectScheduleContinuityShift(events, currWindow, prevWindow)` — `athlete.schedule.*`
- `detectBehavioralTrendShift(events, currWindow, prevWindow)` — `behavioral.*`
- `boundedForecastWindow(events, horizonDays)` — continuation projection only
- `extractReplaySources(projection)` — flattens `sourceEventIds[]` for UI

No smoothing, no imputation, no defaults-to-zero certainty. When data is absent: `value=null`, `confidence='n/a'`, `missingness='no_signal'`.

## Sentence Builder

`src/lib/digest/sentences.ts` — pure mapping from projection → fixed templates only:

- `"Workload continuity {increased|decreased|unchanged} from {n} scheduled days to {m} scheduled days week-over-week."`
- `"No behavioral escalation topics detected in the last 7 days."`
- `"Recovery-related events {increased|decreased} compared to the prior 7-day window."`
- `"Behavioral escalation events unresolved for {h}h."`
- `"No recovery-related events observed in {d} days."`

Templates are constants. No string interpolation outside enumerated slots. Grep-guard test asserts no card calls an LLM client or a Lovable AI gateway.

## Forecast Rules

`/forecast` renders only:
- continuation windows (e.g. "Current workload continuity trend has persisted for {n} days")
- workload continuity projections
- missingness projections
- escalation persistence visibility

Each card displays the literal string `"Bounded projection — not deterministic future state."` via `ForecastBoundaryCard`. Forbidden topics (injury, psychological, scholarship, performance guarantees) have no selector and no card.

## Coach Digest Rules

Organizational rollup only:
- roster-wide escalation counts (emerged / persisted / resolved)
- stale signal counts
- workload continuity changes (org-level distribution, not per-athlete ranking)
- unresolved escalation visibility (list, sorted by event timestamp not by severity score)
- roster event-density changes

No "top athletes", no comparative scoring, no aggregate coach score. Each list row drills to `/coach/athlete/:athleteId` and to `/replay/:eventId`.

## RLS / Access

No migration. Reuses existing policies:
- athlete reads own `asb_events` (existing self-policy)
- coach reads roster `asb_events` (added in Backlog #3 via `is_coach_of`)

## Mobile Considerations

- Cards stack single-column < 768px; 2-col 768–1280; 3-col ≥ 1280.
- `DigestTimelineStrip` horizontally scrollable with snap on mobile.
- `WeeklyDigestHeader` window picker collapses to a `Select` on mobile.
- Replay CTAs remain tap-target ≥ 44px.
- Coach digest tables become stacked rows on mobile (label/value pairs).

## Performance

- One SELECT per surface, 14d (digest) / 21d (forecast) window, ordered by `occurred_at desc`, capped at 2k rows.
- Projections memoized via `useMemo` keyed on `(athleteId, windowEnd, rowCount)`.
- No realtime subscriptions on digest pages — explicit refresh button + react-query `staleTime: 5m`.

## Acceptance Criteria

1. `/digest` renders lineage-cited weekly organism summaries.
2. Every digest statement references ≥1 canonical `sourceEventId`.
3. `/forecast` renders bounded projections only; every card shows the boundary disclaimer.
4. Every forecast card exposes `confidence` + `missingness` pills.
5. No generative AI prose anywhere in `src/components/digest/**` or `src/components/forecast/**` (grep test: no imports from `@/lib/ai`, `openai`, `gemini`, no `supabase.functions.invoke` from these dirs).
6. When source data absent: `ConfidencePill` shows `n/a`, `MissingnessChip` shows `no signal`, no numeric fabrication.
7. Empty state renders `"No organism history yet."` via `DigestEmptyState`.
8. Coach digest contains no ranking UI, no sort-by-score, no per-athlete numeric score.
9. Every digest/forecast card exposes a 1-click `/replay/:eventId` link via `DigestReplayCTA`.
10. Zero writes to `asb_events` from any new file (grep test: no `.insert(` / `.update(` / `.delete(` against `asb_events` in new code).

## Verification Matrix

| # | Check | Method |
|---|---|---|
| 1 | Sentence templates exhaustive | Snapshot test on `sentences.ts` |
| 2 | Projections deterministic | Unit test: same input → same output |
| 3 | Missingness never collapses to certainty | Unit test: empty events → `confidence='n/a'` |
| 4 | Replay link present on every card | RTL test per card |
| 5 | No AI imports in digest/forecast | Grep CI guard |
| 6 | No writes to `asb_events` | Grep CI guard |
| 7 | Coach digest has no ranking | RTL: assert no `sort by score`, no per-athlete numeric badge |
| 8 | Forecast boundary disclaimer present | RTL: assert literal string on every forecast card |
| 9 | Mobile reflow at 375px | Manual + viewport screenshot |
| 10 | Single SELECT per surface | Network panel inspection |

## Build Order

1. `src/lib/digest/projections.ts` (pure selectors + types)
2. `src/lib/digest/sentences.ts` (fixed templates)
3. `src/hooks/digest/useDigestProjection.ts`, `useForecastProjection.ts`, `useCoachDigestProjection.ts`
4. Shared digest cards (`OrganismChangeCard`, `WorkloadShiftCard`, …)
5. `AthleteDigest.tsx` page + route + sidebar entry
6. `CoachDigest.tsx` page + route + sidebar entry (gated by roster)
7. Forecast components + `ForecastSurface.tsx` + route + sidebar entry
8. `DigestReplayCTA` wiring across all cards
9. Empty states + mobile layout pass
10. Verification sweep (grep guards + unit/RTL tests)

## Constraints Recap

Additive-only. No schema rewrites. No doctrine. No replay authoring. No AI summaries detached from lineage. No opaque scoring. No fabricated forecasts. Every visible statement traces to canonical ASB events via `sourceEventIds[]`.
