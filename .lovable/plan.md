# Athlete Dashboard Intelligence Surface v1

Backlog item #1. Product execution against the **locked** ASB substrate. Additive-only — no schema, no doctrine, no parallel ledger, no fabricated scores.

## 1. Scope & Non-Goals

**In scope:** new athlete command-center route reading exclusively from `asb_events`, `asb_event_lineage`, `asb_state_snapshots`, plus already-wired foundation/behavioral tables as supplementary raw source. Confidence + missingness always visible. Every card lineage-drillable to `/replay/:eventId` in one click.

**Out of scope:** schema changes, new edge functions, edits to existing `/dashboard`, derived score authoring, smoothing/imputation, retries, aggregations that hide lineage.

## 2. Route Structure

- `/command` — new athlete intelligence surface (does NOT replace `/dashboard`).
- Sidebar entry "Command Center" added for athletes only.
- Existing `/timeline` and `/replay/:eventId` are the drilldown destinations — no new replay routes.

## 3. Component Map

```text
src/pages/AthleteCommand.tsx                 # route shell, mobile-first, single-column
src/components/command/
  TodayOverviewHeader.tsx                    # date, engine_version chip, last-event timestamp
  ReadinessCard.tsx                          # latest behavioral.readiness.* event
  FatigueCard.tsx                            # latest behavioral.fatigue.* event
  WorkloadCard.tsx                           # rolling 7d count + intensity from athlete.schedule.day_type
  RecoveryCard.tsx                           # latest behavioral.recovery.* / foundation.recovery.*
  BehavioralRegulationCard.tsx               # latest behavioral.regulation.* / pattern.*
  SchedulingLoadCard.tsx                     # next 7d day_type counts by event_type
  TrendShiftsCard.tsx                        # diff of last vs prior snapshot per topic family
  EscalationFlagsCard.tsx                    # foundation.pattern.* + behavioral risk topics, last 72h
  RecentEventsPreview.tsx                    # last 8 ASB events, link → /replay/:eventId
  IntelligenceCardShell.tsx                  # shared chrome: confidence pill, missingness chip,
                                             #   EngineVersionBadge, "View lineage" CTA, empty state
  ConfidencePill.tsx                         # reads canonical paths only (same as EventCard)
  MissingnessChip.tsx                        # explicit "no signal" / "stale >Nh" / "n/a"
  LineageDrilldownButton.tsx                 # → /replay/:eventId for the source event
```

All cards compose `IntelligenceCardShell`; that shell is the only place chrome lives.

## 4. Data Flow (read-only projection layer)

```text
asb_events  ──┐
              ├─►  src/lib/command/projections.ts  (pure functions, no writes)
asb_event_   ─┤      • latestByTopicPrefix(rows, "behavioral.readiness")
lineage       │      • windowCount(rows, prefix, days)
              │      • scheduleByDay(rows, days)
asb_state_   ─┤      • trendDelta(latest, prior)
snapshots     │      • escalationFeed(rows, hours)
              │      Each returns: { sourceEventId, confidence|null,
foundation/  ─┘                       missingness|null, value, occurredAt }
behavioral    
tables (read) 
```

**Hooks** (all React Query, keyset-friendly, additive):

```text
src/hooks/command/
  useAthleteLatestByTopic.ts        # SELECT … ORDER BY occurred_at DESC LIMIT 1, per prefix
  useAthleteRecentEvents.ts         # reuses useAsbTimeline (pageSize 8)
  useAthleteSnapshot.ts             # asb_state_snapshots latest row (read-only)
  useAthleteLineageEdge.ts          # single-hop parent lookup via asb_event_lineage
  useAthleteScheduleWindow.ts       # day_type events in [today, today+7]
  useAthleteEscalations.ts          # foundation.pattern.* + behavioral risk topics, 72h
```

No hook writes. No hook fabricates a value when source is missing — it returns `{ value: null, missingness: "no_signal" }`.

## 5. UI Hierarchy (mobile-first, 819×531 baseline)

