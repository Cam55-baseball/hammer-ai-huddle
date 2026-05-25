# Backlog #4 + #5 — Athlete Daily Operating Loop v1

Transition the sealed ASB substrate into a daily athlete loop:
**onboarding → first canonical emit → /command populates → escalation visible → /replay drilldown → return tomorrow**.

Strict constraints: additive-only, no schema rewrites, no new doctrine, no replay-authoring, no smoothing/imputation, no parallel ledgers, no fabricated scores, no AI summaries detached from lineage, no sensor work.

---

## 1. Route structure

- `/onboarding/athlete` (new) — guided first-run flow, athlete-only, gated by "has emitted ≥1 canonical athlete event ever".
- `/command` (existing) — gains empty-state collapse + escalation banner.
- `/timeline`, `/replay/:eventId` (existing) — unchanged; just become reachable from onboarding success + escalation surfaces.
- `/settings/notifications` (new, small) — opt-in toggles for in-app / email / push; reads/writes a single additive `notification_preferences` row.

`App.tsx` adds two lazy routes. Athlete sidebar gets "Notifications" leaf under settings.

## 2. Component map

```text
onboarding/
  AthleteOnboardingShell.tsx          // stepper chrome, progress, exit-disabled until min step
  steps/
    WelcomeStep.tsx                   // explains organism / lineage in 3 lines
    ConfirmProfileStep.tsx            // reads existing profile; no rewrites
    ScheduleTodayStep.tsx             // pick day_type → triggers first canonical emit
    FirstEventConfirmStep.tsx         // shows the just-emitted event_id + "view in replay"
    NotificationsOptInStep.tsx        // optional; writes notification_preferences
    DoneStep.tsx                      // CTA to /command

command/
  EmptyStateExplainer.tsx             // per-card unlock copy ("Log a schedule day to unlock readiness")
  EscalationBanner.tsx                // sticky banner when unacked escalations exist
  NotificationBell.tsx                // header dropdown listing escalation inbox

notifications/
  NotificationsPreferencesPanel.tsx
  EscalationInboxList.tsx
  EscalationInboxItem.tsx             // lineage chip + "open replay" link
```

Existing intelligence cards gain `emptyExplainer={...}` prop instead of generic empty text.

## 3. Hooks / selectors

All read-only; reuse the locked substrate. **No new edge functions.**

- `useAthleteOnboardingState()` — derives `{ hasProfile, hasFirstEvent, hasNotificationsPref }` purely from existing queries (`profiles`, `asb_events` count, `notification_preferences`). Determines whether to redirect first-time athletes to `/onboarding/athlete`.
- `useEmitScheduleDayType()` — thin wrapper around existing `athlete.schedule.day_type` producer path; returns `{ eventId, occurredAt }` so onboarding can deep-link into `/replay/:eventId`.
- `useEscalationFeed({ withinHours = 72 })` — filters `useAthleteCommandRows` rows by `foundation.pattern.*` + `behavioral.escalation.*` + `behavioral.risk.*` (already enumerated in `EscalationFlagsCard`). Adds `acknowledged_at` overlay from a new lightweight `notification_acks` table.
- `useNotificationPreferences()` / `useUpdateNotificationPreferences()` — single row per athlete.
- `useDispatchPendingNotifications()` — client-side fan-out **only for in-app**; calls existing `send-email` / `send-push` edge functions for opted-in channels with a payload referencing `event_id`, `engine_version`, `confidence`, `missingness`. No new orchestration ledger.

Selectors all live in `src/lib/command/projections.ts` (extended) — pure functions, no IO.

## 4. Notification event flow

```text
asb_events insert (existing producer)
        │
        ▼
useEscalationFeed (client query, 30-day window)
        │
        ├──► EscalationBanner / NotificationBell  (always, in-app)
        │
        └──► useDispatchPendingNotifications
                 │  (only if preferences.email/push enabled
                 │   AND row not already in notification_acks as "dispatched")
                 ▼
              send-email / send-push edge fn
                 │  payload = { event_id, topic_id, occurred_at,
                 │              engine_version, confidence, missingness,
                 │              replay_url: "/replay/<event_id>" }
                 ▼
              notification_acks insert { event_id, channel, dispatched_at }
```

Every notification is **lineage-bound**: payload always carries `event_id` + deep link. No notification is ever synthesized from anything other than an existing `asb_events` row.

## 5. Escalation visibility rules

| State                                  | Surface                                       |
|----------------------------------------|-----------------------------------------------|
| 0 escalations in 72h                   | Card shows "No escalations" empty state       |
| ≥1 unacked escalation                  | Sticky `EscalationBanner` on `/command` top    |
| ≥1 unacked, any page                   | `NotificationBell` badge count in header      |
| Item opened                            | Routes to `/replay/:eventId`, writes ack row  |
| Confidence < 0.5 OR missingness = high | Item rendered with muted tone + visible chip  |

Acks are append-only into `notification_acks` (additive table). No update/delete.

## 6. Onboarding → first-event orchestration

```text
login
  └─► <RequireFirstRun> guard reads useAthleteOnboardingState
        ├─ if hasFirstEvent → /command (normal flow)
        └─ else              → /onboarding/athlete

/onboarding/athlete
  Welcome → ConfirmProfile → ScheduleTodayStep
      │
      ▼ user picks day_type (practice|game|rest|travel|recovery)
      useEmitScheduleDayType() → existing producer →
        asb_events row (topic_id="athlete.schedule.day_type")
      │
      ▼ returns event_id
  FirstEventConfirmStep shows event_id + EngineVersionBadge
      "Open in replay" → /replay/:eventId   (verifies E2E)
      │
      ▼
  NotificationsOptInStep (optional)
      │
      ▼
  DoneStep → /command (now populated with at least the schedule card)
```

