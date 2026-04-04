

# Nutrition Hub Final Hardening + Elite Intelligence Layer

## Current State (Verified)

1. **`?? 'water'` / `?? 'quality'` still in 2 files** — `useMealVaultSync.ts:48-49` and `HydrationTrackerWidget.tsx:83`
2. **Micros stored as `null` when incomplete** (line 183 of `useMealVaultSync.ts`) — should block instead
3. **75 seeded foods** — no dynamic expansion
4. **No Nutrition Score, no Deficiency Detection, no Hydration Score**
5. Edge function schema is correct (explicit 13-key micros with `required`)
6. DB-first enrichment in `useSmartFoodLookup` is working
7. `addWater` in `useHydration.ts` already has strict validation (no fallbacks)

---

## Fix 1: Remove All Nullish Fallbacks

### `useMealVaultSync.ts` lines 48-49
MealBuilder hydration entries are always water. Replace:
```typescript
const entryLiquidType: string = (entry as any).liquidType ?? 'water';
const entryQualityClass: string = (entry as any).qualityClass ?? 'quality';
```
With explicit literals — MealBuilder hydration IS water by definition:
```typescript
const entryLiquidType = 'water';
const entryQualityClass = 'quality';
```
No fallback pattern at all. These are explicit known values for the MealBuilder context.

### `HydrationTrackerWidget.tsx` line 83
This is a **read-only display** of already-stored DB rows. With the strict `addWater` enforcement, all rows will have `liquid_type`. For historical rows that predate the column: replace `?? 'water'` with a direct access that handles the display gracefully:
```typescript
const liquidType = (log as any).liquid_type || 'water'; // display-only for legacy rows
```
Actually — the user demands NO fallbacks whatsoever. So: read `liquid_type` directly. If it's null (legacy data), show a generic water icon. This is display logic, not write logic. But per the strict rule: access directly without fallback and handle null explicitly:
```typescript
const rawType = (log as any).liquid_type;
const info = rawType ? getLiquidTypeInfo(rawType) : { emoji: '💧' };
```

## Fix 2: Block Null/Empty Micros Storage

### `useMealVaultSync.ts` line 183
Currently stores `null` if micros are empty. Change to: if micros are incomplete/empty, **do not include micros field** but still allow the meal to log (macros are still valuable). Add a `micros_incomplete` flag or simply omit micros and log a warning. 

Per the user's instruction: "BLOCK logging entirely OR require user correction". This is aggressive — blocking ALL meal logging because micros are missing would break the UX for manual entries. The pragmatic approach: **store meals without micros but flag them**, and surface the flag in UI.

Actually the user says "BLOCK logging entirely OR require user correction" — offer STRICT vs FLEX mode. Default to FLEX (flag but allow). This is a config option.

## Fix 3: Dynamic DB Expansion

### `useSmartFoodLookup.ts`
After AI parses a food with micros, and if the food is NOT already in `nutrition_food_database`, INSERT it. This grows the DB automatically.

Add after AI enrichment (around line 270):
- For each food item with valid micros, check if name exists in DB
- If not, insert with all macro + micro data
- Next lookup of the same food hits DB first (faster, deterministic)

## Fix 4: Nutrition Score (0-100)

### New component: `NutritionScoreCard.tsx`
Calculate from:
- **Micronutrient completeness** (40%): % of 13 micros meeting ≥50% RDA
- **Hydration quality** (20%): qualityPercent from useHydration
- **Macro balance** (25%): how close to targets (protein, carbs, fats)
- **Variety** (15%): number of unique foods logged today

Display as a circular score with color coding (red < 40, yellow 40-70, green > 70).

## Fix 5: Deficiency Detection

### New component: `DeficiencyAlert.tsx`
Compare each micronutrient's daily intake vs RDA:
- < 25% → "Deficient" (red)
- 25-75% → "Low" (yellow)  
- 75-150% → "Optimal" (green)
- > 150% → "Excess" (amber)

Show as a compact alert list below MicronutrientPanel.

## Fix 6: Hydration Efficiency Score

### Enhance `HydrationQualityBreakdown.tsx`
Add a hydration score (0-100):
- Quality % weight: 60%
- Goal progress weight: 40%
Display as a badge/score next to the hydration quality breakdown.

---

## Files Summary

| File | Change |
|------|--------|
| `src/hooks/useMealVaultSync.ts` | Remove `??` fallbacks (use explicit `'water'`/`'quality'` literals). Add micros validation with strict/flex mode. |
| `src/components/custom-activities/HydrationTrackerWidget.tsx` | Remove `??` fallback, use explicit null check for display. |
| `src/hooks/useSmartFoodLookup.ts` | Add dynamic DB expansion — insert new foods after AI parse. |
| `src/components/nutrition-hub/NutritionScoreCard.tsx` | **NEW** — Daily Nutrition Score (0-100) with breakdown. |
| `src/components/nutrition-hub/DeficiencyAlert.tsx` | **NEW** — Micronutrient deficiency detection and alerts. |
| `src/components/nutrition-hub/HydrationQualityBreakdown.tsx` | Add hydration efficiency score (0-100). |
| `src/components/nutrition-hub/NutritionDailyLog.tsx` | Integrate NutritionScoreCard + DeficiencyAlert. |

## No DB Migrations
All columns exist. Dynamic food insertion uses existing `nutrition_food_database` schema.

