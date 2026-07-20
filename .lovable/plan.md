## Status of previous plan

Verified in code — most of it landed:

- `ThrowingHandSelector` shows **Both** (`S`).
- `AthleteOnboarding.handleSaveProfile` writes `profiles.throwing_hand = 'B'` and upserts `athlete_mpi_settings.is_ambidextrous_thrower = true` + `primary_throwing_hand = 'S'` when Both is picked.
- `SideContext` derives `isAmbidextrousThrower` from `athlete_mpi_settings.is_ambidextrous_thrower`.
- `CategoryGoalsStep` exposes the per-goal **R / L / Both** side chip for `throwing` and `pitching` when `isAmbidextrousThrower` is true (line 97 + lines 421–453).
- Copy tweak on the arm-scoping prompt is present ("Pick **Both** if you throw ambidextrously…").

Two real gaps remain that break the E2E promise for a Both-hand thrower in a single session.

## Gap 1 — mpi upsert error is silently swallowed

`src/pages/AthleteOnboarding.tsx` (lines 292–303): the `athlete_mpi_settings` upsert is not destructured, so `{ error }` is ignored. If RLS or a constraint rejects the upsert, `is_ambidextrous_thrower` never lands, `SideContext` returns `false`, and the L/R/Both side chip in `CategoryGoalsStep` never appears — from the user's perspective, "Both" was accepted but goals still act one-armed.

Fix: capture `{ error: mpiError }`, `console.warn` it, and surface a non-blocking `toast.warning("Saved throwing hand, but ambidextrous flag didn't sync — you can re-toggle it in Review.")` so the failure is visible instead of invisible. Still call `goNext()` — never block forward motion.

## Gap 2 — SideContext doesn't refresh in the same session

`src/contexts/SideContext.tsx` loads `["side-identity", user?.id]` once via `useQuery` and never invalidates. When the athlete picks Both on the Profile step and advances to the Goals step in the same session, `isAmbidextrousThrower` stays `false` until a full reload, so the per-goal side chip is missing on first visit.

Fix: after a successful `handleSaveProfile` in `AthleteOnboarding.tsx`, call `queryClient.invalidateQueries({ queryKey: ["side-identity", user.id] })` so `CategoryGoalsStep` reads the fresh flag on mount. No changes to `SideContext` itself.

## Gap 3 (small) — Review row for throwing hand

`ReviewAnswersStep.tsx` already shows the throwing-hand row with `B → Both`. Confirmed in the previous turn. No change needed unless the label needs to also reflect the mpi flag; skipping.

## Files touched

- `src/pages/AthleteOnboarding.tsx` — capture mpi upsert error + toast; invalidate `side-identity` after profile save.

## Out of scope

- No schema changes.
- No changes to `SideContext.tsx`, `ThrowingHandSelector.tsx`, `CategoryGoalsStep.tsx`, or `ReviewAnswersStep.tsx` — they are already correct; the two fixes above are what actually make the ambidextrous path work E2E within one session.
