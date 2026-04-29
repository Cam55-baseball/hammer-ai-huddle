## Problem

The Night Check-In success screen ("Nightly Recap") tells users they completed things they did not. Three concrete inaccuracies in the data flow:

1. **Workouts logged** — counts rows in `vault_workout_notes` (free-form journal entries), not actually completed training. A user who never finished a workout but typed a note still sees "1 workout logged".
2. **Check-ins completed** — `useNightCheckInStats` counts focus quizzes, then `VaultFocusQuizDialog` adds `+1` for the current submission. If the user already submitted earlier (Authority Lock bypass path), the count gets double-counted.
3. **Sleep goal / weight tracked** — display "Sleep goal set: 8h" and "Weight tracked: 180" even when those are forward-looking goals or stale values, implying the user actually slept that or weighed in.
4. **Tomorrow preview** — `hasMindFuel` and `hasNutritionTip` are hard-coded `true`, and `hasWorkout` includes any recurring template scheduled for tomorrow (not "you have a workout planned" with certainty).
5. **Source-of-truth drift** — The authoritative completion data lives in `custom_activity_logs` (per the project's behavioral-engine memory: "source of truth = `custom_activity_logs` ONLY"). The recap ignores it and uses parallel queries against vault tables instead.

## Fix

Re-source the recap from the authoritative tables and remove anything that isn't a true "completed" signal.

### `src/hooks/useNightCheckInStats.ts`

- **Workouts logged** → query `custom_activity_logs` for today where `completion_state = 'completed'` AND the template's `activity_type` is a training type (e.g. `workout`, `running`, `lifting`, `mobility`, `practice`) — NOT meals/supplements/journal. Count distinct completions.
- **Check-ins completed** → keep counting `vault_focus_quizzes` rows for today, but de-dupe by `quiz_type` so morning/pre/night each count at most once. Remove the `+1` add at the call site (see below).
- **Sleep goal hours** → return `null` here; the success screen will show the just-entered goal only when the user actually filled it in this session.
- **Weight tracked** → only set if there's a quiz row for today with a non-null `weight_lbs` AND that row's `entry_date = today` was created today (already true). Otherwise `null`. (No change needed if value comes only from today's quizzes — verify and tighten.)
- **Tomorrow preview**:
  - `hasWorkout` — only true when there's an actual scheduled `calendar_event` for tomorrow OR an active recurring template whose `display_days` includes tomorrow's weekday AND `is_non_negotiable = true` (so we don't promise things the user never opted into).
  - `hasMindFuel` / `hasNutritionTip` — drop hard-coded `true`. Default to `false` and only set `true` when a real lesson/tip is queued for the user (if no source exists yet, omit these lines from the UI rather than fabricate them).

### `src/components/vault/VaultFocusQuizDialog.tsx` (line 678)

- Remove `checkinsCompleted: nightStats.todayStats.checkinsCompleted + 1`. The hook already counts the night quiz once it's persisted; pass through `nightStats.todayStats.checkinsCompleted` directly. If the night quiz hasn't been written yet at the moment the success screen renders, refetch (`nightStats.refetch()` after submit) before showing the screen.
- Pass `sleepGoalHours: nightSleepGoalHours` only when the user actually entered a bedtime+wake time this session (already conditional on `nightSleepGoalHours` truthiness — keep). Same for `weightTracked`.

### `src/components/vault/quiz/NightCheckInSuccess.tsx`

- "Today's Highlights" rows: only render each row when its underlying value reflects a real completion this calendar day. Specifically:
  - Check-ins row — show count only if `checkinsCompleted > 0`.
  - Workouts row — already gated on `> 0`; keep, but the count now comes from `custom_activity_logs` completions.
  - Sleep goal row — relabel from "Sleep goal set: 8h" to "Bedtime goal logged" (it is a plan, not an outcome) so it stops implying sleep happened.
  - Weight row — already gated; keep.
- "Tomorrow Awaits" rows: render Mind Fuel / Nutrition Tip lines **only** when the corresponding boolean is true (no more always-on rows).

### Verification step

After wiring, the truth check is: open the night check-in for a user who only logged a meal and submitted the quiz. The recap should show exactly one check-in completed, **zero** workouts logged, no sleep/weight rows unless they entered them in the form, and Tomorrow Awaits should not promise a workout/lesson/tip that doesn't exist.

## Files touched

- `src/hooks/useNightCheckInStats.ts` — re-source workouts from `custom_activity_logs`, dedupe check-ins, tighten tomorrow preview, drop hard-coded booleans.
- `src/components/vault/VaultFocusQuizDialog.tsx` — remove `+1` double-count, refetch stats after night quiz insert before showing success.
- `src/components/vault/quiz/NightCheckInSuccess.tsx` — relabel sleep-goal row, gate "Tomorrow" rows on real values.

No DB schema changes. No new tables. Aligns with the existing Phase 9 rule that `custom_activity_logs` is the only behavioral source of truth.