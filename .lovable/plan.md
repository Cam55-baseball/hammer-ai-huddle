

# Adaptive Intelligence + Performance Engine Layer

## Current State

- **NutritionScoreCard**: Daily 0-100 score with confidence weighting — single-day only, no trends
- **DeficiencyAlert**: Single-day RDA comparison with food suggestions — reactive, no prediction
- **NutritionWeeklySummary**: Macro averages with week-over-week comparison — no micro/hydration trends
- **AIMealSuggestions**: AI-powered meal gap suggestions based on macro gaps — no micro-aware corrections
- **No performance mode, no optimization score, no behavioral pattern detection, no nudges**

## Architecture

```text
vault_nutrition_logs (existing, has micros + data_confidence)
hydration_logs (existing, has liquid_type + quality_class)
         ↓
  NutritionTrendEngine hook (NEW)
    → queries 7/14/30-day rolling windows
    → computes micro trends, hydration quality trends, score trends
    → detects behavioral patterns (weekend drops, chronic gaps)
    → predicts deficiency risk from trend slopes
         ↓
  UI Components
    → NutritionTrends card (trends + predictions + nudges)
    → Enhanced DeficiencyAlert (predictive warnings)
    → Real-time correction suggestions in NutritionDailyLog
    → Performance Mode toggle in NutritionHubSettings
    → Optimization Score in NutritionScoreCard
```

## Changes

### 1. New Hook: `useNutritionTrends.ts`

Core intelligence engine. Queries `vault_nutrition_logs` for last 30 days, computes:

- **Rolling averages** (7/14/30-day) for each of 13 micros, hydration quality %, nutrition score
- **Trend detection**: linear slope over 7-day windows → "trending up/down/stable"
- **Predictive deficiency**: if a nutrient's 7-day avg is <50% RDA AND trending down → "risk of deficiency"
- **Behavioral patterns**: group by day-of-week, detect consistent gaps (e.g., "iron drops on weekends")
- **Frequently missed nutrients**: nutrients below 50% RDA on >60% of logged days
- **Smart nudges**: pick top 1-2 actionable corrections from DB foods based on biggest current gap

Uses React Query with 60s staleTime for performance. Single query fetches 30 days of data, all computation is client-side.

### 2. New Hook: `usePerformanceMode.ts`

Reads/writes a `performance_mode` boolean from `athlete_mpi_settings` (add column via migration). When enabled:
- RDA targets increase by 25%
- Hydration weight in score increases from 20% to 30%
- Deficiency tolerance threshold drops from 75% to 85%
- Score calculation becomes stricter (macro deviation penalty doubles)

### 3. DB Migration

```sql
ALTER TABLE public.athlete_mpi_settings
  ADD COLUMN IF NOT EXISTS performance_mode boolean DEFAULT false;
```

### 4. New Component: `NutritionTrendsCard.tsx`

Compact card showing:
- 7-day micro trend arrows (up/down/stable) for top deficient nutrients
- Predictive warnings ("Magnesium trending low — risk in 3-5 days")
- Behavioral patterns ("Iron consistently low on weekends")
- 1-2 smart nudges ("Quick win: add spinach to improve magnesium")

Placed in `NutritionDailyLog` below DeficiencyAlert.

### 5. Enhanced `DeficiencyAlert.tsx`

Add predictive mode:
- Accept trend data from `useNutritionTrends`
- Show "Predicted Risk" alerts alongside current-day alerts
- Different styling (dashed border, "trending" icon) for predictions vs current

### 6. Enhanced `NutritionScoreCard.tsx` — Optimization Score

Add sub-score: "Optimization" — measures how well user corrected deficiencies during the day:
- Compare first-half-of-day micros vs end-of-day micros
- If user improved gaps after initial logging → optimization bonus
- Display as 5th breakdown column

Also integrate performance mode multiplier.

### 7. Real-Time Correction in `NutritionDailyLog.tsx`

After meals are displayed, show a compact "Quick Wins" section:
- Based on current day's deficiencies
- Suggest 2-3 specific foods from DB to fill biggest gaps
- "Add banana to improve potassium (+422mg)"

### 8. Performance Mode Toggle in `NutritionHubSettings.tsx`

Add a switch: "Performance Mode" with description "Stricter targets for competitive athletes". Reads/writes via `usePerformanceMode`.

## Files Summary

| File | Change |
|------|--------|
| Migration | Add `performance_mode` to `athlete_mpi_settings` |
| `src/hooks/useNutritionTrends.ts` | **NEW** — Trend engine, predictions, patterns, nudges |
| `src/hooks/usePerformanceMode.ts` | **NEW** — Performance mode read/write |
| `src/components/nutrition-hub/NutritionTrendsCard.tsx` | **NEW** — Trends, predictions, patterns, nudges UI |
| `src/components/nutrition-hub/DeficiencyAlert.tsx` | Add predictive warnings from trend data |
| `src/components/nutrition-hub/NutritionScoreCard.tsx` | Add optimization sub-score + performance mode |
| `src/components/nutrition-hub/NutritionDailyLog.tsx` | Integrate TrendsCard + quick wins |
| `src/components/nutrition-hub/NutritionHubSettings.tsx` | Add performance mode toggle |

## Performance

- Single 30-day query (one DB call), all trend/pattern computation client-side
- React Query 60s staleTime prevents redundant fetches
- No AI calls — all intelligence is deterministic math on stored data
- No additional edge functions needed

