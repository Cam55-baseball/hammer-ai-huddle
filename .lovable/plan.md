# Schedule-Aware Hammer Daily Plan

Right now Hammer's daily plan is computed purely from athlete context (season phase, readiness, goals, injury). The 7-day schedule window (`useScheduleWindow`) is only displayed as a one-line hint above the cards — it does **not** change which modalities are prescribed. As a result, an athlete with a tournament today gets the same speed/strength/throwing prescription as a regular training day.

This plan wires the calendar (games, tournaments, camps, practices — from both the calendar module and Hammer's "Add game / Import schedule" entry points) into the prescription engine so the plan visibly bends around competition days.

## What changes for the athlete

| Day type detected | Plan behavior |
|---|---|
| Game today | Warm-up = game-ready short version. Speed, strength, heavy throwing, baserunning suppressed → "Save legs for the game." Fueling moves to pre-game template. Recovery = post-game template enabled. |
| Tournament day (1 of N) | Same as game day, plus a "Tournament Day X of Y" badge. Strength fully suppressed. Hitting/throwing reduced to activation only. |
| Game tomorrow | Strength shifts to potentiation/deload, speed shifts to `inseason_freshness`, total volume capped. "Tapering for tomorrow's game" reason shown. |
| Camp / showcase today | All training modalities suppressed except warm-up + fueling + recovery, with rationale "Camp today — Hammer is staying out of the way." |
| Long-distance travel (kind=`travel`) | Speed/strength suppressed, mobility + hydration emphasized. |
| Team practice today | Personal practice modalities (hitting/throwing/defense) compressed to short activation; strength deferred unless off-day; rationale "Team practice today — supplementing, not stacking." |
| Nothing scheduled | Current behavior, unchanged. |

The existing one-line schedule hint stays, but the cards themselves now reflect the same truth.

## Files touched

1. **`src/hooks/command/useScheduleWindow.ts`** — extend the slot model so the daily plan can read more than just "is there a game".
   - Add `kind: "game" | "tournament" | "practice" | "camp" | "travel" | "other"` (derive `tournament` from `games.game_type === 'tournament'`, derive `camp`/`travel`/`other` from `scheduled_practice_sessions.session_type`).
   - Add `tournamentWindow: { startDate, endDate, totalDays, dayIndex } | null` computed from contiguous tournament rows.
   - Expose `slotsByDate: Record<string, ScheduleSlot[]>` for the next 7 days.

2. **New: `src/lib/hammer/prescription/scheduleContext.ts`** — pure projector.
   ```ts
   export interface ScheduleSignal {
     todayKinds: ReadonlyArray<ScheduleKind>;
     tomorrowKinds: ReadonlyArray<ScheduleKind>;
     isGameToday: boolean;
     isTournamentToday: boolean;
     tournamentDayLabel: string | null;   // "Day 2 of 3"
     isCampToday: boolean;
     isTravelToday: boolean;
     hasTeamPracticeToday: boolean;
     isGameTomorrow: boolean;
     postureToday: "game" | "tournament" | "camp" | "travel" | "team_practice" | "taper" | "normal";
     rationale: string;                   // one-line, used in `roadmapReason`
   }
   export function projectScheduleSignal(window: ScheduleWindow): ScheduleSignal;
   ```
   No I/O; pure derivation from the schedule window. Missingness preserved (returns `postureToday: "normal"` when window is `unknown` or `empty`).

3. **`src/lib/hammer/prescription/dailyPlan.ts`** — accept the schedule signal and apply it as a final modulator after `applyCategoryGoalOrdering`.
   - Extend `buildHammerDailyPlan(ctx, scheduleSignal?)`. Signal is optional → safe default = "normal" so existing tests and callers don't break.
   - Add `applyScheduleModulation(blocks, signal)` that:
     - Suppresses or shrinks modalities per the matrix above by setting `status: "suppressed"`, replacing `drills` with a short activation set or empty array, zeroing `durationMin`, and rewriting `why`/`roadmapReason` to name the scheduled event.
     - Rewrites the warm-up block to its game-ready variant (already exists for in-season; reuse).
     - Adds tournament day label to affected blocks (`"Tournament Day 2 of 3 — …"`).
     - Never authors organism truth — only reshapes the prescription envelope.
   - Ordering rule preserved: warm-up first, fueling/recovery last.

4. **`src/components/hammer/HammerDailyPlan.tsx`** — pass the signal through.
   - `const signal = useMemo(() => projectScheduleSignal(sched), [sched])`
   - `const plan = useMemo(() => buildHammerDailyPlan(ctx, signal), [ctx, signal])`
   - Existing `scheduleLine` hint stays; broaden it to cover tournament/camp/travel postures.
   - Add a small pill next to "today's plan" reading e.g. `Tournament Day 2 of 3` or `Game today` when applicable (purely presentational).

5. **No DB migration.** Source columns already exist:
   - `games.game_type` ("tournament" / "regular_season") is already populated by `useImportScheduleEvents.ts`.
   - `scheduled_practice_sessions.session_type` is already populated for `practice` / `travel` / `other`. We will treat `session_type IN ('camp','showcase')` as `camp` and unknown labels containing "camp"/"showcase"/"clinic" (case-insensitive) as `camp` as a missingness-permissive fallback.

## Constraints honored

- Pure functions for the modulator — no organism-truth authorship.
- Missingness preserved: if the schedule window is `unknown`/`empty`, behavior is identical to today.
- Athlete-reported injury and parent-supremacy guards still run after schedule modulation, so they continue to override scheduled-day overrides.
- Lineage breadcrumb added: when the schedule signal changes prescription, `roadmapReason` cites the scheduled event ("Game today vs Eagles — …") so the athlete sees *why* the plan shifted.

## Out of scope (not changing)

- The calendar module UI itself.
- The Game Plan generator / `custom_activity_templates`.
- Any auto-rescheduling of skipped work into future days (can come later; today the work is just suppressed with a clear reason).
