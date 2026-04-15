

# Training Block System: Integration Into Existing Architecture

## Context

This project already has a production-grade training infrastructure:
- **Hammers Modality** — 24-week block-based workout engine with CNS load tracking
- **useSchedulingService** — centralized scheduling hub (all mutations audited)
- **useRescheduleEngine** — deterministic push/skip/undo logic
- **generate-block-workout** edge function — AI exercise generation via Lovable AI
- **useAthleteGoalsAggregated** — athlete context aggregation (body goals, pain areas, position)
- **Calendar + Game Plan** — recurring schedules, skip management, realtime sync

The request introduces a 6-week training block lifecycle system. This must integrate with — not replace — the existing architecture. All scheduling routes through `useSchedulingService`. AI generation uses Lovable AI (not OpenAI directly). Branding uses "Hammer" not "AI."

---

## 1. Database Schema (5 new tables)

### training_blocks
| Column | Type | Notes |
|--------|------|-------|
| id | uuid pk | |
| user_id | uuid | NOT NULL |
| goal | text | NOT NULL |
| sport | text | 'baseball' or 'softball' |
| start_date | date | |
| end_date | date | |
| status | text | 'active', 'nearing_completion', 'ready_for_regeneration', 'archived' |
| generation_metadata | jsonb | AI prompt context snapshot |
| created_at | timestamptz | DEFAULT now() |

### block_workouts
| Column | Type | Notes |
|--------|------|-------|
| id | uuid pk | |
| block_id | uuid fk → training_blocks | |
| week_number | int | 1-6 |
| day_label | text | e.g. 'Monday' |
| scheduled_date | date | nullable until scheduled |
| completed_at | timestamptz | nullable |
| status | text | 'scheduled', 'completed', 'missed' |
| workout_type | text | e.g. 'upper_push', 'lower_pull' |
| estimated_duration | int | minutes |

### block_exercises
| Column | Type | Notes |
|--------|------|-------|
| id | uuid pk | |
| workout_id | uuid fk → block_workouts | |
| ordinal | int | exercise order |
| name | text | |
| sets | int | |
| reps | int | |
| weight | float | nullable |
| tempo | text | nullable |
| rest_seconds | int | nullable |
| velocity_intent | text | nullable |
| cns_demand | text | nullable |
| coaching_cues | text[] | nullable |

### training_preferences
| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid pk | |
| goal | text | |
| availability | jsonb | `{"days": [1,2,4,5]}` |
| equipment | jsonb | `["barbell","bands"]` |
| injuries | jsonb | `["left_shoulder"]` |
| experience_level | text | 'beginner', 'intermediate', 'advanced' |
| updated_at | timestamptz | |

### block_workout_metrics
| Column | Type | Notes |
|--------|------|-------|
| id | uuid pk | |
| user_id | uuid | |
| workout_id | uuid fk → block_workouts | |
| rpe | int | 1-10 |
| completed | boolean | |
| notes | text | nullable |
| created_at | timestamptz | |

RLS: All tables scoped to `auth.uid() = user_id`. Standard select/insert/update policies.

Validation trigger on `block_workout_metrics`: RPE must be 1-10.

---

## 2. Edge Function: generate-training-block

New edge function that:
1. Fetches `training_preferences` for the user
2. Fetches aggregated goals from existing `useAthleteGoalsAggregated` tables (body goals, pain areas, position)
3. Calls Lovable AI (google/gemini-2.5-flash) with tool calling to return strict JSON
4. Inserts into `training_blocks`, `block_workouts`, `block_exercises`
5. Calls the scheduling function to map workouts to dates

Returns the created block ID. Uses existing auth pattern (getClaims + subscription check matching `generate-block-workout`).

---

## 3. Deterministic Scheduling Function (in edge function)

`scheduleBlockWorkouts(block_id, user_id)` — pure logic, no AI:
- Reads `training_preferences.availability` (days array)
- Maps week 1-6 workouts to calendar dates starting from `start_date`
- Enforces rest spacing: no 3 consecutive heavy days (checks `cns_demand` on exercises)
- Writes `scheduled_date` on each `block_workouts` row
- Creates corresponding `calendar_events` entries via direct insert (edge function context)

Missed workout handling (called from adaptation):
- 1 missed → shift remaining week workouts forward 1 day
- 2+ missed in a week → compress: drop lowest-priority workout, redistribute

---

## 4. Block Lifecycle Function

`updateBlockStatus(block_id)` — called after workout completion or daily cron:
- Count completed vs total workouts
- If ≥85% complete → status = 'nearing_completion'
- If ≤3 workouts remaining → status = 'ready_for_regeneration'
- If all done or past end_date → status = 'archived'

Implemented as a database function (`update_block_status`) callable via RPC.

---

## 5. Notification System

Daily cron (pg_cron + pg_net → edge function `training-block-notifications`):
- Check for workouts scheduled today → push notification data (consumed by existing `useWorkoutNotifications`)
- Weekly: calculate adherence rate, flag if <60%
- End-of-block: if status = 'ready_for_regeneration', set a `user_notifications` row prompting next block generation

No new notification infrastructure — hooks into existing notification patterns.

---

## 6. Goal Edit Function

`updateTrainingGoal(user_id, new_goal)`:
- Updates `training_preferences.goal`
- If active block exists: does NOT regenerate — stores `pending_goal_change = true` on the block
- Next block generation picks up the new goal automatically
- Optional: if <50% through current block, user can opt to regenerate remaining weeks only

---

## 7. Adaptation Engine

Edge function `adapt-training-block`:
- Inputs: block_id
- Reads `block_workout_metrics` (RPE, completion)
- Rules:
  - Average RPE > 8 for 2+ weeks → reduce volume (sets - 1) for next week
  - Average RPE < 5 → increase volume (sets + 1) or reps
  - Specific workout type skipped 2+ times → swap exercise selection via AI call
  - 3+ missed workouts → insert deload week (50% volume)
  - No activity 7 days → flag for re-engagement notification

Updates `block_exercises` for future workouts only (never retroactively).

---

## 8. Frontend Integration

- New hook: `useTrainingBlock` — fetches active block, workouts, exercises
- New hook: `useTrainingPreferences` — CRUD for training preferences
- New page component: `TrainingBlockView` — displays current block, workout cards, completion tracking
- Integrate with existing `CalendarView` — block workouts appear as calendar events
- Completion logging ties into existing performance session flow

---

## Execution Order

1. Migration: Create 5 tables + RLS + validation triggers + `update_block_status` DB function
2. Edge function: `generate-training-block` (AI generation + scheduling)
3. Edge function: `adapt-training-block` (adaptation engine)
4. Edge function: `training-block-notifications` (cron-driven)
5. Cron job: daily trigger for notifications + status updates
6. Frontend hooks: `useTrainingBlock`, `useTrainingPreferences`
7. Frontend components: `TrainingBlockView`, preference editor, block generation UI
8. Calendar integration: block workouts rendered in existing `CalendarView`

## Hard Constraints Respected

- AI generates structure only — never schedules dates
- All scheduling is deterministic pure code
- All AI responses use tool calling for strict JSON
- All scheduling mutations audit-logged
- Uses Lovable AI gateway (not OpenAI directly)
- Branded as "Hammer" in UI, never "AI"

