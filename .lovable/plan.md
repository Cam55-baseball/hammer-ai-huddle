

## Plan — Restructure Nutrition Hub & Clean Up My Activities

### 1. `src/pages/MyCustomActivities.tsx` — remove Hydration tab
- Remove the `hydration` entry from the `tabs` array (line 97).
- Remove the matching `<TabsContent value="hydration">` block (lines 228–230).
- Remove unused import `HydrationReminderSettings`.
- Keep `HydrationTrackerWidget` (header widget) untouched.

### 2. `src/components/nutrition-hub/QuickLogActions.tsx` — strip out 3 sections
Remove from the Quick Actions card (full mode only):
- The entire **Log Meal** section (lines 554–608) — meal type buttons + "more meal types" dialog.
- The entire **Recipes** section (lines 645–652) including the `RecipeBuilder` block.
- The **Track Supplements** button (lines 654–662).

Keep: Hydration quick-add, Barcode Scanner, Photo Food Logger, and all liquid-picker dialog logic. Remove now-unused imports (`Utensils`, `BookOpen`, `Pill`, `RecipeBuilder`, `MEAL_TYPES` if unused, the `mealDialogOpen`/`selectedMealType`/`handleLogMeal` state if no longer referenced).

### 3. New component `src/components/nutrition-hub/LogMealCard.tsx`
A standalone card that contains:
- Header: "Log Meal" with utensils icon.
- Body: meal-type button grid (Breakfast/Lunch/Dinner/Snack/etc. via `MEAL_TYPES`). Tapping a meal type calls `onLogMeal(mealType)`.
- **Bottom: "Quick Pick Foods" as a collapsible/dropdown** (`Collapsible` component) — when expanded, renders the existing `<CommonFoodsGallery onSelectFood={...} />` (kid-friendly visual gallery). Default collapsed.

Props: `onLogMeal: (mealType: string) => void`, `onSelectFood: (food) => void`.

### 4. `src/components/nutrition-hub/NutritionHubContent.tsx` — reorder & rewire
Reorder the section stack to:
1. `MacroTargetDisplay` (Daily Targets) — unchanged
2. **`<LogMealCard onLogMeal={handleLogMeal} onSelectFood={handleGalleryFoodSelect} />`** (new — directly below Daily Targets)
3. `PhysioNutritionSuggestions`
4. `FavoriteFoodsWidget`
5. `QuickLogActions` (now slimmer — hydration/barcode/photo only)
6. `VitaminSupplementTracker`
7. **Tabs section** (Today / Weekly / Planning / Shopping / **Recipes**)
8. **`WeightTrackingSection`** — moved to the very bottom (after the tabs)

Remove the standalone `<CommonFoodsGallery />` render (line 458) — it now lives inside `LogMealCard`.

### 5. Add Recipes tab to the Nutrition Hub tab strip
In the `<Tabs>` block (lines 473–519):
- Add a new `<TabsTrigger value="recipes">Recipes</TabsTrigger>`.
- Add `<TabsContent value="recipes">` rendering `<RecipeBuilder onRecipeSelect={...} />` wrapped to call `handleLogMeal(mealType, ingredients)` via the existing meal-type selector pattern (we'll lift the `handleRecipeSelect` flow from `QuickLogActions` into `NutritionHubContent`, including a small `MealTypeSelector` dialog so the user can pick which meal to log the recipe to).

### 6. Fix Craving Guidance so it actually works
Current behavior in `CravingGuidance.tsx`:
- Returns `null` entirely when `microCoverage === 0` (no meals logged with micro data) — user sees nothing.
- Returns "No aligned foods found" when `limitingFactorKeys.length === 0` — even though deficient nutrients exist.

Fix:
- Remove the hard `if (microCoverage === 0) return null;` short-circuit — always render the card with craving chips so users can pick a craving and get guidance.
- When `limitingFactorKeys.length === 0` (no severe limiters detected yet), fall back to **all RDA-deficient nutrients** (`(totals[key] || 0) / rda < 0.40`) from the craving's `CRAVING_NUTRIENT_MAP`, instead of intersecting with limiters. This guarantees suggestions for any craving once the user has any food data.
- If still zero deficient nutrients, query the top-2 foods in the craving category by the **first nutrient in `CRAVING_NUTRIENT_MAP[craving]`** so the user always gets at least 2 healthy alternatives.
- Show an empty state with action text only when the food DB query returns truly nothing.
- Also remove the `microCoverage > 0` requirement on the React Query `enabled` flag.

### 7. Fix Nutrition Score text crowding on mobile
In `src/components/nutrition-hub/NutritionScoreCard.tsx`:
- The 5-column breakdown grid (`grid-cols-5`, lines 219–230) is the cause of cramped labels on 390px viewports. Change to `grid grid-cols-2 sm:grid-cols-5 gap-2` so labels wrap to 2 columns on mobile.
- Wrap the badges row (lines 192–217) so they don't overflow: it already has `flex-wrap` — also reduce the label text so the score number isn't pushed off. Add `min-w-0` and `truncate` patterns where needed, and let the `microCoverage` badge text shorten to e.g. `2/3` (drop "verified" on `<sm`).
- The outer flex (line 184) `flex items-center gap-3` — change to `flex flex-col sm:flex-row sm:items-center gap-3` so on mobile the score circle stacks above the breakdown, giving each row full width.

### Out of scope
- No data model / schema changes.
- Sidebar entries unchanged.
- HydrationTrackerWidget / hydration logging in Nutrition Hub stays.

### Verification
- `/my-custom-activities`: no Hydration tab.
- `/nutrition-hub`: Daily Targets → **Log Meal card with Quick Pick Foods dropdown at bottom** → Physio → Favorites → slim Quick Actions (no Log Meal, no Recipes, no Track Supplements) → Supplements → Tabs (Today/Weekly/Planning/Shopping/**Recipes**) → **Weight Tracking at bottom**.
- Craving Guidance: pick any craving → suggestions appear (or a clear empty state), even with sparse micro data.
- Nutrition Score on 390px mobile: all 5 breakdown cells readable, no label crammed/overlapping; circle and details stack cleanly.

