Root cause found:

- The check-ins did save: I confirmed two completed check-ins in `asb_events`, each with the expected 8 rows and shared check-in group IDs.
- Nothing visibly changed because Hammer still treats `recovery` as missing. The check-in emits readiness, fatigue, soreness, sleep, stress, hydration, plan, and summary — but `useCoachHammerNextStep` only considers `behavioral.recovery` / `foundation.recovery` as recovery, and those topics do not exist.
- The sheet also invalidates the wrong command query key: it invalidates `athlete-command-rows`, but the actual query key is `asb-command-rows`. That means Hammer can recalculate against stale cached rows.
- The save path currently calls `Promise.all(emissions)` but `emitAsbEvent` returns `{ ok: false }` instead of throwing, so future persistence failures could still show a success state.

Plan to fix now:

1. Make check-in data first-class Hammer inputs
   - Update `useCoachHammerNextStep` to read the latest check-in topics directly:
     - `behavioral.checkin`
     - `behavioral.readiness`
     - `behavioral.fatigue`
     - `behavioral.soreness`
     - `behavioral.sleep`
     - `behavioral.stress`
     - `behavioral.hydration`
     - `athlete.plan.today`
   - Add these into the snapshot sent to Coach Hammer so the recommendation can actually use what the athlete just submitted.

2. Fix the false “recovery missing” blocker
   - Treat a fresh check-in with sleep, soreness, stress, hydration, readiness, and fatigue as valid recovery/readiness context.
   - Only route to “Do Check-In” when the check-in itself is missing or stale, not because a nonexistent `behavioral.recovery` topic is absent.

3. Fix query refresh after saving
   - Replace the incorrect invalidation key with the real one: `asb-command-rows`.
   - Await/refetch Hammer and command-row invalidation after save so the dashboard updates immediately after the sheet closes.

4. Make save success truthful
   - Inspect every `emitAsbEvent` result.
   - If any required event fails, show an error and keep the sheet open instead of saying “Sent to Hammer.”
   - Only show success once all emitted rows return `ok: true`.

5. Harden Hammer’s backend prompt/logic
   - Update `coach-hammer-next-step` so it understands fresh check-in-derived recovery context.
   - Include plan/soreness/sleep/stress/hydration in decision rules so the next step changes based on the athlete’s actual answers, not just generic readiness/fatigue.

6. Validate E2E
   - Confirm recent check-in rows are present in the database.
   - Confirm the dashboard query key refreshes.
   - Confirm Hammer no longer asks for check-in immediately after a successful check-in and instead gives an updated next best step based on submitted readiness/fatigue/recovery/plan signals.