Onboarding never fabricates extra events; it just walks the athlete through emitting the **one** real canonical event that proves the producer chain works for their account.

## 7. Empty-state collapse strategy (Command Center)

Each card gets a deterministic unlock instruction. No defaults to 0, no placeholder bars.

| Card               | Empty copy                                                        |
|--------------------|-------------------------------------------------------------------|
| Readiness          | "Log today's day type and one training session to unlock."        |
| Fatigue            | "Recorded after your first completed session."                    |
| Workload           | "Appears after 3+ scheduled days in the last 7."                  |
| Recovery           | "Requires at least one completed session + next-day check-in."    |
| Behavioral reg.    | "Unlocks once behavioral events accumulate (auto-emitted)."        |
| Scheduling load    | "Add days via Calendar or onboarding to populate."                |
| Trend shifts       | "Needs ≥2 same-topic events to compute a delta."                  |
| Escalations        | "No escalations in the last 72 hours."                            |

## 8. Daily engagement loop

```text
Day 1: onboard → emit schedule → /command shows 1 live card + 7 explicit unlock states
Day 2: open app → /command → log today's schedule → 1 more card unlocks → check escalations
Day 3+: same shape, more topics accumulate → trend shifts + escalations meaningful
```

Loop optimizes for **signal accumulation + lineage continuity**, not streaks/gamification. The only retention surface is "your organism is more visible today than yesterday" — proven by card unlock + replay growth.

## 9. Verification matrix

| Check                                                              | How                                              |
|--------------------------------------------------------------------|--------------------------------------------------|
| New athlete redirected to `/onboarding/athlete`                    | manual + RequireFirstRun unit                    |
| Schedule step emits exactly one `asb_events` row                   | `SELECT count(*) FROM asb_events WHERE athlete_id=...` |
| event_id from emit opens `/replay/:eventId` and renders lineage    | manual nav                                       |
| `/command` shows that event in `SchedulingLoadCard` immediately    | manual                                           |
| Cards without source events render explicit unlock copy            | snapshot test on `IntelligenceCardShell`         |
| Escalation row produces banner + bell badge                        | insert test escalation, observe UI               |
| Email/push only dispatched when preference enabled                 | `notification_acks` rows + edge fn logs          |
| Notification payload includes `event_id`, `engine_version`, conf   | edge fn log inspection                           |
| Re-opening onboarding after completion is impossible               | guard test                                       |
| No code path writes to `asb_events` outside `emitAsbEvent`         | repo grep                                        |

## 10. Acceptance criteria

1. A brand-new athlete account, from first login, reaches a populated `/command` within **≤3 minutes** via onboarding.
2. At least **one** real `asb_events` row exists for that athlete after onboarding, with deterministic `idempotency_key` and `engine_version="asb-1.0.0"`.
3. `/replay/:eventId` for that event renders successfully and shows the lineage edge (if any).
4. Every empty card shows a concrete unlock action — zero placeholder numbers.
5. Any `foundation.pattern.*` / `behavioral.escalation.*` / `behavioral.risk.*` row inserted for the athlete appears in banner + bell within one query refresh cycle.
6. Each notification (in-app/email/push) deep-links to `/replay/:eventId` and shows confidence + missingness.
7. No new edge functions, no schema rewrites beyond two additive tables (`notification_preferences`, `notification_acks`), no writes to `asb_events` outside existing producers.

## 11. Mobile considerations (819×531 baseline)

- Onboarding steps: single column, sticky bottom CTA, ≥44px tap targets, no horizontal scroll.
- `EscalationBanner`: collapses to one-line summary with chevron on <640px.
- `NotificationBell` dropdown becomes full-screen sheet on <640px.
- Replay deep-links from notifications open in same tab to preserve back-stack.

## 12. Build order

1. Additive migration: `notification_preferences` + `notification_acks` (RLS: user owns own rows).
2. `useAthleteOnboardingState` + `RequireFirstRun` guard.
3. `AthleteOnboardingShell` + 6 step components; wire `useEmitScheduleDayType` to existing producer.
4. Empty-state explainers across the 8 cards.
5. `useEscalationFeed` + `notification_acks` overlay.
6. `EscalationBanner` + `NotificationBell` in header.
7. `NotificationsPreferencesPanel` + opt-in step.
8. `useDispatchPendingNotifications` calling existing `send-email`/`send-push`.
9. Manual verification matrix walk-through, then mark Backlog #4 + #5 done.

## Technical details

- New tables (additive, RLS `user_id = auth.uid()`):
  - `notification_preferences(user_id pk, in_app bool default true, email bool default false, push bool default false, updated_at)`
  - `notification_acks(id pk, user_id, event_id, channel text, dispatched_at, acknowledged_at nullable)` with unique `(user_id, event_id, channel)` for idempotency.
- No changes to `asb_events`, `asb_event_lineage`, `useAsbTimeline`, `useReplayCertification`, `emitAsbEvent`, or `ENGINE_VERSION`.
- All projections remain pure functions in `src/lib/command/projections.ts`.
- Reuse existing `send-email` / `send-push` edge fns; if absent, fall back to in-app-only and mark email/push toggles as "coming soon" — no scaffold-out work in this slice.
