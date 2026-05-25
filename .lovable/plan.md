# Backlog #3 — Coach Roster Monitoring + Organizational Intelligence Surface v1

Transition: single-athlete operating loop → organizational organism visibility. **Read-only projection layer** over the locked ASB substrate. No new intelligence engine, no parallel ledger, no fabricated scores.

## 1. Route Map

- `/coach` — Roster overview (RosterGrid, EscalationQueue, MissingSignalQueue, WorkloadContinuityPanel, RecentBehavioralFeed)
- `/coach/athlete/:athleteId` — Single-athlete coach drilldown (reuses Command cards in read-only mode, scoped to that athlete)
- Reuse: `/timeline?athleteId=...` and `/replay/:eventId` (already lineage-canonical)
- Sidebar: add "Coach Console" entry, gated by `useCoachRoster().size > 0` OR explicit coach role.

Existing `/coach` page (`CoachDashboard.tsx`) is the legacy training/messaging surface — we add a new sibling route `/coach/console` to avoid disturbing it, and link both ways. (Final naming TBD during build; default plan: new route is `/coach/console`.)

## 2. Organizational / RLS Model

Reuse existing structures — **no new identity system**. Roster resolution order (additive, no schema rewrites):

1. `organization_members` (coach + athletes in same org, `status='active'`)
2. `profiles.primary_coach_id` / `secondary_coach_ids` (already in schema)
3. `scout_follows` with `relationship_type='linked'` and `status='accepted'` (mirrors `useCoachPlayerPool`)

Union → de-dup by `athlete_id` → set of `{ athlete_id, source, display_name, avatar_url }`.

**RLS:** `asb_events` is already RLS-scoped per athlete. We need a coach-read policy. Smallest additive change:

```sql
-- security definer helper
create or replace function public.is_coach_of(_coach uuid, _athlete uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = _athlete
      and (_coach = p.primary_coach_id or _coach = any(coalesce(p.secondary_coach_ids,'{}')))
  ) or exists (
    select 1 from public.organization_members om1
    join public.organization_members om2 on om1.organization_id = om2.organization_id
    where om1.user_id = _coach and om2.user_id = _athlete
      and om1.status='active' and om2.status='active'
  ) or exists (
    select 1 from public.scout_follows sf
    where sf.scout_id = _coach and sf.player_id = _athlete
      and sf.status='accepted' and sf.relationship_type='linked'
  );
$$;

-- additive RLS policy on asb_events
create policy "coach_can_read_roster_events" on public.asb_events
for select using (public.is_coach_of(auth.uid(), athlete_id));
```

Same pattern for `notification_acks` (so coach can see whether an athlete already acknowledged an escalation). No writes granted; coach role is strictly SELECT.

## 3. Data Flow

```text
useCoachRoster()  ──► [athlete_ids]
       │
       ▼
useCoachRosterRows({athleteIds, days:14, limit:2000})
       │  single SELECT from asb_events WHERE athlete_id = ANY(...)
       ▼
projections (pure, per-athlete bucketed)
       │
       ├─► RosterGrid     (latest readiness/fatigue/workload per athlete + missingness)
       ├─► EscalationQueue (foundation.pattern.*, behavioral.escalation.*, behavioral.risk.*)
       ├─► MissingSignalQueue (athletes with 0 events in N hours, or stale topics)
       ├─► WorkloadContinuityPanel (analytics.* + foundation.* density per athlete)
       └─► RecentBehavioralFeed (behavioral.* tail, lineage-bound)
```

One query, fan-out projection. Mirrors the `useAthleteCommandRows` pattern but multi-athlete.

## 4. Component Map

```
src/pages/CoachConsole.tsx                    — page shell, tabs
src/pages/CoachAthleteDetail.tsx              — /coach/athlete/:athleteId
src/components/coach-console/
  RosterGrid.tsx
  AthleteStatusCard.tsx        — uses ConfidencePill, MissingnessChip, lineage CTA
  EscalationQueue.tsx
  EscalationRow.tsx            — links to /replay/:eventId
  MissingSignalQueue.tsx
  MissingSignalRow.tsx
  WorkloadContinuityPanel.tsx
  RecentBehavioralFeed.tsx
  ReplayDrilldownCTA.tsx       — shared
  RosterEmptyState.tsx
  CoachConsoleHeader.tsx       — counts: roster N, escalations N, stale N
src/components/command/        — reuse ConfidencePill, MissingnessChip, EngineVersionBadge
```

