

# Scheduling Unification — Forensic Analysis + Implementation Plan

## Current Architecture (14 files, 8 tables)

The scheduling system currently spans **8 database tables** and **14 files** with direct read/write access:

```text
┌─────────────────────────────────────────────────────────────┐
│                    SCHEDULING DATA SOURCES                   │
├─────────────────────┬───────────────────────────────────────┤
│ Table               │ Purpose                               │
├─────────────────────┼───────────────────────────────────────┤
│ calendar_events     │ Manual user-created events            │
│ athlete_events      │ Day-type (game/rest/training)         │
│ scheduled_practice  │ Coach-assigned sessions + approval    │
│ game_plan_task_     │ Recurring day prefs for system tasks  │
│   schedule          │                                       │
│ game_plan_skipped_  │ Date-specific task skips              │
│   tasks             │                                       │
│ calendar_skipped_   │ Recurring day skips for calendar      │
│   items             │                                       │
│ calendar_day_orders │ Visual ordering per day               │
│ timeline_schedule_  │ Saved schedule templates              │
│   templates         │                                       │
└─────────────────────┴───────────────────────────────────────┘

DIRECT WRITERS (the fragmentation problem):
─────────────────────────────────────────────
• useCalendar.ts         → calendar_events (insert/update/delete)
• useAthleteEvents.ts    → athlete_events (insert/update/delete)
• useScheduledPractice   → scheduled_practice_sessions (insert/update/delete)
•   Sessions.ts
• useSystemTaskSchedule  → game_plan_task_schedule (upsert)
• useCalendarSkips.ts    → calendar_skipped_items (upsert/delete)
• useRescheduleEngine.ts → calendar_events + game_plan_skipped_tasks
• useScheduleTemplates   → timeline_schedule_templates
• RestDayScheduler.tsx   → calendar_events + game_plan_skipped_tasks (DIRECT!)
• PendingSessionApproval → scheduled_practice_sessions (DIRECT!)
•   s.tsx
• useGamePlan.ts         → game_plan_skipped_tasks (DIRECT!)
```

## Why "One Table" Is Wrong

These 8 tables serve fundamentally different data models (recurring preferences vs. date-specific events vs. day-type classification vs. coach approval workflows). Merging them would destroy purpose-specific constraints, RLS policies, and the approval workflow.

**The real problem**: 11 files make direct Supabase writes independently, with no centralized validation, no audit trail, and inconsistent real-time propagation.

## What We Will Build

### 1. Unified Scheduling Service (`useSchedulingService.ts`)
A single hook that ALL schedule mutations route through. Every other hook/component calls this service instead of writing directly to Supabase.

**Methods:**
- `addCalendarEvent()` — replaces direct `calendar_events` inserts
- `updateCalendarEvent()` / `deleteCalendarEvent()`
- `setDayType()` — replaces direct `athlete_events` writes
- `scheduleSession()` / `cancelSession()` — replaces direct `scheduled_practice_sessions` writes
- `skipTask()` / `unskipTask()` — replaces direct `game_plan_skipped_tasks` writes
- `setTaskSchedule()` — replaces direct `game_plan_task_schedule` writes
- `setCalendarSkip()` — replaces direct `calendar_skipped_items` writes

Every method: validates input, writes to DB, logs to `audit_log`, and invalidates React Query caches.

### 2. Eliminate All Direct Writes
Refactor these files to use the service instead of direct Supabase calls:

