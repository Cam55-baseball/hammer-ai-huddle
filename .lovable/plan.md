
# Side Context (L/R) — Full E2E Completion Plan

Foundation already shipped: `SideContextProvider`, `SideContextPicker`, `SideViewTabs`, DB columns on `videos`/`vault_saved_drills`/`drill_assignments`/`pending_drills`/`athlete_body_goals`/`daily_standard_checks`/`calendar_events`/`mpi_scores`, plus wiring on `AnalyzeVideo` upload + drill save and `HammerDailyPlan` header. This plan finishes every remaining surface so L/R is a true app-wide theme.

## A. Capture surfaces (write `side`)

1. **Goals** — `CategoryGoalsStep` / `CategoryGoalsCard` and any `athlete_body_goals` insert: add a Side picker per goal (L / R / Both). Default Both for non-switch/ambi.
2. **Body check daily tests** (`daily_standard_checks`): add side toggle on relevant bilateral tests (grip, jump, single-leg, throwing velo). Persist `side`.
3. **Practice / GameSession results** — confirm existing dual-side writes still flow; add `SideContextPicker` where missing on drill-completion forms (`drill_assignments`, `pending_drills`).
4. **Scheduled events** (`calendar_events`): add side tag on bullpens / hitting cages so workload splits cleanly.
5. **MPI scores** (`mpi_scores.side`): stamp from `SideContext` at scoring time inside report-card pipeline (`src/lib/reportCard/*`).
6. **Saved drills from non-AnalyzeVideo surfaces** (Vault, library): pass `side` to `saveDrill` everywhere it's called.

## B. Render surfaces (read & filter by `side`)

1. **Video Library / Player's Club** — add `SideViewTabs` ("L · R · Both") above the user's own video list; filter `videos.batting_side` / `throwing_hand`.
2. **Progress Dashboard** (`ProgressLanding.tsx` + `correlations.ts`):
   - Mount `SideViewTabs` in the topic header for hit/throw topics.
   - Update `correlations.ts` to compute L-only, R-only, and Combined deltas; surface "Side differential" insight cards (e.g., "Bat speed +6% R vs L").
3. **Report card / Scorecard** — split tiles by side when both sides have data; show a "Differential" badge if delta exceeds threshold.
4. **Hammer Daily Plan rendering** — `dailyPlan.ts` chooses side-targeted blocks: if differential > X% or a side goal is set, prescribe the weaker side more reps; render side chip on each block.
5. **Workout rendering** — for bilateral lifts, surface per-side prescription pulled from the latest side-specific deficits.
6. **Goal cards** — show L/R/Both badge and per-side progress bars.

## C. Correlation & intelligence

1. New `src/lib/side/sideDifferential.ts`:
   - `computeSideDifferential(metric, window)` → `{ left, right, delta, sampleSize, confidence }`.
   - Confidence-bounded per existing AR-1/DG-1 invariants — never collapse missingness.
2. Hammer reasoning: feed differential into block selection and into "Ask Hammer" prompts ("Why is my right-side bat speed lower?").
3. Insight surfaces: `SideDifferentialCard` for the dashboard + a thin pill on the Hammer plan when a meaningful gap exists.

## D. Plumbing / hygiene

1. `SideContextPicker` variant flags: add a real `compact` prop (icon-only L/R, h-6) for tight headers (fixes the earlier shim).
2. `useSideContext` selectors: add `getSideFor(discipline, fallback)` helper so non-React code paths (e.g. report-card builders) can read context-equivalent defaults.
3. Persist `last_used_side` on every successful write (already in provider, but wire from Goals / Body Check writes too).
4. Type-safety: extend generated supabase types usage with local `as any` only where columns are new; tighten once types regen.
5. Lints / guards:
   - Add `scripts/lint-side-context.ts` to flag video/drill/goal inserts that omit `side` when picker should show.
   - RLS: confirm new columns inherit existing per-row policies (no policy change needed; verify).

## E. UI/UX rules (clutterless)

- Picker auto-hides when `is_switch_hitter`/`is_ambidextrous_thrower` is false for that discipline — single source of truth.
- One picker per page max in the header; downstream surfaces inherit silently.
- Aggregate read views default to **Combined** with a one-tap split into L / R.
- Color tokens only — no hardcoded colors; reuse `primary`/`muted` semantic tokens.

## F. Verification

1. Playwright run as a switch-hitter test user: upload L video → toggle R → upload R → confirm Video Library tabs split, dashboard shows differential, Hammer plan rebalances toward weaker side.
2. Edge-function check: report-card pipeline emits `side` on `mpi_scores` insert; replay-safe (no silent missingness collapse).
3. Non-switch athlete sanity: picker hidden everywhere; nothing in UI changes.

## Technical notes

- Files to add: `src/lib/side/sideDifferential.ts`, `src/components/shared/SideDifferentialCard.tsx`, `scripts/lint-side-context.ts`.
- Files to edit: `CategoryGoalsStep.tsx`, `CategoryGoalsCard.tsx`, `BodyCheckForm` (daily standard checks), `GameSessionFields.tsx` (already side-aware — verify), drill-completion forms, `VideoLibrary.tsx`, `ProgressLanding.tsx`, `correlations.ts`, `dailyPlan.ts`, `HammerDailyPlan.tsx` (block chips), report-card builders in `src/lib/reportCard/*`, `SideContextPicker.tsx` (add `compact`), `SideContext.tsx` (add `getSideFor`).
- No new tables. No RLS changes. Additive-only, replay-safe, subordinate to existing invariants.
