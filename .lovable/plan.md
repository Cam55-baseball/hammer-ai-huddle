

# Elite UI Exposure — Precision Data Transparency

## Summary
Surface data source, confidence, micronutrient coverage, and insufficient-data states across the Daily Log UI. No new scoring logic. Pure reflection of existing backend truth.

## Changes

### 1. MealLogCard — Data Source Badge + Always-Visible Micros

**File**: `src/components/nutrition-hub/MealLogCard.tsx`

- Extend `MealLogData` interface: add `dataSource?: string | null`, `dataConfidence?: string | null`
- Show inline badge next to meal title:
  - `data_source = 'database'` → green "Verified" badge
  - `data_source = 'ai'` → amber "AI Estimated" badge
  - `data_source = 'mixed'` → amber "Mixed" badge
  - null/unknown → grey "Manual" badge
- Show micronutrient grid **expanded by default** (not collapsed) when micros exist. Remove the toggle button — micros are always visible when present.
- When `micros` is null, show explicit text: "No micronutrient data" in muted style
- Show confidence as a small label: "High confidence" / "Estimated" / "Low confidence"

### 2. NutritionDailyLog — Pass Source + Confidence to Cards + Coverage Summary

**File**: `src/components/nutrition-hub/NutritionDailyLog.tsx`

- Map `data_source` and `data_confidence` from DB rows into `MealLogData`
- In the Day Totals section, replace the existing micro coverage badge with a clearer line:
  - "X/Y meals with micronutrient data" (already partially there, make more explicit)
  - Show aggregate confidence: "Data confidence: High/Mixed/Low" derived from meal-level values
- When all meals have `micros = null`, show in Day Totals: "No micronutrient data logged today" instead of hiding

### 3. MicronutrientPanel — Show All 13 Nutrients Always

**File**: `src/components/nutrition-hub/MicronutrientPanel.tsx`

- Currently filters to `current > 0` and hides entirely when no data — change behavior:
  - When zero micro data exists: show explicit message "No micronutrient data available — log verified foods to track"
  - When partial data: show ALL 13 nutrients, with 0-intake ones displayed as "0 / RDA" in muted style
  - Remove collapsible wrapper — panel is always open (no hiding core data per requirement)

### 4. NutritionScoreCard — Explainable Breakdown

**File**: `src/components/nutrition-hub/NutritionScoreCard.tsx`

- Already shows micro coverage badge and confidence badge — no structural changes needed
- Add a single line below the breakdown grid when `microCoverage.withMicros < microCoverage.total`:
  - "Score reduced: X/Y meals lack micronutrient data"
- Already handles `consistency = null` with "insufficient data" message — verified correct

### 5. DeficiencyAlert — Explicit No-Data State

**File**: `src/components/nutrition-hub/DeficiencyAlert.tsx`

- Currently returns `null` when `Object.keys(totals).length === 0` — change to show:
  - "Nutrient analysis unavailable — no micronutrient data logged today"
- This prevents silent absence from being mistaken for "no deficiencies"

### 6. NutritionTrendsCard — Already Correct

- Already shows "Trend analysis unavailable — insufficient micronutrient data" for `insufficient_data` status
- No changes needed

## Files Changed

| File | Change |
|------|--------|
| `src/components/nutrition-hub/MealLogCard.tsx` | Add data source badge, confidence label, always-show micros, explicit null-micro message |
| `src/components/nutrition-hub/NutritionDailyLog.tsx` | Pass `dataSource`/`dataConfidence` to cards, explicit coverage in Day Totals |
| `src/components/nutrition-hub/MicronutrientPanel.tsx` | Show all 13 nutrients always, remove collapsible, explicit no-data message |
| `src/components/nutrition-hub/NutritionScoreCard.tsx` | Add score-reduction explanation line |
| `src/components/nutrition-hub/DeficiencyAlert.tsx` | Show explicit "unavailable" message instead of hiding |

## What This Does NOT Do

- No new scoring logic
- No simulated or estimated micros
- No new database queries
- No decorative elements
- Every element maps directly to a stored value