| File | Current Direct Write | After |
|------|---------------------|-------|
| `useCalendar.ts` | `calendar_events` insert/update/delete | Calls `schedulingService.addCalendarEvent()` etc. |
| `useAthleteEvents.ts` | `athlete_events` insert/update/delete | Calls `schedulingService.setDayType()` |
| `useScheduledPracticeSessions.ts` | `scheduled_practice_sessions` all ops | Calls `schedulingService.scheduleSession()` |
| `useSystemTaskSchedule.ts` | `game_plan_task_schedule` upsert | Calls `schedulingService.setTaskSchedule()` |
| `useCalendarSkips.ts` | `calendar_skipped_items` upsert/delete | Calls `schedulingService.setCalendarSkip()` |
| `useRescheduleEngine.ts` | `calendar_events` + `game_plan_skipped_tasks` | Calls service methods |
| `RestDayScheduler.tsx` | Direct writes to 2 tables | Calls service methods |
| `PendingSessionApprovals.tsx` | Direct `scheduled_practice_sessions` update | Calls `schedulingService.updateSessionStatus()` |
| `useGamePlan.ts` | Direct `game_plan_skipped_tasks` writes | Calls service methods |

### 3. Real-Time Subscription Hub
Add a single `useSchedulingRealtime()` hook that subscribes to ALL 5 mutable scheduling tables and invalidates the correct React Query keys. Replace the 3 separate channel subscriptions currently in `useCalendar.ts`.

### 4. Database-Level Constraints
Migration to add:
- **Unique constraint** on `(user_id, event_date, event_type, source_id)` for `calendar_events` to prevent duplicate manual events
- **Unique constraint** on `(user_id, event_date)` for `athlete_events` (already enforced in code, make it DB-level)

### 5. Audit Trail
Every scheduling mutation logs to `audit_log` with:
- `action`: `schedule_create`, `schedule_update`, `schedule_delete`, `schedule_skip`
- `table_name`: which table was affected
- `metadata`: `{ event_id, old_value, new_value, source: "user"|"coach"|"ai"|"reschedule" }`

## Files Created/Modified

| File | Action |
|------|--------|
| `src/hooks/useSchedulingService.ts` | **NEW** — central write service |
| `src/hooks/useSchedulingRealtime.ts` | **NEW** — unified realtime subscriptions |
| `src/hooks/useCalendar.ts` | Remove direct writes, use service |
| `src/hooks/useAthleteEvents.ts` | Remove direct writes, use service |
| `src/hooks/useScheduledPracticeSessions.ts` | Remove direct writes, use service |
| `src/hooks/useSystemTaskSchedule.ts` | Remove direct writes, use service |
| `src/hooks/useCalendarSkips.ts` | Remove direct writes, use service |
| `src/hooks/useRescheduleEngine.ts` | Remove direct writes, use service |
| `src/components/calendar/RestDayScheduler.tsx` | Remove direct writes, use service |
| `src/components/practice/PendingSessionApprovals.tsx` | Remove direct writes, use service |
| `src/hooks/useGamePlan.ts` | Remove direct skip writes, use service |
| Migration SQL | Add unique constraints |

## Implementation Order

1. Migration: Add DB-level unique constraints
2. Create `useSchedulingService.ts` with all methods + audit logging
3. Create `useSchedulingRealtime.ts` with unified subscriptions
4. Refactor `useCalendar.ts` — replace writes + replace realtime channels
5. Refactor `useAthleteEvents.ts`
6. Refactor `useScheduledPracticeSessions.ts`
7. Refactor remaining 5 files (parallel-safe, no interdependencies)
8. Verify: grep for any remaining direct writes to scheduling tables

## What This Does NOT Do
- Does NOT merge 8 tables into 1 (architecturally wrong — different data models need different schemas)
- Does NOT add a new `schedule_events` table (the existing tables are correctly separated by concern)
- Instead: enforces a **single code path** for all writes, with audit logging and real-time sync

## Verification Checklist
- [ ] `grep -r "from('calendar_events')" src/` returns only reads (no `.insert`, `.update`, `.delete`) outside `useSchedulingService.ts`
- [ ] Same for all 7 other scheduling tables
- [ ] `audit_log` entries appear for every schedule mutation
- [ ] Real-time subscription triggers refetch across Calendar + Game Plan simultaneously
- [ ] DB unique constraints prevent duplicate athlete events and calendar events

