## Remaining Season Phase E2E Items

Wrap up the four deferred pieces from the prior pass so Season Phase is fully wired.

### 1. Database: `season_context_overridden`

Migration on `performance_sessions`:
- Add `season_context_overridden boolean NOT NULL DEFAULT false`
- Set to `true` whenever the athlete picks a season in `SessionConfigPanel` that differs from `resolvedPhase` from `useSeasonStatus`
- Used by analytics + recap to know the session's phase came from the athlete, not the profile

### 2. HIE phase filters

Files: `supabase/functions/hie-analyze/index.ts`, `supabase/functions/hie-verify/index.ts`, `supabase/functions/nightly-hie-process/index.ts`, `supabase/functions/_shared/contextEngine.ts`, `supabase/functions/_shared/interpretationProfiles.ts`.

- Resolve phase via shared `resolveSeasonPhase` at the top of every HIE entrypoint and pass `phase` into `contextEngine` + `interpretationProfiles`.
- **In-Season:** suppress any "introduce new tool development / mechanical overhaul" recommendations. Cap intervention severity to "refine / maintain". Verify protocols default to low-CNS variants.
- **Pre-Season:** lower `min_context_reps` (game 5 → 3, practice 5 → 3) so ramp-up athletes get earlier guidance. Allow tool development.
- **Post-Season:** bias toward mobility / restorative interventions; suppress velocity/intensity pushes.
- **Off-Season:** full menu of interventions, including aggressive overhauls.
- Log resolved `phase` + `source` on every HIE run row for QA.

### 3. Nutrition & recovery phase shifts

Files: `supabase/functions/suggest-meals/index.ts`, `supabase/functions/compute-hammer-state/index.ts`.

`suggest-meals`:
- Read phase from shared resolver.
- Macro tilts (applied as percentage shifts on the existing per-athlete target, not absolute overrides):
  - **Pre-Season:** +8% carbs, +5% protein (build + fuel ramp).
  - **In-Season:** +5% carbs on game/practice days, tighter hydration floor, prioritize fast-digest pre-game options.
  - **Post-Season:** −10% carbs, +5% protein, emphasize anti-inflammatory foods.
  - **Off-Season:** baseline; allow surplus if goal = mass.
- Pass phase into the AI prompt so meal rationale references it ("Pre-season ramp — extra carbs to support volume").

`compute-hammer-state`:
- Tighter CNS ceilings in-season (drop the high-load threshold by ~15%) so Hammer flips to "deload" sooner.
- Pre-season: allow higher sustained CNS before flagging.
- Phase string included in the explanation payload for `hammer_state_explanations_v2`.

### 4. Dashboard UI: phase chip + tooltips

Files: new `src/components/season/SeasonPhaseChip.tsx`; mount in `src/components/dashboard/DashboardHeader.tsx` (or equivalent) and in `PracticeHub.tsx` header.

- Chip shows `Pre-Season · Day 12` / `In-Season · 4 wks left` etc., color-coded per phase.
- Click → small popover: current phase, days into phase, days until next, "Edit season dates" link to profile.
- "Why this changed" tooltip on adapted training blocks and HIE recommendations: surface the phase that drove the decision (reads `generation_metadata.season_phase` / HIE log `phase`).

### 5. Telemetry & QA

- Persist `season_phase` + `season_phase_source` into `generation_metadata` (training blocks), HIE run logs, and meal suggestion logs.
- Manual smoke test matrix: one athlete per phase → generate block, run HIE, request meals, open dashboard, start a practice session. Confirm phase visible everywhere and constraints applied.

### Out of scope (still)

- Auto-detecting phase from external sport calendars.
- Coach dashboard rollups by phase.
- Retroactive re-scoring of past sessions/meals.
