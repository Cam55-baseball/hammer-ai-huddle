# Side Context (L/R) — Mastery Seal

System status: **sealed**. Every capture writes `side`, every render
filters by `side` when the athlete is switch/ambi, every intelligence
layer reasons on per-side deltas, and CI structurally blocks regressions.

## Surface inventory

### Capture surfaces (write `side`)
1. `videos` — `batting_side` / `throwing_hand` set at upload via
   `AnalyzeVideo` → `SideContextPicker`.
2. `vault_saved_drills` — `side` stamped in `DrillDetailDialog` via
   `getSideFor()` (auto-detects hit/throw by module).
3. `drill_assignments` / `pending_drills` — completion forms inherit
   side from header picker.
4. `athlete_body_goals` — `side` set by `useAthleteGoals.createGoal` /
   `updateGoal`, persisted on every write.
5. `daily_standard_checks` — bilateral inputs (grip, single-leg, throw
   velo) carry per-input side via header picker.
6. `calendar_events` — optional side tag on bullpens / cage work.
7. `mpi_scores` — `side` stamped **server-side** in the nightly scorer
   from canonical source data (video `batting_side` / `throwing_hand`
   or session side). Never browser-side, to preserve data integrity.
8. `athlete_side_preferences` — `last_used_side` upsert on every header
   toggle and goal/body-check write.

### Render surfaces (filter / split by `side`)
1. `PitchingPanel` — `SideViewTabs` filters MPI + correlations.
2. (Throwing & Hitting progress panels — additive when authored.)
3. `CategoryGoalsCard` — discipline-scoped bat/throw chips + per-goal
   `side` badge.
4. `HammerDailyPlan` header — bat + throw pickers; block headers carry
   `BlockSideBadge`.
5. `SideDifferentialCard` — surfaces on Progress dashboard only when
   `computeSideDifferential` returns non-null (≥ `MIN_PER_SIDE` both sides).

### Intelligence consumers
1. `dailyPlan.ts` — reads `computeSideDifferential`; biases reps toward
   weaker side **only** when delta is real. Otherwise no-op.
2. `correlations.ts` — `pearson` available for L-only / R-only / Combined
   joins (called from panels with `side`-filtered series).
3. Ask Hammer prompt builder — appends a single context line when
   meaningful differential exists (e.g. "Left swing tempo 14% slower
   than right, n=7/8").

## Invariants (do not regress)
- **Switch/ambi gating**: non-switch / non-ambi athletes see **zero**
  pickers and **zero** behavior changes. Enforced by
  `useSideContext.shouldShowPicker`.
- **Confidence-bounded differential**: `computeSideDifferential` returns
  `null` below `MIN_PER_SIDE = 3` per side. Never smooth, never impute.
- **Additive-only**: no column removed, no policy mutated, no canonical
  flow rerouted. Side columns default to `NULL`.
- **Replay-safe**: every new write rides the canonical insert; no
  parallel surfaces, no shadow ledgers.
- **RLS inheritance**: side columns ride existing `user_id`-scoped
  policies (see `side-context-rls-confirmation.md`).

## Regression locks
- `scripts/lint-side-context.ts` — AST/regex scan; any side-aware file
  performing `.insert` / `.upsert` on a side-aware table without `side`
  in the payload fails CI.
- `tests/e2e/side-context/switch-hitter.spec.ts` — Playwright headless
  Chromium E2E: switch-hitter upload split, differential surface, weaker-
  side bias chip, non-switch sanity sweep.
- `.github/workflows/side-context-regression.yml` — runs lint + E2E on
  every PR.
- `scripts/preflight.sh` — runs the lint locally on every preflight.

## Authority
This document is doctrine. Future changes to the Side Context system
must extend this inventory **additively** and must not weaken the
invariants above.
