
# Side-Aware Athlete System (Switch Hitters / Ambidextrous Throwers)

Goal: make L vs R a first-class, persistent dimension on **every** surface where an athlete generates, saves, or receives information — so the app keeps a true running differential between sides and can correlate side with goals, body checks, Hammer's daily plan, workouts, drills, and scorecards.

Today we already store side on practice reps (`performance_sessions.batting_side_used`) and have a `useSwitchHitterProfile` hook, but the rest of the app silently averages both sides together. This plan finishes the job E2E.

## Principles

- **One control, everywhere.** A single `<SideContextPicker />` (compact dropdown, L / R, plus "Both" for non-switch users — auto-hidden if the athlete isn't switch/ambi).
- **Sticky but overridable.** Last-used side persists per discipline (hit vs throw) in a `SideContextProvider`. Every write inherits it; users can override per action in one tap.
- **Never mix without showing it.** Any aggregate that spans both sides shows a small "L · R · Combined" segmented tab. Default view = dominant side; "Combined" requires an explicit click.
- **Clutterless.** Picker is a 28px-tall ghost pill in the top-right of the relevant surface. If the user isn't switch/ambi, it doesn't render at all — zero added noise for ~95% of users.

## Scope — every surface that writes or reads side

### Capture (writes side)
1. **Video upload & analysis** (`AnalyzeVideo.tsx`) — side picker in the upload sheet; persisted on `videos.batting_side` / `throwing_hand`, `video_analysis_runs`, and all derived `mpi_scores` / `video_performance_metrics`.
2. **Player's Club / video search** (`VideoLibrary`, `MyFollowers`, scout review) — side filter chip alongside category.
3. **Drill saves** (`vault_saved_drills`, `drill_assignments`, `pending_drills`) — tag with side so "my left-side drills" is a real view.
4. **Running scorecard / report card** — scorecard built per side; switch-hitters get a two-column compare card by default.
5. **Goals** (`athlete_body_goals`, category goals) — each goal optionally scoped to L / R / Both (e.g. bat speed L = 72, R = 68).
6. **Body check / daily standard checks** — capture which side the athlete is training today so fatigue/soreness correlates.
7. **Hammer Daily Plan** — side toggle at the top; plan re-renders modality blocks weighted by that side's gaps.
8. **Workout rendering / block workouts** — exercises tagged dominant-side vs off-side; volume balances based on differential.
9. **Practice sessions** — already side-aware; surface the picker more prominently and inherit from context.
10. **Calendar events / game scoring** — at-bat side stored on `game_plays`.

### Read (shows side-split)
- Progress dashboard, correlations, IQ insight card, Hammer chat context, scout grades, monthly reports, share console, parent view, recap PDF, vault performance tests.

## UX

```
┌─ Analyze Video ─────────────────────────────┐
│  [ Side: ⚾ R ▾ ]            ✕ close        │
│  ──────────────────────────────────────     │
│  drop video here                            │
└─────────────────────────────────────────────┘
```

- `<SideContextPicker discipline="hit" | "throw" />` — single component, dropdown with L / R (and "S — set both" for switch users on aggregate views only).
- Surfaces that show data: a 3-segment tab `L · R · Combined`, sticky per surface. Differential delta badge (e.g. "R +6 pts vs L") next to the headline metric on switch users' dashboards.
- Onboarding gains one screen: "Do you switch hit? / Do you throw with both hands?" → flips `is_switch_hitter` / `is_ambidextrous_thrower`. Existing users get a one-time prompt the first time they upload a second-side video.

## Data model (additive, no destructive changes)

New columns (nullable, default null so non-switch users are unaffected):

- `videos.batting_side` (`L|R`), `videos.throwing_hand` (`L|R`)
- `vault_saved_drills.side`, `drill_assignments.side`, `pending_drills.side`
- `athlete_body_goals.side` (`L|R|both`, default `both`)
- `daily_standard_checks.side_focus`
- `calendar_events.side_focus` (already side-aware for practice; extend to workouts)
- `mpi_scores.side` (already partially present via session; promote to explicit column for query speed)

New table:

- `athlete_side_preferences(user_id, discipline, last_used_side, dominant_side, updated_at)` — one row per discipline per user, drives the sticky default.

Existing `athlete_mpi_settings.is_switch_hitter / is_ambidextrous_thrower / primary_*` remain the source of truth for "should we even show the picker."

## Correlation engine

Extend `src/lib/progress/correlations.ts` and `useSplitAnalytics`:

- Side-stratified rollups for: bat speed, exit velo, contact %, swing decision, throwing velo, accuracy, fatigue, sleep, workload.
- Auto-detect & surface "Left-side bat speed is 6 mph behind right, and your left-side workload is 38% lower" type insights in the Progress dashboard and Hammer chat context.
- Hammer daily plan reads the differential and prescribes catch-up volume to the weaker side without the user asking.

## Implementation phases

1. **Foundations** — migration (new columns + `athlete_side_preferences` + grants/RLS), `SideContextProvider`, `<SideContextPicker />`, `useSideContext(discipline)` hook.
2. **Capture surfaces** — wire picker into video upload, drill save, goals, body check, game scoring, workouts. All writes inherit from context.
3. **Read surfaces** — add `L · R · Combined` tab to dashboard, scorecard, vault, splits, scout views, monthly report, parent view. Switch-hitter compare card on dashboard.
4. **Hammer & workouts** — daily plan + workout renderer consume side context; auto-balance volume from differential.
5. **Correlations & insights** — extend correlation engine, IQ insight card, Hammer chat system prompt to ingest side-split context.
6. **Onboarding & migration** — onboarding question + one-time backfill prompt for existing users with multi-side history.

## Out of scope
- No changes to non-switch users' UI beyond an invisible no-op.
- No destructive migrations; existing rows stay `null` side and render as today.

## Technical notes
- Provider lives in `src/contexts/SideContext.tsx`; persisted to `athlete_side_preferences` + `localStorage` mirror for instant render.
- Picker uses existing `ToggleGroup` shadcn primitive to match `SideToggle` styling already in `src/components/practice/SideToggle.tsx` — visual consistency, no new design tokens.
- All new SQL follows the standard CREATE → GRANT → RLS → POLICY pattern with `service_role` + `authenticated` grants scoped to `auth.uid()`.
