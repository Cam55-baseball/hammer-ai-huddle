

## Plan — Surface Hammer Workout Plans + add Daily Plan mode

### Goal
1. Make the workout planner discoverable (Dashboard tile + sidebar + Game Plan CTA).
2. Let users choose between **6-Week Block** (existing) or **Daily Plan** (new) at generation time.
3. 6-Week block scheduling auto-respects calendar conflicts + season phase, and is fully editable.

---

### 1. Discoverability (3 entry points)

**a) Dashboard tile** — new card in `src/pages/Dashboard.tsx` ("Hammer Workout Plan") linking to `/training-block`. Shows active block progress if one exists, otherwise "Generate your plan" CTA.

**b) Sidebar nav** — add "Workout Plan" item under Training group in `src/components/AppSidebar.tsx` (Dumbbell icon, route `/training-block`).

**c) Game Plan / Today CTA** — small inline card on the Game Plan view: "No workout today? Generate one →" linking to `/training-block?mode=daily`.

---

### 2. Mode picker on `/training-block`

Refactor `src/pages/TrainingBlock.tsx` to show a top-level toggle when no active block exists:

```text
┌────────────────────────────────────────┐
│  [ 6-Week Block ]  [ Daily Plan ]      │
└────────────────────────────────────────┘
```

- **6-Week Block** → existing `TrainingBlockView` + generator (unchanged behavior).
- **Daily Plan** → new `DailyWorkoutPlanner` component.

If an active block exists, mode picker is hidden (block view takes over) but a small "Generate one-off daily workout" button remains.

---

### 3. New: Daily Plan mode

**Component**: `src/components/training-block/DailyWorkoutPlanner.tsx`

- Date picker (defaults to today, allows any future date).
- Reuses existing `useBlockWorkoutGenerator` hook with `blockType='daily'` (single-session output, ~45-60min).
- On generate: writes a single `block_workouts` row (no parent `training_blocks` row needed — or use a lightweight "daily" block container with `status='archived'` after the day passes).
- Shows generated workout inline; user can save → it becomes a Game Plan task on the chosen date.

**Backend tweak**: `supabase/functions/generate-block-workout/index.ts` already handles single-block generation. Add a `mode: 'daily' | 'block'` param that returns a single workout payload for daily mode (no 18-workout 6-week structure).

---

### 4. Smart 6-Week scheduling (calendar + season aware)

Update `supabase/functions/generate-training-block/index.ts`:

**Inputs added to scheduling logic:**
1. **Season phase** from `athlete_mpi_settings` (preseason/in_season/post_season) → adjusts workout density:
   - Preseason: 5 days/week (heavy strength block)
   - In-season: 3 days/week (maintenance, lower CNS)
   - Post-season: 4 days/week (recovery + rebuild)
2. **Existing calendar conflicts** — query `custom_activity_logs` and `game_plan_tasks` for the 42-day window; skip days with games or high-CNS practices.
3. **Default schedules** from `src/constants/trainingSchedules.ts` as the base pattern, then subtract conflicts.

**Helper added**: `pickOptimalSchedule(userId, startDate, seasonPhase, existingActivities)` returns 18 ideal `scheduled_date`s.

---

### 5. Editable 6-week schedule

In `src/components/training-block/TrainingBlockView.tsx`, each workout row gets:
- A small calendar/date-picker icon → reschedule that single workout.
- Mutation: `useTrainingBlock` → add `rescheduleWorkout({ workoutId, newDate })` that updates `block_workouts.scheduled_date` and re-runs `shift_workouts_forward` if collision.

Drag-to-reorder is out of scope (follow-up); single-row reschedule is enough for V1.

---

### 6. Files touched

| File | Change |
|---|---|
| `src/pages/Dashboard.tsx` | Add Hammer Workout Plan tile |
| `src/components/AppSidebar.tsx` | Add nav item |
| `src/components/game-plan/*` (existing today view) | Inline CTA card |
| `src/pages/TrainingBlock.tsx` | Mode picker, query param `?mode=daily` |
| `src/components/training-block/DailyWorkoutPlanner.tsx` | NEW |
| `src/components/training-block/TrainingBlockView.tsx` | Per-workout reschedule control |
| `src/hooks/useTrainingBlock.ts` | `rescheduleWorkout` mutation, daily-mode flow |
| `src/hooks/useBlockWorkoutGenerator.ts` | Accept `mode: 'daily' \| 'block'` |
| `supabase/functions/generate-block-workout/index.ts` | Daily mode branch |
| `supabase/functions/generate-training-block/index.ts` | Season-aware + calendar-conflict scheduler |

### Out of scope (V1)
- Drag-and-drop reordering of the whole 6-week grid.
- Auto-regenerate when season phase changes mid-block (manual "adapt block" button already exists).
- Daily-plan history view (one-off workouts just live as Game Plan tasks).

