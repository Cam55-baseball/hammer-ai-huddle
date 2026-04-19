

## Move Hammer Workout Plan from Dashboard to My Activities

### Changes

**1. `src/pages/Dashboard.tsx`** — remove both `<WorkoutPlanCTA />` placements
- Delete lines 437–440 (above Game Plan, when block active)
- Delete lines 450–453 (below Game Plan, when no block)
- Remove now-unused imports: `WorkoutPlanCTA`, `useTrainingBlock`, and the `activeBlock`/`hasActiveTrainingBlock` lines (102–105 area). Keep everything else intact.

**2. `src/pages/MyCustomActivities.tsx`** — add a new "Workout Plan" tab that always appears
- Import `WorkoutPlanCTA` and a new icon (`Dumbbell` is already imported).
- Add a new tab entry, e.g. `{ value: 'workout-plan', icon: Dumbbell, label: 'Workout Plan' }`, placed near the top of the tabs array (right after `templates`).
- Add a matching `<TabsContent value="workout-plan">` that renders `<WorkoutPlanCTA />` plus a brief intro panel and two prominent buttons that route to `/training-block?mode=block` and `/training-block?mode=daily` (so users can act even when no block exists).
- The tile itself already handles both states (active block vs. CTA), so it works pre- and post-creation.

**3. Game Plan behavior** — no code change needed
- `useTrainingBlock` already writes `block_workouts` with `event_type='training_block'` into the calendar. They will continue to surface on the user's Game Plan on their scheduled day. We will verify this in QA, not modify it.

### Out of scope
- Sidebar entry (`/training-block`) stays.
- `TrainingBlock.tsx` page stays.
- No changes to Game Plan rendering or scheduling logic.

### Verification
- Dashboard no longer shows the Hammer Workout Plan tile in either state.
- My Activities → "Workout Plan" tab is always visible and shows either active-block progress or the Generate CTA.
- After creating a 6-week or daily plan, the scheduled workout appears on the Game Plan for its date.

