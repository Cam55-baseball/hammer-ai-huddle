

# Trend Engine Truth Enforcement

## Current State (Already Partially Correct)
- `useNutritionTrends` line 101: `if (!micros) continue` — null-micro logs already skipped from `dayMap`
- Line 117: `if (days.length === 0) return null` — zero-micro scenario returns null
- `NutritionTrendsCard` line 28: `if (!trends) return null` — card hidden entirely

**Gap**: When zero micro data exists, the card silently disappears. This is inconsistent with the `useNutritionConsistency` pattern which returns `status: 'insufficient_data'`. The user wants explicit communication rather than silence.

## Changes

### 1. `src/hooks/useNutritionTrends.ts`
- Add `status: 'active' | 'insufficient_data'` to the return type
- Change line 117 from `return null` to return a structured object with `status: 'insufficient_data'`, empty arrays, and `daysAnalyzed: 0`
- Add `status: 'active'` to the normal return object

### 2. `src/components/nutrition-hub/NutritionTrendsCard.tsx`
- Update the guard (line 28) to check `trends.status === 'insufficient_data'`
- When insufficient data: render the card shell with a single message: "Trend analysis unavailable — insufficient micronutrient data"
- Keep the `daysAnalyzed < 3` guard to hide entirely when not enough logging days
- When status is `insufficient_data`, do NOT render any %, deficiency, predictions, or nudges

## Behavior After Fix

| Scenario | Before | After |
|----------|--------|-------|
| Zero micro data, 3+ log days | Card hidden (silent) | Card shows "Trend analysis unavailable" message |
| Zero micro data, <3 log days | Card hidden | Card hidden (unchanged) |
| Has micro data | Normal display | Normal display (unchanged) |

## Files Changed
| File | Change |
|------|--------|
| `src/hooks/useNutritionTrends.ts` | Add `status` field, return structured insufficient_data object instead of null |
| `src/components/nutrition-hub/NutritionTrendsCard.tsx` | Show explicit "unavailable" message for insufficient_data status |

