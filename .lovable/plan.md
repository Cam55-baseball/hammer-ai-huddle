
# Make Season Phase Truly End-to-End

Today the Pre-/In-/Post-Season selector only nudges the **Nightly Recap narrative** and adds a single line to the **Training Block** prompt. Practice sessions ignore it (they ask the user to re-pick season per session) and the engines that drive AI chat, recovery suggestions, HIE analysis, and adaptation never read it. This plan wires the phase into every surface that prescribes work or talks to the athlete.

## 1. Centralize phase resolution

Create a single shared resolver `resolveSeasonPhase(mpiSettings, today)` used by both the client (`useSeasonStatus`) and edge functions:

- Date-window match wins over stored `season_status` (same logic that already exists in `contextEngine.ts` and `useSeasonStatus.ts` — extract once).
- Returns `{ phase, daysIntoPhase, daysUntilNextPhase, source: 'date_window' | 'stored' | 'default' }`.
- Client copy lives in `src/lib/seasonPhase.ts`. Edge copy lives in `supabase/functions/_shared/seasonPhase.ts`. Identical logic, zero drift.

## 2. Phase-aware **training block generation** (`generate-training-block`)

Replace the single prompt line with a structured directive block driven by phase:

| Phase | Volume | Intensity | CNS cap/day | Recovery emphasis | New skill work |
|---|---|---|---|---|---|
| Pre-Season | high | rising | medium-high | medium | high |
| In-Season | low | maintenance | low | high | low (refinement only) |
| Post-Season | low | very low | very low | very high | rebuild/mobility |
| Off-Season | high | high | high | medium | high |

These caps become hard constraints in the generation prompt **and** post-generation validators (clamp `sets`, `weight`, and `cns_demand` if the model overshoots).

## 3. Phase-aware **adaptation** (`adapt-training-block`, `suggest-adaptation`)

- Pass current phase + days remaining in phase into the adaptation prompt.
- In-Season: bias toward deload, never propose new mechanical changes.
- Pre-Season: bias toward ramp-up volume.
- Post-Season: bias toward mobility/rest swaps.
- Off-Season: allow aggressive overhauls.

## 4. Phase-aware **AI chat** (`ai-chat`)

- Inject `season_phase` and `days_into_phase` into the system prompt.
- Add tone guidance (reuse `interpretationProfiles.ts`, lift it to `_shared/`).
- Hammer should refuse to prescribe in-season mechanical overhauls and instead suggest queuing them for off-season.

## 5. Phase-aware **HIE analysis** (`hie-analyze`, `hie-verify`, `nightly-hie-process`)

- Read phase from MPI settings.
- Suppress "introduce new tool development" interventions when in-season; convert them to "stabilize current tool."
- Lower context-required reps in pre-season (athletes have fewer game reps).

## 6. Phase-aware **recovery & nutrition signals**

- `suggest-meals`: shift macro emphasis (pre-season → build, in-season → recovery carbs, post-season → maintenance, off-season → growth).
- Regulation/recovery thresholds: in-season uses tighter CNS load ceilings before throttling; off-season relaxes.
- Hammer state explanations include the phase so it doesn't flag in-season low volume as under-training.

## 7. Practice Hub auto-fill

- `useSessionDefaults` reads `season_status` from `useSeasonStatus()` and uses it as the default for `season_context` on every new session.
- The `SeasonContextToggle` stays editable (one-off override).
- If user changes it, we tag the session with `season_context_overridden = true` so engines know it was a manual override.

## 8. Visibility & education

- Add a small **active-phase chip** to the dashboard header ("Pre-Season • day 12/45") so users always know what the engine thinks.
- Add a one-line "Why this changed" tooltip on workouts/recap/AI replies that depend on phase.

## 9. Telemetry & QA

- Log resolved phase + source on every engine run into `audit_log` for debugging the "why is my plan light?" questions.
- Add a unit test for `resolveSeasonPhase` covering: date-window match, stored fallback, today inside multiple windows (date-window wins), no settings (default off-season).
- Add an integration smoke test that flipping `season_status` to `in_season` produces a generated block with lower total weekly volume than `off_season` for the same user.

---

## Files touched

**New**
- `src/lib/seasonPhase.ts`
- `supabase/functions/_shared/seasonPhase.ts`
- `supabase/functions/_shared/seasonProfiles.ts` (lifted from `generate-vault-recap/interpretationProfiles.ts` with volume/intensity caps added)
- `src/components/dashboard/SeasonPhaseChip.tsx`
- `src/lib/__tests__/seasonPhase.test.ts`

**Modified — client**
- `src/hooks/useSeasonStatus.ts` — use shared resolver, expose `daysIntoPhase`
- `src/hooks/useSessionDefaults.ts` — auto-fill `season_context` from current phase
- `src/components/practice/SessionConfigPanel.tsx` — show "from your profile" hint, mark override
- `src/pages/PracticeHub.tsx` — pass `season_context_overridden`
- Dashboard header (role-specific views) — mount `SeasonPhaseChip`

**Modified — edge functions**
- `generate-training-block/index.ts` — phase-driven volume/intensity directives + post-gen clamp
- `adapt-training-block/index.ts`, `suggest-adaptation/index.ts` — phase context in prompts
- `ai-chat/index.ts` — phase + tone in system prompt
- `hie-analyze/index.ts`, `hie-verify/index.ts`, `nightly-hie-process/index.ts` — phase-aware intervention filters and rep thresholds
- `suggest-meals/index.ts` — phase-driven macro emphasis
- `compute-hammer-state/index.ts` — phase-aware "low volume is fine" path
- `generate-vault-recap/contextEngine.ts` & `interpretationProfiles.ts` — switch to shared module

**Schema**
- Add `season_context_overridden boolean default false` to `performance_sessions` (migration).
- No other schema changes — `athlete_mpi_settings` already holds everything we need.

## Out of scope
- Auto-detecting phase from a sport calendar (still date-window driven by user input).
- Coach-level dashboards for team season phase.
- Past sessions are not retroactively re-scored by the new phase signal.
