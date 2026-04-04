

# Nutrition Hub Intelligence Upgrade — Liquid Classification + Micronutrient Tracking

## Current State

- **Hydration**: `hydration_logs` table stores `amount_oz`, `log_date`, `logged_at` — no liquid type or quality classification
- **Food Database**: `nutrition_food_database` has macros + fiber/sugar/sodium but no micronutrient columns (no vitamin A, B, C, D, iron, zinc, etc.)
- **Nutrition Logs**: `vault_nutrition_logs` already has a `micros` JSONB column — ready for micronutrient storage
- **Smart Lookup**: AI-powered `parse-food-text` edge function returns macros only, no micronutrients
- **Quick Log**: Fast entry with smart auto-fill. Detailed mode uses MealBuilder with item-level tracking

## Architecture

```text
┌─────────────────────────────────────────────┐
│              HYDRATION SYSTEM               │
│                                             │
│  hydration_logs                             │
│  + liquid_type (text)      ← NEW column     │
│  + quality_class (text)    ← NEW column     │
│    'quality' | 'filler'                     │
│                                             │
│  useHydration hook                          │
│  + addWater(amount, type?, quality?)        │
│  + qualityTotal / fillerTotal / qualityPct  │
│                                             │
│  QuickLogActions                            │
│  + Quick buttons show type selector inline  │
│  + Auto-classify common liquids             │
│  + Manual override always available         │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│           MICRONUTRIENT ENGINE              │
│                                             │
│  nutrition_food_database                    │
│  + vitamin_a_mcg, vitamin_c_mg, etc.       │
│    (12 new nullable columns)               │
│                                             │
│  parse-food-text edge function             │
│  + AI prompt updated to return micros      │
│  + Returned in existing `micros` JSONB     │
│                                             │
│  vault_nutrition_logs.micros (JSONB)        │
│  + Already exists — store per-meal micros  │
│                                             │
│  MicronutrientPanel (NEW component)        │
│  + Daily aggregation from vault logs       │
│  + % of RDA per nutrient                   │
│  + Visible in Advanced/Today tab only      │
└─────────────────────────────────────────────┘
```

## Changes

### Phase 1: Database Migrations

**Migration 1 — Hydration quality columns:**
```sql
ALTER TABLE public.hydration_logs
  ADD COLUMN liquid_type text DEFAULT 'water',
  ADD COLUMN quality_class text DEFAULT 'quality';
```

**Migration 2 — Micronutrient columns on food database:**
```sql
ALTER TABLE public.nutrition_food_database
  ADD COLUMN vitamin_a_mcg numeric,
  ADD COLUMN vitamin_c_mg numeric,
  ADD COLUMN vitamin_d_mcg numeric,
  ADD COLUMN vitamin_e_mg numeric,
  ADD COLUMN vitamin_k_mcg numeric,
  ADD COLUMN vitamin_b6_mg numeric,
  ADD COLUMN vitamin_b12_mcg numeric,
  ADD COLUMN folate_mcg numeric,
  ADD COLUMN calcium_mg numeric,
  ADD COLUMN iron_mg numeric,
  ADD COLUMN magnesium_mg numeric,
  ADD COLUMN potassium_mg numeric,
  ADD COLUMN zinc_mg numeric;
```

### Phase 2: Hydration Quality System

**`src/constants/hydrationClassification.ts`** (NEW)
- `LIQUID_TYPES` array: water, coconut water, juice, milk, goat milk, sports drink, soda, coffee, tea, smoothie, other
- `QUALITY_MAP`: auto-classification mapping (water→quality, soda→filler, etc.)
- `classifyLiquid(type)` function

**`src/hooks/useHydration.ts`** — Extend
- `addWater(amount, liquidType?, qualityClass?)` — accepts new params
- New computed values: `qualityTotal`, `fillerTotal`, `qualityPercent`
- `todayLogs` includes `liquid_type` and `quality_class`

