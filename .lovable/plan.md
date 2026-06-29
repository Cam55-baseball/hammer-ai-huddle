## Side Context (L/R) — Slices 2→6 Straight-Through Plan

Chain all five remaining slices in order, no pause between. Additive-only, subordinate to every prior invariant, zero behavior change for non-switch/ambi athletes.

---

### Slice 2 — Render completion (filter + split by `side`)
- `src/pages/VideoLibrary.tsx`: mount `SideViewTabs` above user's own-video grid, filter by `batting_side` for hit-category videos and `throwing_hand` for throw-category videos. Auto-hides when athlete isn't switch/ambi.
- Hitting progress panel (mirror existing `PitchingPanel` tab pattern): add `SideViewTabs` header, filter MPI + drill history by `side`.
- Throwing progress panel: same treatment.
- `CategoryGoalsCard.tsx`: render L/R/Both badge per goal, split progress bar when goal has per-side rows.
- Workout block renderer: extend existing Hammer `BlockSideBadge` pattern to bilateral lift blocks (back squat → unilateral split = side chip; barbell bench → no chip).
- Bilateral inputs in `daily_standard_checks` form (grip, single-leg jump, throwing velo) get a side toggle inheriting from header.
- `calendar_events` create/edit form gets optional Side tag for bullpens / cage work.

### Slice 3 — Intelligence layer (differential drives decisions)
- Mount `SideViewTabs` in `ProgressLanding` topic headers for hit + throw topics.
- Extend `src/lib/progress/correlations.ts` to compute L-only / R-only / Combined slices alongside existing combined `pearson`.
- New `src/components/progress/SideDifferentialCard.tsx`: surfaces on dashboard only when `computeSideDifferential` returns non-null (≥ MIN_PER_SIDE both sides). Never invents data.
- `src/lib/hammer/dailyPlan.ts`: read `computeSideDifferential` for swing tempo / throw velo / grip; bias rep count toward weaker side when delta is real, otherwise no-op.
- Ask Hammer prompt builder: append a single context line when meaningful differential exists ("Left swing tempo 14% slower than right, n=7/8").
- Report card builders in `src/lib/reportCard/*`: stamp `mpi_scores.side` from source data (video `batting_side` / `throwing_hand` or session side) inside the nightly scorer entry — NOT browser-side. When both sides have ≥ MIN_PER_SIDE data, render per-side tiles + "Differential" badge.

### Slice 4 — Plumbing, hygiene, type-safety
- `scripts/lint-side-context.ts`: AST-scan for `.insert(...)` / `.upsert(...)` on `videos`, `vault_saved_drills`, `drill_assignments`, `pending_drills`, `athlete_body_goals`, `daily_standard_checks`, `mpi_scores`, `calendar_events`. Fail when call lives in a file that also imports `SideContextPicker` or `getSideFor` and omits `side` in the payload.
- Confirm RLS inheritance — no policy change required because new columns ride existing `user_id`-scoped policies. Written confirmation: `.lovable/side-context-rls-confirmation.md`.
- Wire `last_used_side` upsert on Goals + Body Check writes (today only the header writes it).
- Once Supabase types regenerate post-Slice-1 migration cycle, remove `as any` casts in `SideContext` and Goals hook.

### Slice 5 — Playwright E2E (switch-hitter + ambi-thrower)
- `tests/e2e/side-context/switch-hitter.spec.ts` — headless Chromium against `http://localhost:8080`, restore managed Supabase session per browser-use rules:
  1. Sign in switch-hitter test fixture.
  2. Upload L hitting video → toggle picker to R → upload R → assert Library tabs split correctly.
  3. Trigger report card render → assert per-side tiles + Differential badge.
  4. Open Hammer plan → assert weaker-side rep bias chip visible.
  5. Sanity sweep as non-switch user → assert zero pickers rendered, zero behavior change.
  6. Screenshots → `/tmp/browser/side-e2e/`.

### Slice 6 — Mastery seal (zero-regression lock)
- `.github/workflows/side-context-regression.yml` — runs `lint-side-context.ts` + Playwright spec on every PR.
- `.lovable/side-context-mastery.md` — full surface inventory (7 capture tables, 5 render surfaces, 3 intelligence consumers), invariants ("non-switch athletes see nothing", "differential silent below MIN_PER_SIDE", "additive-only"), do-not-regress rules.
- Wire `lint-side-context.ts` into `scripts/preflight.sh` alongside existing invariant grep.
- Final grep audit of all inserts to the 7 side-aware tables; attach grep evidence to mastery doc.

---

### Risk posture (unchanged from prior plan)
- Additive-only — no removed columns, no policy mutation.
- Replay-safe — every new write rides canonical inserts; no parallel surfaces.
- Confidence-bounded — differential silent below `MIN_PER_SIDE`.
- Lint + CI + Playwright together make regressions structurally blocked.

### Technical artifacts
**Add**: `SideDifferentialCard.tsx`, `scripts/lint-side-context.ts`, `tests/e2e/side-context/switch-hitter.spec.ts`, `.github/workflows/side-context-regression.yml`, `.lovable/side-context-mastery.md`, `.lovable/side-context-rls-confirmation.md`.
**Edit**: `VideoLibrary.tsx`, Hitting + Throwing progress panels, `CategoryGoalsCard.tsx`, Workout block renderer, body-check form, calendar event form, `ProgressLanding.tsx`, `correlations.ts`, `dailyPlan.ts`, Ask Hammer prompt builder, `src/lib/reportCard/*` scorer entry, `scripts/preflight.sh`.

After Slice 6 ships and E2E is green, the Side Context system is sealed: every capture writes side, every render filters by side, every intelligence layer reasons on per-side deltas, and CI structurally blocks regressions forever.
