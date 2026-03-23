

# Move Vitamins & Supplements Below Track Supplements Button

## Change

**File: `src/components/nutrition-hub/NutritionHubContent.tsx`**

1. Move `<VitaminSupplementTracker />` from inside the `supplements` TabsContent (line 516-518) to directly after the `<QuickLogActions />` block (after line 464)
2. Keep the supplements tab trigger in the tab bar but render empty or a message pointing up, OR remove the supplements tab entirely since the tracker now lives above

**Approach**: Place the tracker right after QuickLogActions so it sits directly below the "Track Supplements" button visually. Remove the now-empty supplements tab to avoid confusion.

| File | Change |
|------|--------|
| `src/components/nutrition-hub/NutritionHubContent.tsx` | Move `VitaminSupplementTracker` from supplements tab to after QuickLogActions; remove supplements tab |

