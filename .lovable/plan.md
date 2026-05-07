## Season Phase E2E Regression Tests

Add a focused regression suite that locks in the season phase contract end-to-end: resolver, workout clamps, nutrition macro tilts, and hammer-state thresholds. Pure unit/integration style (vitest + Deno test) — no live network.

### Scope

Cover all 4 phases (`preseason`, `in_season`, `post_season`, `off_season`) plus the `default` fallback for each layer below.

### 1. Resolver tests — `src/test/seasonPhase.test.ts`

Targets `resolveSeasonPhase` + `getSeasonProfile` from `src/lib/seasonPhase.ts`:
- Returns `off_season` / `source: 'default'` when settings are null/empty.
- Date-window match for each of preseason / in_season / post_season returns correct phase, `source: 'date_window'`, and sane `daysIntoPhase` / `daysUntilNextPhase`.
- Falls back to `season_status` when no window matches → `source: 'stored'`.
- Invalid `season_status` falls back to `off_season` default.
- `SEASON_PROFILES` invariants per phase: `maxSetsPerExercise`, `maxHighCnsPerWeek`, `volume`, `intensity`, `newSkillWork` match the documented contract (in-season ≤ 4 sets / ≤ 1 high-CNS, post-season 0 high-CNS, off-season highest caps).

### 2. Workout filtering tests — `src/test/seasonWorkoutClamps.test.ts`

Extract the clamp logic used by `generate-training-block` and `adapt-training-block` into a small pure helper (or import the existing helper if already exported) and assert:
- A generated block with 8 sets/exercise is clamped to `profile.maxSetsPerExercise` per phase.
- A week containing 4 high-CNS sessions is trimmed to `profile.maxHighCnsPerWeek` (in-season → 1, post-season → 0).
- `adapt-training-block` deload threshold returns `true` at RPE ≥ phase threshold (in-season 7.5, off-season 8.5) and `false` below.
- In-season / post-season blocks reject volume-increase suggestions; off-season / preseason allow them.

If the clamp is currently inline in the edge function, the test file imports a thin wrapper added to `_shared/seasonPhase.ts` (no behavior change) so both edge runtime and vitest can reuse it.

### 3. Nutrition tilt tests — `supabase/functions/suggest-meals/index.test.ts` (Deno)

Targets `PHASE_MACRO_TILTS` applied inside `suggest-meals`:
- Pre-season: carbs delta ≈ +8%, protein ≈ +5%.
- In-season: carbs ≈ +5%, hydration steering flag set on game/practice days.
- Post-season: carbs ≈ -10%, protein ≈ +5%, anti-inflammatory bias flag set.
- Off-season: no tilt (baseline macros preserved).
- Snapshot the tilt application against a fixed baseline `{carbs: 300, protein: 150, fat: 80}` to lock numeric output.

If the tilt map isn't exported, export it (and the apply function) from the edge module without changing runtime behavior.

### 4. Hammer-state threshold tests — `supabase/functions/compute-hammer-state/index.test.ts` (Deno)

Targets `PHASE_THRESHOLDS` in `compute-hammer-state`:
- For an identical CNS/load fixture, off-season returns `Prime`/`Ready` while in-season and post-season return a more conservative state (~15% tighter ceilings).
- Threshold values for in-season / post-season are within 13–17% of off-season baseline (lock the ratio, not the exact number).
- Explanation payload contains the resolved `phase` string.

### 5. Cross-layer integration test — `src/test/seasonPhaseE2E.test.ts`

One test per phase that walks a fixture user through the chain in-process:
1. `resolveSeasonPhase(settings)` → phase
2. `getSeasonProfile(phase)` → profile
3. Apply workout clamp helper → asserts capped output
4. Apply nutrition tilt helper → asserts macro shift
5. Apply hammer-state threshold helper → asserts state tier

This guards against drift between the four layers (e.g. resolver returns `in_season` but nutrition still applies preseason tilt).

### Out of scope

- Live edge function HTTP calls (covered by existing curl-based smoke tests).
- HIE prescriptive filtering tests (already partly covered by `engine-invariants.test.ts`; can be added in a follow-up).
- UI snapshot tests for `SeasonPhaseChip` (visual; not regression-critical).

### Technical notes

- Vitest tests run via the existing `vitest.config.ts`; no config changes needed.
- Deno tests follow the project's existing pattern (`*_test.ts` with `dotenv/load.ts`) but these are pure unit tests, so no env required — they import the helpers directly.
- Where helpers are currently inlined inside edge functions, export them as named exports without altering call sites. No behavioral changes.
- Use frozen date (`vi.setSystemTime`) in resolver tests for deterministic date-window assertions.
