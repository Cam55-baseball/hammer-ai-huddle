

## Plan — Micronutrients for Liquids in Hydration Quality

### Goal
Extend hydration logs to carry micronutrients (Vit C, B-vits, Ca, Fe, Mg, K, Zn, etc.) and surface a daily aggregate in the Hydration Quality block.

### 1. Edge function — extend `analyze-hydration-text`
Add to the `analyze_beverage` tool schema a `micros_per_oz` object with the same 13 keys used by `parse-food-text`:
`vitamin_a_mcg, vitamin_c_mg, vitamin_d_mcg, vitamin_e_mg, vitamin_k_mcg, vitamin_b6_mg, vitamin_b12_mcg, folate_mcg, calcium_mg, iron_mg, magnesium_mg, potassium_mg, zinc_mg` (per fl oz, all required).

System prompt addition: USDA-style estimates per oz, 0 only if truly negligible. Examples: orange juice → high vit C/folate/K; milk → Ca/D/B12; coffee → tiny K/Mg; plain water → all 0.

Sanitize/clamp to sane caps (e.g. vit C ≤ 100 mg/oz). Magnesium/potassium already returned at top-level — keep both for backwards compat with scoring; mirror inside `micros_per_oz` too.

### 2. Preset beverages — micros source
Two paths:

**a)** Extend `hydration_beverage_database` with a `micros_per_oz jsonb` column (migration). Seed common drinks (water=zeros, milk, OJ, coffee, tea, Gatorade, soda, coconut water) with USDA values. New rows fall back to zeros.

**b)** For unseeded preset rows, add a one-shot enrichment: when `useHydration` reads a beverage with NULL `micros_per_oz`, call a new lightweight edge function `analyze-hydration-preset` (same schema as #1 but takes a beverage name) and persist back to the row. Owner-only path or cached at first lookup so we never re-pay.

v1 implements (a) seeded; (b) deferred unless needed.

### 3. Schema migration — `hydration_logs`
Add `micros jsonb` (nullable). Stores the multiplied-out totals for that single log (per-oz × amount_oz). Keeps reads cheap — no recompute from beverage db on render.

### 4. `useHydration.ts`
- On insert (preset path): multiply preset `micros_per_oz` × `amount_oz` → store in `micros`.
- On insert (AI/other path): multiply `aiNutrition.micros_per_oz` × `amount_oz` → store in `micros`.
- Expose new aggregates from today's logs:
  - `totalHydrationMicros: Record<MicroKey, number>` (summed across today's hydration logs).

### 5. `HydrationQualityBreakdown.tsx`
Add a collapsed-by-default "Micronutrients from drinks today" section under the existing aggregate row:
- Grid of micro chips showing only non-zero values (e.g. "Vit C 62 mg · K 480 mg · Ca 310 mg").
- "Show all 13" toggle reveals zeros.
- Small caption: "Hammer-estimated for custom drinks; USDA values for presets."

### 6. Daily Nutrition Score integration (optional, scoped tight)
The Daily Nutrition Score (40% micros) currently only counts food micros. To avoid hidden score inflation, **do NOT auto-merge** hydration micros into the Daily Nutrition Score in v1 — display only. Add a follow-up toggle later if user wants it counted.

### Files to change
| File | Change |
|---|---|
| `supabase/functions/analyze-hydration-text/index.ts` | Add `micros_per_oz` to tool schema + clamping |
| Migration | Add `micros_per_oz jsonb` to `hydration_beverage_database`; add `micros jsonb` to `hydration_logs`; seed common presets |
| `src/hooks/useHydration.ts` | Compute & persist `micros` on insert; expose `totalHydrationMicros` |
| `src/components/nutrition-hub/HydrationQualityBreakdown.tsx` | Render micros section (non-zero chips, expand toggle) |
| `src/components/nutrition-hub/QuickLogActions.tsx` | Pass through AI `micros_per_oz` to `addWater` |

### Out of scope (v1)
- Folding hydration micros into the Daily Nutrition Score
- Backfilling micros on legacy hydration logs
- Per-drink micro detail inside `HydrationLogCard` (stays at the daily aggregate)

