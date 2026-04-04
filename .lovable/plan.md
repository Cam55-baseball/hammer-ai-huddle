

# Nutrition Hub — Trust Layer + Data Confidence System

## Current State

1. **`micros_incomplete` flag** exists in `useMealVaultSync.ts` line 183 — soft failure, allows empty micros
2. **No confidence tracking** — food items have `confidence` in `FoodItem` interface but it's not stored in `vault_nutrition_logs`
3. **DB pollution risk** — `useSmartFoodLookup.ts` lines 276-300 insert AI foods directly into `nutrition_food_database` with no validation gate
4. **DeficiencyAlert** detects issues but offers no corrective suggestions
5. **NutritionScoreCard** does not weight by confidence
6. **No audit trail** — source/confidence not stored per nutrition log

## Architecture

```text
Food Input → AI Parse → DB Enrichment → Confidence Assignment
                                       ↓
                            HIGH (DB match) → store directly
                            MEDIUM (AI + valid structure) → store with flag
                            LOW (AI incomplete) → stage in unverified_foods
                                       ↓
                            Nutrition Score weights by confidence
                            DeficiencyAlert suggests corrective foods
```

## Changes

### 1. DB Migration — Add `unverified_foods` staging table + confidence columns

```sql
-- Staging table for AI-generated foods pending validation
CREATE TABLE public.unverified_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  calories_per_serving numeric,
  protein_g numeric, carbs_g numeric, fats_g numeric,
  serving_size text,
  vitamin_a_mcg numeric DEFAULT 0, vitamin_c_mg numeric DEFAULT 0,
  vitamin_d_mcg numeric DEFAULT 0, vitamin_e_mg numeric DEFAULT 0,
  vitamin_k_mcg numeric DEFAULT 0, vitamin_b6_mg numeric DEFAULT 0,
  vitamin_b12_mcg numeric DEFAULT 0, folate_mcg numeric DEFAULT 0,
  calcium_mg numeric DEFAULT 0, iron_mg numeric DEFAULT 0,
  magnesium_mg numeric DEFAULT 0, potassium_mg numeric DEFAULT 0,
  zinc_mg numeric DEFAULT 0,
  confidence_level text DEFAULT 'low' CHECK (confidence_level IN ('high','medium','low')),
  source text DEFAULT 'ai',
  created_at timestamptz DEFAULT now(),
  promoted_at timestamptz
);

ALTER TABLE public.unverified_foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read unverified foods" ON public.unverified_foods FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert" ON public.unverified_foods FOR INSERT TO authenticated WITH CHECK (true);
```

Add confidence + source columns to `vault_nutrition_logs`:
```sql
ALTER TABLE public.vault_nutrition_logs
  ADD COLUMN IF NOT EXISTS data_confidence text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS data_source text DEFAULT 'ai';
```

### 2. `useSmartFoodLookup.ts` — Route AI foods to staging table + assign confidence

- Replace direct insert into `nutrition_food_database` (lines 276-300) with insert into `unverified_foods`
- Add validation gate: check all 13 micro keys present, values within realistic USDA ranges (e.g., vitamin_a_mcg 0-10000, iron_mg 0-100)
- Only promote to `nutrition_food_database` if confidence is 'high' (DB-enriched)
- Assign confidence per food: DB match → 'high', AI with valid micros → 'medium', AI with empty/partial micros → 'low'

### 3. `useMealVaultSync.ts` — Store confidence + source, remove `micros_incomplete`

- Replace `micros_incomplete` (line 183) with `data_confidence` and `data_source`
- Determine confidence from food items: if all 'high' → 'high', if any 'low' → 'low', else 'medium'
- Store `data_source: 'database' | 'ai' | 'mixed'` based on food resolution
- If micros empty AND all items are low confidence: still allow meal log (macros valuable) but set `micros: null` and `data_confidence: 'low'`

### 4. `NutritionScoreCard.tsx` — Confidence weighting

- Query `data_confidence` alongside existing fields
- Apply weight multiplier: high=1.0, medium=0.7, low=0.4
- Low-confidence-only days cannot score above 60

### 5. `DeficiencyAlert.tsx` — Add corrective food suggestions

- When a nutrient is 'deficient' or 'low', query `nutrition_food_database` for top 3 foods richest in that nutrient
- Display as "Try: Spinach, Almonds, Dark Chocolate" below each alert
- Only suggest from DB foods (high confidence)

### 6. No anti-drift periodic validation

This would require a cron job or background process. Instead: confidence is tracked per entry, and DB-resolved foods naturally upgrade confidence on re-lookup. This is self-correcting by design.

## Files Summary

| File | Change |
|------|--------|
| Migration | Create `unverified_foods` table, add `data_confidence`/`data_source` to `vault_nutrition_logs` |
| `src/hooks/useSmartFoodLookup.ts` | Route AI foods to `unverified_foods` with validation gate |
| `src/hooks/useMealVaultSync.ts` | Replace `micros_incomplete` with confidence/source tracking |
| `src/components/nutrition-hub/NutritionScoreCard.tsx` | Weight score by confidence |
| `src/components/nutrition-hub/DeficiencyAlert.tsx` | Add corrective food suggestions from DB |

## No edge function changes
The explicit 13-key micro schema is already correct.