## 5. Hook Architecture

```
src/hooks/coach/
  useCoachRoster.ts            — unions org/primary/secondary/follows → athlete[]
  useCoachRosterRows.ts        — one SELECT, returns AsbEventRow[]
  useRosterProjection.ts       — bucket rows by athlete_id, run projections
  useEscalationQueue.ts        — filter rows by escalation topic_ids + ack overlay
  useMissingSignalQueue.ts     — derive { athlete, missing_topic, last_seen_at }
  useWorkloadContinuity.ts     — per-athlete event density windows (no smoothing)
```

All read-only. All return `{ data, isLoading, error }`. None write to `asb_events`.

Projections live in `src/lib/coach/projections.ts` reusing primitives from `src/lib/command/projections.ts` (`projectLatest`, `windowCount`, `extractConfidence`, `extractMissingness`, `isStale`). **No new projection semantics** — multi-athlete bucketing only.

## 6. Missingness Model (first-class)

Per athlete, per topic, classify into:

- `no_signal` — topic never emitted in window
- `stale` — last event > threshold (readiness: 36h, workload: 7d, behavioral: 14d)
- `partial` — payload missing expected field (already encoded by `extractMissingness`)
- `ok` — fresh, complete

`MissingSignalQueue` surfaces only `no_signal` and `stale`. Each row carries `{ athlete_id, topic_id, last_seen_at | null, reason }` and a deep link to `/coach/athlete/:athleteId`. **Never imputed, never smoothed, never defaulted to 0.**

## 7. Escalation Flow

Topics that surface in EscalationQueue (additive list — no new topics emitted):

- `foundation.pattern.*`
- `behavioral.escalation.*`
- `behavioral.risk.*`
- any event with `payload.severity in ('high','critical')`

Per row: athlete name, topic, occurred_at, confidence pill, missingness chip, `EngineVersionBadge`, **"Open in replay" → /replay/:eventId** (canonical), and "Open athlete → /coach/athlete/:athleteId".

Coach acknowledgement: append to existing `notification_acks` with `actor_role='coach'`, `event_id=<source>`. Overlay filters acked rows out of the active queue but keeps them visible under an "Acknowledged" tab. **No new fabricated urgency, no priority scores.** Ordering: `occurred_at DESC` only.

Notification dispatch reuses the existing `send-email`/`send-push` path from Backlog #4+5, gated by coach-side `notification_preferences` rows (`actor_role='coach'`). Payload always carries `event_id`, `athlete_id`, `engine_version`, `confidence`, `missingness`, `replay_url`. No mutation of athlete-side events.

## 8. Signal Philosophy (Enforcement)

- No aggregate "coach score" — RosterGrid shows discrete topic projections only.
- No ranking — sort is `occurred_at DESC` or `last_seen_at ASC` (for stale queue).
- No AI summaries — copy is deterministic template strings.
- Every visible insight carries `sourceEventId` and exposes a 1-click drill to `/replay/:eventId`.
- `ConfidencePill` and `MissingnessChip` mandatory on every projected cell.

## 9. Acceptance Criteria

