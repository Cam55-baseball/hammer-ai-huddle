

## Plan — Hydration Scoring Refinements + Future-Proofing

### Investigation summary
- Pipeline IS working for new logs (confirmed: `goat_milk` log at 18:43 has full `hydration_profile` with score 88, tier `optimal`).
- All 13 beverage rows are seeded correctly in `hydration_beverage_database`.
- Older `water` logs show `hydration_profile: null` because they were inserted **before** the migration. These are legacy and the UI correctly falls back to volume-only display.
- New water logs *will* score (≈71, "high" tier).

So there's no broken pipeline — but the user's checklist still needs the renames, clamping, scaffolding, and diagnostic logging to make failures obvious if they ever happen.

---

### Changes

#### 1. `src/utils/hydrationScoring.ts` — formula refinement + future fields

- Rename `sugar_penalty` → `sugar_score` everywhere (type, return shape, helper).
- Same logic (100 = low sugar, 0 = high sugar) but treated as positive contributor — formula stays mathematically identical, naming becomes consistent.
- **Hard clamp** Na/K/Mg sub-scores to 0–100 inside `scoreElectrolytes` (already clamped, but assert via `clamp()` on the final weighted sum too).
- Extend `HydrationProfile` with future-fields (always present, default `null`):
  ```ts
  glucose_g: number | null
  fructose_g: number | null
  osmolality_estimate: number | null
  absorption_score: number | null
  ```
- Refactor `generateInsight` into a registry: `insightProviders: InsightProvider[]` where each provider returns `{ priority, text } | null`. v1 keeps the existing water/electrolyte/sugar logic as the first three providers. Future providers (performance, activity, personalized) plug in without touching the engine.

#### 2. `src/hooks/useHydration.ts` — diagnostics + resilience

- Add structured logging behind a `[hydration]` prefix:
  - `bev` lookup result (or null + reason)
  - Computed profile object
  - Final insert payload (keys present)
  - Insert error/result
- Don't swallow lookup errors silently — keep the drink log working but `console.warn('[hydration] no beverage row for liquidType=…')` so we can detect missing seed data.
- Pass `glucose_g`/`fructose_g`/`osmolality_estimate`/`absorption_score` as nulls into `computeHydrationProfile` (already-scaffolded fields) so the JSONB profile always carries the same shape.

#### 3. Database migration — scaffold advanced columns

Add nullable columns to `hydration_logs`:
- `glucose_g numeric`
- `fructose_g numeric`
- `osmolality_estimate numeric`
- `absorption_score numeric`

No backfill, no constraints. Stored alongside existing nutrition columns; the `hydration_profile` JSONB also carries them.

#### 4. UI rename pass

- `src/components/nutrition-hub/HydrationLogCard.tsx` — `profile.sugar_penalty` → `profile.sugar_score` (display label stays "Sugar Score"). Add a tiny `Score` cell so users see why sugar moved the needle.
- `src/components/nutrition-hub/HydrationQualityBreakdown.tsx` — same rename, no visual change.
- `src/components/custom-activities/HydrationTrackerWidget.tsx` — no change (uses HydrationLogCard).

#### 5. Backwards compatibility for legacy profiles

`HydrationLogCard` reads `profile.sugar_score ?? profile.sugar_penalty` so the one already-stored profile (goat_milk 88) keeps rendering after the rename.

#### 6. End-to-end QA checklist (manual, post-deploy)

Log each of: Water (8oz), Coconut Water (8oz), Sports Drink (8oz), Soda (8oz). Verify:
- Score chip + tier render on every new log card
- Breakdown cells (Water %, Na, K, Mg, Sugar) populated
- Daily Average Hydration Score increments correctly
- Legacy water logs (pre-migration) still render volume-only with no errors

---

### Files

| File | Action |
|---|---|
| `src/utils/hydrationScoring.ts` | Rename `sugar_penalty`→`sugar_score`; clamp electrolyte sum; add 4 advanced null fields; refactor insight to provider registry |
| `src/hooks/useHydration.ts` | Add `[hydration]` diagnostic logs; pass advanced null fields; keep fallback safe |
| `src/components/nutrition-hub/HydrationLogCard.tsx` | Read `sugar_score` (with `sugar_penalty` legacy fallback); add Sugar Score cell |
| `src/components/nutrition-hub/HydrationQualityBreakdown.tsx` | Same rename |
| **Migration** | Add `glucose_g`, `fructose_g`, `osmolality_estimate`, `absorption_score` to `hydration_logs` |

### Out of scope
- Real glucose/fructose/osmolality math (scaffolded only, per request)
- Performance/activity/personalized insights (registry ready, no providers yet)
- Backfilling profile on legacy logs

