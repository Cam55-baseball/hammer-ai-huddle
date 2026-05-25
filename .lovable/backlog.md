# ASB Product Execution Backlog

Post-freeze. All work below is implementation against the locked substrate
(`asb_events`, `asb_event_lineage`, `useReplayCertification`, `useAsbTimeline`,
`emitAsbEvent`, `ENGINE_VERSION="asb-1.0.0"`). No architecture changes, no
new ledgers, no doctrine.

## Priority order

1. **Athlete dashboard intelligence surface v1**
   - Readiness / fatigue / load cards reading from `asb_events` projections.
   - Confidence + missingness visible on each card.
   - "View lineage" → `/replay/:eventId` one click away.

2. **Timeline/replay UX refinement**
   - Topic-family filters (`athlete.*`, `behavioral.*`, `foundation.*`, `analytics.*`).
   - Lineage breadcrumbs in `/replay/:eventId`.
   - Copyable replay handle (`event_id + engine_version`).
   - `EngineVersionBadge` everywhere a derived view renders.

3. **Coach roster monitoring**
   - Multi-athlete dashboard.
   - Day-type heatmap from `athlete.schedule.day_type` events.
   - Escalation flags from `behavioral.*` topics.

4. **Notification / escalation infrastructure**
   - Rule-driven push/email on `behavioral.*` and `foundation.pattern.*` topics.
   - Subscriptions in user preferences; delivery audited.

5. **Onboarding flow**
   - Athlete first-run: profile → schedule → first canonical event emitted.
   - Verifies producer path E2E for every new user.

6. **Wearable / sensor adapter v1**
   - Single vendor (Apple Health or Garmin).
   - Emits `sensor.*` topics via existing `emitAsbEvent`.
   - No smoothing, no imputation — raw samples with missingness preserved.

7. **Performance intelligence delivery**
   - Weekly digest derived from ledger, every claim lineage-cited.

8. **Recruiter / scout intelligence surface**
   - Read-only athlete cards.
   - Every metric links to `/replay/:eventId`.

9. **Mobile execution surfaces**
   - Responsive pass on dashboard + timeline + replay.

10. **Forecast / scenario surfaces**
    - Bounded projection cards.
    - Read-only, replay-cited, never authoritative.

## Carried constraints

- No schema changes beyond additive, RLS-correct migrations.
- No new edge functions unless a producer requires it.
- No retries, no smoothing, no parallel ledgers.
- Every new producer uses `emitAsbEvent` from `src/lib/asb/emit.ts`
  or the edge-shared `supabase/functions/_shared/asbEmit.ts`.
- Every new consumer reads through `useAsbTimeline` / `useReplayCertification`
  patterns — no direct ad-hoc queries that bypass `engine_version` pinning.

## Backlog hygiene

Each item above will be opened as its own plan when scheduled. No work begins
from this file directly.
