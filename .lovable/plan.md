

# Nutrition Hub System Repair + Upgrade

## Fix 1: Force Micronutrient Output (Edge Function)

**File: `supabase/functions/parse-food-text/index.ts`**

- Line 102: Add `"micros"` to the per-food item `required` array so the AI model must populate it
- Line 120: Add `"micros"` to the totals `required` array
- After parsing (line 172): Add validation — if any food item has empty/missing `micros`, log a warning. If `totals.micros` is empty, attempt to aggregate from per-food micros. This ensures the data flows even if the model partially complies.
- Add a retry mechanism: if the parsed result has all-empty micros, re-call the AI once with a stricter prompt reinforcement

## Fix 2: Remove Silent Hydration Defaults

**File: `src/hooks/useHydration.ts`**

- Line 160-161: Change from fallback defaults to strict requirement:
  ```typescript
  liquid_type: liquidType,  // remove || 'water'
  quality_class: qualityClass,  // remove || 'quality'
  ```
- Add validation at top of `addWater`: if `liquidType` or `qualityClass` is undefined/empty, throw an error and return false. This prevents any caller from silently inserting unclassified hydration.

## Fix 3: Fix Meal Sync Hydration Integration

**File: `src/hooks/useMealVaultSync.ts`**

- `syncHydration` currently calls `addWater(amountOz)` with no liquid type (line ~53-58)
- Fix: Pass `liquidType` and `qualityClass` from the hydration data entries
- For entries without classification, default to `'water'` / `'quality'` explicitly at the meal sync level (the caller knows what is being logged from MealBuilder)
- Update `MealData` hydration entries to carry `liquidType` if available; otherwise use `'water'` / `'quality'` as explicit values passed to `addWater`

## Fix 4: Manual Quality Override in Liquid Picker

**File: `src/components/nutrition-hub/QuickLogActions.tsx`**

- In the Liquid Type Picker Dialog (lines 277-310):
  - Add a quality override toggle (Switch component) after user selects a liquid type
  - Change the flow: tap liquid type → show a confirmation row with the auto-classified quality and a toggle to override
  - Alternatively (simpler, less friction): Add a small toggle directly on each liquid type button that shows the current classification and allows one-tap override before confirming
  - Implementation: Track `overrideQuality` state. When user taps a liquid, show a brief inline confirmation with a "Switch to Quality/Filler" toggle. On confirm, call `addWater(amount, liquidType, finalQuality)`.

## Fix 5: Activate Dead UI

**Files: `MicronutrientPanel.tsx`, `MealLogCard.tsx`**

- These are already correctly coded — they will activate once micros data flows from Fix 1
- No code changes needed here; they respond to real data automatically

## Files Summary

| File | Change |
|------|--------|
| `supabase/functions/parse-food-text/index.ts` | Add `micros` to required arrays, add post-parse validation + retry |
| `src/hooks/useHydration.ts` | Remove silent defaults, add strict validation |
| `src/hooks/useMealVaultSync.ts` | Pass explicit liquidType/qualityClass to addWater |
| `src/components/nutrition-hub/QuickLogActions.tsx` | Add quality override toggle in liquid picker |

## No DB Changes
All columns already exist. No migrations needed.

