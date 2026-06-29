## Side Context (L/R) — Finish-to-Mastery Plan

**Total remaining work: 6 slices.** After Slice 6, every capture surface writes `side`, every render surface filters by `side`, Hammer + Workouts + Report Card + Ask Hammer all reason on per-side deltas, lints + Playwright E2E lock it in place, and non-switch/ambi athletes see zero new UI. I'll offer to continue automatically after each slice — you say "next slice" and I keep going until Slice 6 ships and the E2E is green.

Each slice is **additive-only, replay-safe, subordinate to all prior invariants**, scoped so it cannot regress prior shipped work (foundation, AnalyzeVideo, saveDrill, HammerDailyPlan header, PitchingPanel tabs, CategoryGoalsCard hints all stay untouched except where explicitly extended).

---

### Slice 1 — Capture completion (write `side` everywhere)
Goal: no capture surface silently drops side.

- `CategoryGoalsStep` / `athlete_body_goals` writes → per-goal Side picker (L/R/Both), default Both for non-switch/ambi.
- `daily_standard_checks` body-check form → side toggle on bilateral tests (grip, jump, single-leg, throwing velo).
- `drill_assignments` + `pending_drills` completion forms → `SideContextPicker` inheriting from header.
- `calendar_events` create/edit (bullpens, cage work) → optional side tag.
- `mpi_scores.side` → stamped from `getSideFor()` inside `src/lib/reportCard/*` scorer entry.
- Audit every remaining `saveDrill` callsite (Vault, library, IQ) → pass `side`.
- Add `compact` prop (real, not shim) to `SideContextPicker` for tight rows.

### Slice 2 — Render completion (filter + split by `side`)
- `VideoLibrary.tsx` → `SideViewTabs` above user's own videos, filters `batting_side` / `throwing_hand`.
- Hitting progress panel → `SideViewTabs` (mirror PitchingPanel pattern).
- Throwing progress panel → `SideViewTabs`.
- Goal cards → L/R/Both badge + per-side progress bars.
- Hammer block headers already show side chip — extend to Workout block rendering for bilateral lifts.

### Slice 3 — Intelligence layer (differential drives decisions)
- Mount `SideViewTabs` in `ProgressLanding` topic headers (hit/throw).
- Extend `correlations.ts` to compute L-only / R-only / Combined deltas.
- New `SideDifferentialCard.tsx` surfaced on dashboard when delta exceeds confidence-bounded threshold (uses existing `sideDifferential.ts`, never collapses missingness).
- `dailyPlan.ts` reads `computeSideDifferential` → biases reps toward weaker side when gap is real (n ≥ MIN_PER_SIDE).
- "Ask Hammer" prompt builder appends side-differential context line when meaningful.
- Report card / scorecard → per-side split tiles when both sides have data + "Differential" badge.

### Slice 4 — Plumbing, hygiene, type-safety
- `scripts/lint-side-context.ts` — flags inserts to `videos` / `vault_saved_drills` / `drill_assignments` / `pending_drills` / `athlete_body_goals` / `daily_standard_checks` / `mpi_scores` that omit `side` when picker is visible.
- Verify RLS inheritance on new columns (no policy change expected — written confirmation in `.lovable/`).
- `last_used_side` persistence wired from Goals + Body Check writes (not just header).
- Tighten `as any` casts once supabase types regenerate.

### Slice 5 — Playwright E2E (switch-hitter + ambi-thrower)
Headless Chromium run against localhost:
1. Sign in as switch-hitter test user (managed Supabase session).
2. Upload L hitting video → toggle R → upload R → assert Video Library tabs split correctly.
3. Trigger report card → assert per-side tiles + differential badge present.
4. Open Hammer plan → assert weaker-side rep bias visible in block chips.
5. Non-switch athlete sanity sweep → assert zero pickers, zero behavior change.
6. Screenshots saved under `/tmp/browser/side-e2e/` for proof.

### Slice 6 — Mastery seal (zero-regression lock)
- Add `.github/workflows/side-context-regression.yml` running the Playwright spec + lint on every PR.
- `.lovable/side-context-mastery.md` — full surface inventory, invariants, "do-not-regress" rules.
- Wire `lint-side-context.ts` into `scripts/preflight.sh`.
- Final audit pass: grep every insert into the 7 side-aware tables, confirm 100% coverage, attach grep results to the doc.

---

### Risk posture
- **Additive-only**: no column removal, no policy mutation, no behavior change for non-switch/ambi.
- **Replay-safe**: every new write goes through canonical inserts; no parallel surfaces.
- **Confidence-bounded**: differential never invents data — below `MIN_PER_SIDE` it stays silent.
- **Lint + CI + Playwright** together make future regressions structurally blocked, not just discouraged.

### Technical files added/edited
**Add**: `SideDifferentialCard.tsx`, `scripts/lint-side-context.ts`, `tests/e2e/side-context/switch-hitter.spec.ts`, `.github/workflows/side-context-regression.yml`, `.lovable/side-context-mastery.md`.
**Edit**: `CategoryGoalsStep.tsx`, `CategoryGoalsCard.tsx`, body-check form, drill-completion forms, `VideoLibrary.tsx`, Hitting/Throwing progress panels, `ProgressLanding.tsx`, `correlations.ts`, `dailyPlan.ts`, report card builders in `src/lib/reportCard/*`, `SideContextPicker.tsx` (real `compact`), Workout block renderer, Ask Hammer prompt builder.

---

**Shall I start Slice 1 now and continue automatically through Slice 6 until the system is sealed?** Say "go" and I'll ship Slice 1, then pause for your "next" between each — or say "go straight through" and I'll chain all 6 without stopping.