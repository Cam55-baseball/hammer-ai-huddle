

# System Resurrection — Fix Micronutrient Pipeline + Wire Effectiveness Tracking

## Proven Root Cause

**156 vault_nutrition_logs rows exist. ALL have `micros: {}` (empty object). Zero have real micronutrient data.**

The pipeline breaks at two points:

### Break Point 1: AI micros not reaching MealData items
`useSmartFoodLookup` enriches `data.foods[].micros` from DB lookups (line 250), but when these foods are added to `MealData.items[]` in `MealLoggingDialog`, the `micros` property is NOT part of the `MealItem` type — it gets silently dropped. The vault sync then reads `(item as any).micros` and finds nothing.

### Break Point 2: Quick Entry path has zero micros
Quick entry (line 244) creates a bare `MealData.items[]` with only calories/protein/carbs/fats — no micros at all. This is the majority of real user logs.

### Break Point 3: `trackEffectiveness()` is dead code
Defined in `useSuggestionLearning.ts` but never called anywhere else in the codebase.

## Fixes

### 1. MealLoggingDialog — Pass micros from SmartFoodLookup to MealData items

When smart food lookup returns results, the micros must be included on each item added to `mealData.items[]`. Currently `MealItem` type likely lacks `micros` — add it and ensure the food-add handler copies micros through.

### 2. MealLoggingDialog — DB-enrich Quick Entry micros

For quick entry path: after user enters food name/macros, do a DB lookup (`lookupMicrosFromDb`) for the meal title and attach micros to the item before syncing. If no DB match, log with `data_confidence: 'low'` and `micros: null`.

### 3. useMealVaultSync — Fix `undefined` micros storage

Line 203: `micros: (microsComplete && hasMicrosData) ? aggregatedMicros : undefined` — when `undefined`, Supabase stores `{}` (empty object) instead of `null`. Change to explicit `null` so the DB accurately reflects "no micro data."

### 4. Wire trackEffectiveness into meal logging flow

In `MealLoggingDialog` or `useMealVaultSync`, after successful meal save:
- Query `nutrition_suggestion_interactions` for recent `accepted` suggestions for this user
- Compare logged food names against accepted suggestion food names
- If match found, compute the nutrient improvement (current day's intake vs previous day) and call `trackEffectiveness()`

### 5. Seed 14 days of realistic nutrition logs with real micros

Insert ~30 rows into `vault_nutrition_logs` with complete micros data (derived from the 75 seeded DB foods). This immediately activates: baseline model, consistency scoring, trend engine, deficiency detection.

## Files

| File | Change |
|------|--------|
| `src/types/customActivity.ts` | Add `micros` to `MealItem` interface |
| `src/components/nutrition-hub/MealLoggingDialog.tsx` | Pass micros from SmartFoodLookup results to MealData items; add DB micro lookup for quick entry |
| `src/hooks/useMealVaultSync.ts` | Change `undefined` to `null` for missing micros; add effectiveness tracking call after save |
| DB seed (via insert tool) | Insert 14 days × 2-3 meals of realistic nutrition logs with full micros |

## No edge function changes needed
The edge function schema is correct (all 13 keys required). The AI does return micros — the problem is downstream in the client pipeline.