**`src/components/nutrition-hub/QuickLogActions.tsx`** — Extend hydration section
- Replace plain water buttons with a two-step flow: tap amount → pick liquid type (defaults to "Water/Quality")
- Liquid type selector: compact chip row (Water, Juice, Sports Drink, Soda, Other)
- Auto-classifies quality; small toggle to override
- Stays fast — single extra tap only when logging non-water

**`src/components/nutrition-hub/HydrationQualityBreakdown.tsx`** (NEW)
- Shows in MacroTargetDisplay or as a sub-card
- Donut/bar showing quality vs filler split
- Quality %, absolute oz for each

**`src/components/custom-activities/HydrationTrackerWidget.tsx`** — Update
- Show liquid type in today's entries list
- Color-code quality vs filler entries

### Phase 3: Micronutrient Extraction

**`supabase/functions/parse-food-text/index.ts`** — Update AI prompt
- Add instruction to return micronutrients alongside macros
- Return shape: `{ foods: [...], totals: { ...macros, micros: { vitamin_a_mcg, vitamin_c_mg, ... } } }`

**`src/hooks/useSmartFoodLookup.ts`** — Extend `SmartFoodResult`
- Add `micros` to `FoodItem` and `totals` interfaces
- Pass through from AI response

**`src/hooks/useMealVaultSync.ts`** — Store micros
- Aggregate micronutrients from meal items
- Save to `vault_nutrition_logs.micros` JSONB column (already exists)

**`src/components/nutrition-hub/MicronutrientPanel.tsx`** (NEW)
- Fetches today's `vault_nutrition_logs` and aggregates `micros` JSONB
- Shows each micronutrient: name, amount, unit, % of RDA
- RDA reference values hardcoded (USDA standard)
- Collapsible — shown in Today tab under Day Totals
- Not shown in Quick Log (zero clutter)

**`src/components/nutrition-hub/MealLogCard.tsx`** — Extend
- Add expandable micronutrient drill-down per meal (if micros data exists)
- Collapsed by default

### Phase 4: UI Integration

**`src/components/nutrition-hub/NutritionDailyLog.tsx`**
- Add `<MicronutrientPanel />` below Day Totals
- Add `<HydrationQualityBreakdown />` below hydration bar

**`src/components/nutrition-hub/MacroTargetDisplay.tsx`**
- Hydration bar now shows quality % indicator (small colored segment)

## Files Summary

| File | Change |
|------|--------|
| DB Migration | Add `liquid_type`, `quality_class` to `hydration_logs`; add 13 micronutrient columns to `nutrition_food_database` |
| `src/constants/hydrationClassification.ts` | NEW — liquid types, quality map, classifier |
| `src/hooks/useHydration.ts` | Extend addWater params, add quality/filler totals |
| `src/components/nutrition-hub/QuickLogActions.tsx` | Liquid type selector on hydration buttons |
| `src/components/nutrition-hub/HydrationQualityBreakdown.tsx` | NEW — quality vs filler visual breakdown |
| `src/components/custom-activities/HydrationTrackerWidget.tsx` | Show liquid type + color coding |
| `supabase/functions/parse-food-text/index.ts` | Update AI prompt for micronutrients |
| `src/hooks/useSmartFoodLookup.ts` | Extend interfaces for micros |
| `src/hooks/useMealVaultSync.ts` | Aggregate + persist micros to JSONB |
| `src/components/nutrition-hub/MicronutrientPanel.tsx` | NEW — daily micro aggregation + RDA % |
| `src/components/nutrition-hub/MealLogCard.tsx` | Expandable micro drill-down per meal |
| `src/components/nutrition-hub/NutritionDailyLog.tsx` | Integrate MicronutrientPanel + HydrationQualityBreakdown |
| `src/components/nutrition-hub/MacroTargetDisplay.tsx` | Quality % indicator on hydration bar |

## Zero-Friction Guarantee

- Quick Log: water buttons default to "Water/Quality" — zero extra taps for water
- Non-water liquids: one extra chip tap to classify
- Micronutrients: invisible in Quick Log, visible only in Today tab (Advanced view)
- No new required fields on meal logging
- All existing flows unchanged

