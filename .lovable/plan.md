

## Plan — Reposition Workout Plan CTA based on active state

### Behavior
- **No active block AND no daily workouts scheduled** → render `WorkoutPlanCTA` **below** the Game Plan.
- **Active block exists OR daily workout exists** → render **above** the Game Plan (current position).

### Investigation needed (during implementation)
1. Locate the Dashboard/Game Plan page where `WorkoutPlanCTA` is currently mounted (search for `WorkoutPlanCTA` import).
2. Identify the Game Plan component rendered alongside it.
3. Use `useTrainingBlock()` (already exposes `activeBlock`) to drive position. Daily workouts already land as `calendar_events` with `event_type: 'training_block'` — so "active block" check via `activeBlock` is sufficient as the primary signal. (Daily-only state without a block = no active block → CTA goes below, which matches user intent: "create a 6-week or daily block".)

### Change
Single file (the Dashboard par