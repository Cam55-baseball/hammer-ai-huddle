

# Personalization + Auto-Optimization Engine

## What Exists
- `useNutritionTrends` — 7/14/30-day rolling averages, trend slopes, behavioral patterns, smart nudges
- `DeficiencyAlert` — current-day + predictive deficiency detection with food suggestions
- `NutritionScoreCard` — 0-100 daily score with confidence weighting + optimization sub-score
- `usePerformanceMode` — stricter targets toggle
- `consistencyIndex.ts` — consistency scoring for athlete_daily_log (not nutrition-specific)
- No suggestion tracking, no user baseline model, no adaptive targets, no recommendation learning

## Database Migration

### New table: `nutrition_suggestion_interactions`
Tracks which food suggestions user accepts/ignores for learning loop + effectiveness tracking.

```sql
CREATE TABLE public.nutrition_suggestion_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nutrient_key text NOT NULL,
  food_name text NOT NULL,
  action text NOT NULL CHECK (action IN ('accepted', 'ignored', 'dismissed')),
  effectiveness_delta numeric,  -- score change after acceptance
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.nutrition_suggestion_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own interactions" ON public.nutrition_suggestion_interactions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

No other schema changes needed — all baseline/trend data is computed from existing `vault_nutrition_logs` + `hydration_logs`.

## New Files

### 1. `src/hooks/useNutritionBaseline.ts`
Computes per-user personal baseline from 30-day `vault_nutrition_logs`:
- **Average intake** per nutrient (personal "normal")
- **Hydration quality avg %**
- **Score range** (avg, min, max from last 30 days)
- **Frequently logged foods** (top 10 by count)
- **Adaptive target emphasis**: if user is chronically low in a nutrient (>60% of days below 50% RDA), that nutrient gets a 1.3x priority multiplier in scoring and nudges
- Uses React Query, single 30-day fetch, all computation client-side

### 2. `src/hooks/useSuggestionLearning.ts`
- `trackInteraction(nutrientKey, foodName, action)` — records accept/ignore/dismiss
- `getPersonalizedSuggestions(nutrientKey)` — queries `nutrition_food_database` for foods rich in that nutrient, then re-ranks by:
  1. Previously accepted foods first (from interactions table)
  2. Never-ignored foods next
  3. Frequently-ignored foods suppressed (shown last or hidden after 3+ ignores)
- `trackEffectiveness(nutrientKey, foodName, scoreDelta)` — stores whether the accepted food actually improved the score

### 3. `src/hooks/useNutritionConsistency.ts`
Nutrition-specific Consistency Score (0-100):
- **Score stability** (40%): std deviation of daily nutrition scores over 14 days — lower deviation = higher consistency
- **Logging frequency** (30%): % of last 14 days with logged meals
- **Deficiency frequency** (30%): % of days WITHOUT any deficient nutrients
- Computed from existing data, no new tables needed

## Enhanced Files

### 4. `src/components/nutrition-hub/DeficiencyAlert.tsx`
- Import `useSuggestionLearning`
- Replace static food suggestions with personalized ones from `getPersonalizedSuggestions`
- Add accept/dismiss buttons on each suggestion
- On accept: call `trackInteraction('accepted')` + pass food to onAddFood
- On dismiss: call `trackInteraction('dismissed')`
- **Priority engine**: sort deficiencies by severity × duration (from trends) × adaptive multiplier (from baseline). Show only top 2.
- **Context-aware**: check current hour — morning suggestions favor breakfast foods, evening favor dinner/snack foods (tag foods by meal_type in DB query)

### 5. `src/components/nutrition-hub/NutritionScoreCard.tsx`
- Import `useNutritionBaseline` for adaptive target emphasis
- Apply baseline's priority multipliers to micro score calculation (chronically-low nutrients weighted higher)
- Import `useNutritionConsistency`
- Add "Consistency" display below score (small badge: "14-day consistency: 72")

### 6. `src/components/nutrition-hub/NutritionTrendsCard.tsx`
- Import `useNutritionBaseline`
- Show "Personal Baseline" section: "Your avg Magnesium: 180mg (43% RDA) — below your baseline"
- Show adaptive nudges that prioritize chronically-low nutrients
- Use learned suggestion rankings from `useSuggestionLearning`

### 7. `src/components/nutrition-hub/NutritionDailyLog.tsx`
- Import + display `NutritionConsistencyBadge` (inline) showing 14-day consistency score
- No structural changes, just add the badge near the score card

## Architecture

```text
vault_nutrition_logs (30 days)
         ↓
useNutritionBaseline  →  personal averages, adaptive multipliers
useNutritionConsistency  →  14-day consistency score
         ↓
DeficiencyAlert  →  priority-ranked deficiencies (top 2 only)
                 →  personalized food suggestions (learned)
                 →  context-aware (time of day)
         ↓
useSuggestionLearning  →  tracks accept/ignore
                       →  re-ranks suggestions
                       →  tracks effectiveness
```

## Summary

| File | Change |
|------|--------|
| Migration | Create `nutrition_suggestion_interactions` table |
| `src/hooks/useNutritionBaseline.ts` | **NEW** — personal baseline + adaptive target multipliers |
| `src/hooks/useSuggestionLearning.ts` | **NEW** — recommendation learning loop + effectiveness |
| `src/hooks/useNutritionConsistency.ts` | **NEW** — 14-day nutrition consistency score |
| `src/components/nutrition-hub/DeficiencyAlert.tsx` | Personalized suggestions, priority engine (top 2), context-aware |
| `src/components/nutrition-hub/NutritionScoreCard.tsx` | Adaptive scoring + consistency badge |
| `src/components/nutrition-hub/NutritionTrendsCard.tsx` | Personal baseline display + learned nudges |
| `src/components/nutrition-hub/NutritionDailyLog.tsx` | Consistency score badge |

## Performance
- All baselines computed client-side from single 30-day query (already cached by useNutritionTrends)
- Suggestion interactions table is write-light (1 row per suggestion click)
- No AI calls — all intelligence is deterministic math on stored data