```text
<AthleteCommand>
  <TodayOverviewHeader />                              # sticky, h-14
  <section "Today">                                    # 1-col mobile, 2-col ≥md
    <ReadinessCard /> <FatigueCard />
    <WorkloadCard /> <RecoveryCard />
  </section>
  <section "Behavior & Schedule">
    <BehavioralRegulationCard />
    <SchedulingLoadCard />
  </section>
  <section "Signals">
    <TrendShiftsCard />
    <EscalationFlagsCard />                            # red border iff items present
  </section>
  <section "Recent activity">
    <RecentEventsPreview />                            # last 8, link → /replay/:id
  </section>
</AthleteCommand>
```

Every card footer: `Confidence · Missingness · engine_version · [View lineage →]`.

## 6. Required Hooks/Selectors Contract

```ts
type CardProjection<T> = {
  value: T | null;
  sourceEventId: string | null;          // → /replay/:eventId
  occurredAt: string | null;
  confidence: number | null;             // canonical paths only
  missingness: "no_signal" | "stale" | "partial" | null;
  engineVersion: string | null;
  topicId: string | null;
};
```

Selectors never throw, never default to 0, never average across topics. If no source event → `value=null`, `missingness="no_signal"`, lineage button disabled with tooltip "No source event yet".

## 7. Performance Considerations

- One Supabase round-trip per topic family on mount; React Query cached 30s.
- `useAthleteRecentEvents` shares the existing `useAsbTimeline` cache key.
- Cards render skeletons via existing `DashboardModuleSkeleton` pattern.
- No N+1: lineage edge fetched only on drilldown click (lazy).
- Code-split: `AthleteCommand.tsx` via `React.lazy` in `App.tsx`.

## 8. Mobile Considerations

- Single-column ≤640px; cards full-bleed with 16px gutter.
- Sticky header collapses to 48px on scroll.
- Tap targets ≥44px; "View lineage" is a full-width footer button on mobile.
- Escalation section auto-scrolls into view when items > 0.
- No horizontal scroll; trend/diff numbers truncate with tooltip.

## 9. Design Tokens

Reuses existing semantic tokens from `index.css` (`--background`, `--card`, `--primary`, `--destructive` for escalations, `--muted-foreground` for missingness). No new colors. Escalation card uses `border-destructive/40 bg-destructive/5`.

## 10. Acceptance Criteria

1. `/command` renders for an authenticated athlete; redirects to `/auth` otherwise.
2. Every card reads from `asb_events` / `asb_event_lineage` / `asb_state_snapshots` (or already-wired foundation/behavioral tables) — verified by grep: no card imports a non-ASB derived store.
3. Each card displays confidence (or "—" when null) and missingness chip (or "live" when null).
4. Each card's "View lineage" button navigates to `/replay/:sourceEventId`; disabled with tooltip when null.
5. `EngineVersionBadge` visible on every card footer when an event exists.
6. Empty ledger state: cards show "No source event yet" — no fabricated numbers, no spinners stuck.
7. No writes to `asb_events` from this surface (grep: no `.insert`/`.upsert`/`.update` against `asb_events` in `src/pages/AthleteCommand.tsx` or `src/components/command/**`).
8. Recent events preview links each row to `/replay/:eventId`.
9. Escalation section only visible when items exist; uses destructive border.
10. Lighthouse mobile perf ≥ existing `/dashboard` baseline; initial JS payload code-split.

## 11. Constraints Carried From Freeze

Additive-only. No schema rewrites. No new doctrine. No replay-authoring. No hidden retries. No silent mutation. No parallel ledger. No new edge functions.

## 12. Build Order (post-approval)

1. `IntelligenceCardShell` + `ConfidencePill` + `MissingnessChip` + `LineageDrilldownButton`.
2. `src/lib/command/projections.ts` pure selectors + unit-shaped tests via existing patterns.
3. Hooks under `src/hooks/command/`.
4. Cards (Readiness → Fatigue → Workload → Recovery → Behavioral → Schedule → Trend → Escalation → Recent).
5. `AthleteCommand.tsx` route + lazy-load in `App.tsx` + sidebar link in `AppSidebar.tsx`.
6. Manual smoke against current (empty) ledger to verify empty-state correctness.
