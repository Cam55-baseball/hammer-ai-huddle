

# Controlled Data Degradation + Scoring Integrity Lock

## Current State

**Already correct:**
- `NutritionScoreCard` (line 65): `if (!micros) continue` — null-micros rows already excluded from micro totals
- `DeficiencyAlert` (line 76): `if (!micros) continue` — null-micros rows already excluded
- `useNutritionTrends` (line 100): `if (!micros) continue` — null-micros rows already excluded
- `useMealVaultSync` (line 202): stores `null` when micros incomplete

**Gaps to fix:**
1. **Confidence override missing**: `useMealVaultSync` line 172 derives confidence from item-level values but does NOT force `'low'` when final micros is null
2. **useNutritionBaseline**: processes ALL rows including null-micros ones — corrupts adaptive multipliers
3. **useNutritionConsistency**: counts null-micros days in deficiency-free rate (a day with no micros could pass as "deficiency-free")
4. **NutritionScoreCard**: no data coverage penalty — a day with 3 macro-only meals and 1 micro meal scores the same micro% as 4 micro meals
5. **No data quality indicator** in UI — user can't see how many meals have micro data

## Changes

### 1. `src/hooks/useMealVaultSync.ts`
**Line 203**: After computing `dataConfidence`, add override:
```
if final micros is null → force data_confidence = 'low'
```
This ensures macro-only entries never claim high/medium confidence.

### 2. `src/hooks/useNutritionBaseline.ts`
Filter to only include rows where `micros` is non-null and non-empty before computing nutrient averages, chronic-low detection, and adaptive multipliers. Macro-only rows should still count toward `daysWithData` for frequency stats but must be excluded from all micronutrient calculations.

### 3. `src/hooks/useNutritionConsistency.ts`
- **Deficiency-free rate**: Only count days that HAVE micro data. Days with null micros are excluded from both numerator and denominator (not counted as "deficiency-free" or "deficient").
- **Score stability**: Daily micro coverage scores for days without micro data should be excluded from std deviation calculation (not counted as 0).

### 4. `src/components/nutrition-hub/NutritionScoreCard.tsx`
Add **data coverage factor** to micro scoring:
- Count meals with micros vs total meals
- `microCoverage = mealsWithMicros / totalMeals`
- Apply: `microScore = microScore * microCoverage`
- This means: 1/4 meals with micros → micro score reduced to 25% of its value
- Display coverage indicator: "2/4 meals verified"

### 5. `src/components/nutrition-hub/NutritionDailyLog.tsx`
Add a small data quality badge below Day Totals showing: `"X of Y meals have micronutrient data"` with color coding (green if 100%, amber if partial, red if 0%).

## Summary

| File | Change |
|------|--------|
| `useMealVaultSync.ts` | Force `data_confidence: 'low'` when micros is null |
| `useNutritionBaseline.ts` | Exclude null-micros rows from micro calculations |
| `useNutritionConsistency.ts` | Exclude null-micros days from deficiency-free rate and stability |
| `NutritionScoreCard.tsx` | Add micro coverage factor + "X/Y verified" display |
| `NutritionDailyLog.tsx` | Add data quality badge |

## What This Prevents
- Macro-only meals inflating micro scores → blocked by coverage factor
- Null-micros days counting as "deficiency-free" → excluded from consistency
- High confidence on macro-only entries → forced to low
- Adaptive multipliers corrupted by null data → filtered out
- User unaware of data gaps → visible quality indicator