1. A coach with 0 assigned athletes sees `RosterEmptyState` (no fabricated rows).
2. A coach with N athletes sees N rows in `RosterGrid`, each with the latest readiness/fatigue/workload projection or explicit missingness state.
3. Every escalation row links to a valid `/replay/:eventId` URL whose `event_id` equals the source.
4. Stale queue lists athletes with no events in the last 36h (readiness threshold) and never lists athletes with fresh events.
5. RLS denies `asb_events` SELECT for any athlete not in the coach's resolved roster (verified via direct DB query as a different coach).
6. No coach code path calls `INSERT`/`UPDATE`/`DELETE` on `asb_events`, `notification_acks` (except append-only ack insert), or any ledger table.
7. ConfidencePill renders `n/a` (not `0`) when confidence is null. MissingnessChip renders `no signal` when `no_signal`.
8. `/coach/athlete/:athleteId` reuses existing Command cards but renders in read-only mode (no onboarding redirect, no first-event prompts).
9. Coach notification opt-in only dispatches notifications for events in `is_coach_of` roster.
10. Mobile (≤640px): RosterGrid collapses to single-column cards; queues become stacked accordions; replay CTA remains 1-tap reachable.

## 10. Verification Matrix

| # | Check | Method |
|---|-------|--------|
| 1 | Roster union correct | Unit: mock org/primary/follows, assert dedup |
| 2 | RLS coach-read | psql as coach A, query athlete B not in roster → 0 rows |
| 3 | RLS denies write | psql as coach, attempt UPDATE asb_events → denied |
| 4 | One SELECT for grid | Network tab: single asb_events query for /coach |
| 5 | Lineage 1-click | Click any cell → URL matches `/replay/<event_id>` |
| 6 | Missingness fidelity | Insert athlete with stale readiness → appears in MissingSignalQueue |
| 7 | No imputation | Athlete with null payload.value → UI shows `n/a`, not `0` |
| 8 | Escalation filter | Only listed topic prefixes appear in queue |
| 9 | Ack append-only | Click ack → row inserted, never updated |
| 10 | Notification scoping | Coach pref on, athlete outside roster emits event → no dispatch |
| 11 | Mobile reflow | Viewport 375px: no horizontal scroll, CTAs reachable |
| 12 | grep guard | `rg "from\\('asb_events'\\)" src/hooks/coach src/components/coach-console` → only `.select(`, never insert/update/delete |

## 11. Mobile Considerations

- Roster grid: 1-col ≤640px, 2-col ≤1024px, 3-col >1024px.
- Sticky header with `EscalationCount` + `StaleCount` chips.
- Queues use accordion pattern to keep first-screen actionable.
- Replay CTA is always full-row tappable on mobile (min 44px target).
- No tooltips behind hover — confidence/missingness expose details on tap.

## 12. Build Order

1. **Migration** — `is_coach_of(uuid,uuid)` + `coach_can_read_roster_events` policy on `asb_events` + matching SELECT policy on `notification_acks`. (supabase--migration; await approval.)
2. `src/hooks/coach/useCoachRoster.ts` — union resolver.
3. `src/hooks/coach/useCoachRosterRows.ts` — single SELECT, 14-day window.
4. `src/lib/coach/projections.ts` — bucketByAthlete + reuse command primitives.
5. `src/hooks/coach/useRosterProjection.ts`, `useEscalationQueue.ts`, `useMissingSignalQueue.ts`, `useWorkloadContinuity.ts`.
6. Shared components: `ReplayDrilldownCTA`, `AthleteStatusCard`, `RosterEmptyState`.
7. `RosterGrid`, `EscalationQueue`, `MissingSignalQueue`, `WorkloadContinuityPanel`, `RecentBehavioralFeed`.
8. `src/pages/CoachConsole.tsx` (route `/coach/console`).
9. `src/pages/CoachAthleteDetail.tsx` (route `/coach/athlete/:athleteId`) — reuse Command cards with `athleteIdOverride` prop (smallest additive change to existing card hooks).
10. Wire routes in `src/App.tsx` (lazy).
11. Sidebar entry in `AppSidebar.tsx`, gated on roster size or coach role.
12. Coach-side `notification_preferences` row (`actor_role='coach'`) honored by existing dispatcher; add coach filter (`is_coach_of`) before dispatch.
13. Verification: run matrix #1–#12, fix gaps, then close.

## Constraints (enforced)

Additive-only · no schema rewrites · no new doctrine · no replay-authoring · no hidden retries · no sensor work · no parallel ledger · no detached analytics warehouse · no aggregate coach score · no AI summaries · every surface lineage-drillable in one click.
