## 1. Soreness & Stiffness scales on body check-in

**Where:** `VaultFocusQuizDialog` (`pre_lift` and `morning` quiz types).

**UX (mirrors existing Pain section):**
- New section "Body Status" with three sub-sections, each using `BodyAreaSelector` + per-area `TenPointScale` (1–10):
  1. **Pain** (already exists in pre_lift — reuse as-is).
  2. **Soreness** — new selector + per-area 0–10 scale, with simple level labels (Minimal / Mild / Moderate / Significant / Severe).
  3. **Stiffness** — new selector + per-area 0–10 scale with the same labels.
- Each scale collapses when no area is selected (same pattern as Pain).
- For **morning**: insert a compact "Body Status" card containing Soreness and Stiffness only (no Pain — pain stays a pre-workout concern). Place it above the discipline/intentions block, after `perceived_recovery`.
- For **pre_lift**: append Soreness and Stiffness sub-sections inside the existing Section 3 ("Pain or Limitation Check"), retitling it "Pain, Soreness & Stiffness".
- No tissue-type or movement-question sub-prompts for soreness/stiffness — keep it light.

**State (in component):**
- `sorenessLocations: string[]`, `sorenessScales: Record<string, number>`
- `stiffnessLocations: string[]`, `stiffnessScales: Record<string, number>`
- Cleanup handlers mirror `handlePainLocationsChange` (drop scales for deselected areas).

**Submission payload (extend the dialog's `onSubmit` shape):**
- `soreness_locations?: string[]`
- `soreness_scales?: Record<string, number>`
- `stiffness_locations?: string[]`
- `stiffness_scales?: Record<string, number>`

Wire these into the `data` object inside `handleSubmit` for both `morning` and `pre_lift` blocks.

**Database migration (`vault_focus_quizzes`):**
- Add columns:
  - `soreness_locations text[]`
  - `soreness_scales jsonb`
  - `stiffness_locations text[]`
  - `stiffness_scales jsonb`
- All nullable, no defaults. RLS unchanged.
- Update the consumer that writes the row (`useVault` / wherever `onSubmit` resolves) to pass these new fields through.

**Out of scope:** No engine/HIE scoring changes yet. Data is captured and persisted; behavioral consumption can come in a follow-up.

## 2. Favorite-meal bug in Nutrition Hub

Two distinct "favorite" surfaces exist; both have real issues. Fix both.

### A. Per-food star (`FoodSearchDialog` → `useRecentFoods.toggleFavorite`)

Issues found:
- Uses `.single()` which throws PGRST116 when no row exists, silently swallowed by try/catch — first-time favorite still goes through the insert branch but the error is logged.
- No toast on success/failure → user perceives no feedback ("didn't save").
- After refresh, the food only appears in the Favorites list if it has a `user_food_history` row; new insert sets `use_count: 0` and order is `use_count desc` → it lands last but is visible. OK once feedback exists.

Fix:
- Replace `.single()` with `.maybeSingle()` in both `toggleFavorite` and `trackFoodUsage`.
- Surface a `sonner` toast: "Added to favorites" / "Removed from favorites" / "Couldn't update favorite".
- Optimistic update of `favoriteIds` so the star fills immediately, then reconcile on refresh.

### B. Save-as-template / favorite meal template (`MealPlanningTab` → `useMealPlanning.saveAsTemplate`)

Issues found:
- `handleSaveTemplate` in the tab toasts success unconditionally even when `saveAsTemplate` returns `null`.
- `saveAsTemplate` saves `meals: []` if the current week has no planned meals — silent "save" with empty content; users see no template appear (list hidden when length 0 only on first load, but template with 0 meals is still useless).
- `saveAsTemplate` toasts success internally AND the tab toasts again → double toast on success, misleading toast on failure.
- DB confirms 0 rows in `meal_templates` despite usage attempts.

Fix:
- In `useMealPlanning.saveAsTemplate`: if `allMeals.length === 0`, abort with `toast.error("Add meals to this week before saving as a favorite")` and return `null`.
- Remove the duplicate success toast in `MealPlanningTab.handleSaveTemplate`; rely on the hook's toast. Treat `null` return as failure.
- Ensure the templates list section renders an empty-state row when `templates.length === 0` (so users see "No saved meal templates yet" instead of the section disappearing).
- `toggleTemplateFavorite` already works; add a toast for visibility ("Added to favorites" / "Removed from favorites").

## Files to touch

- `supabase/migrations/<new>.sql` — add 4 columns to `vault_focus_quizzes`.
- `src/components/vault/VaultFocusQuizDialog.tsx` — new state, handlers, UI sections, payload extension.
- `src/hooks/useVault.ts` (or wherever `vault_focus_quizzes` insert happens) — pass through new fields.
- `src/hooks/useRecentFoods.ts` — `.maybeSingle()`, toasts, optimistic favorite toggle.
- `src/hooks/useMealPlanning.ts` — empty-meals guard, single-source toast.
- `src/components/nutrition-hub/MealPlanningTab.tsx` — drop duplicate toast, handle null return, render empty-state.

## Verification

- Open morning check-in → Body Status card appears → select an area for Soreness, set scale, submit → row in `vault_focus_quizzes` has populated `soreness_locations` + `soreness_scales`. Same for Stiffness, and same for pre-workout.
- Star a food in the search dialog → toast appears, star fills, food shows in Favorites strip.
- Save current week as template with meals → toast appears once, template visible in list. Try with empty week → blocking error toast, no row inserted.
