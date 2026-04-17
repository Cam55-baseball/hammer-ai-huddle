

## Plan — Performance-Grade Hydration Quality Scoring

### Goal
Replace the simplistic "quality vs filler" binary with a real, explainable **Hydration Score (0–100)** derived from water %, electrolytes, and sugar — stored on each log and surfaced in the Nutrition Hub + Vault.

---

### 1. Database — schema changes

**Table: `hydration_logs`** — add nutrition + computed hydration profile columns.

| Column | Type | Purpose |
|---|---|---|
| `water_g` | numeric | Water content (grams) |
| `sodium_mg` | numeric | Sodium |
| `potassium_mg` | numeric | Potassium |
| `magnesium_mg` | numeric | Magnesium |
| `sugar_g` | numeric | Total sugar |
| `total_carbs_g` | numeric | Total carbs |
| `hydration_profile` | jsonb | `{ water_percent, electrolyte_score, sugar_penalty, hydration_score, hydration_tier, insight }` |

All nullable (legacy logs unaffected). No backfill required — old logs continue to use the existing `quality_class` fallback.

**Table: `hydration_beverage_database`** (new) — canonical per-oz nutrition for common drinks.

| Column | Type |
|---|---|
| `id` uuid pk |
| `liquid_type` text unique (matches existing `liquid_type` enum keys) |
| `display_name` text |
| `water_g_per_oz`, `sodium_mg_per_oz`, `potassium_mg_per_oz`, `magnesium_mg_per_oz`, `sugar_g_per_oz`, `total_carbs_g_per_oz` numeric |
| `source` text (`'usda'`, `'branded'`, `'manual'`) |
| `usda_fdc_id` text nullable |

Seeded via insert tool with USDA FoodData Central values for the ~15 existing liquid types (water, coconut water, milk, gatorade, coffee, tea, soda, juice, beer, etc.). RLS: read-public, write-owner-only.

---

### 2. Scoring engine — new util

**File**: `src/utils/hydrationScoring.ts`

```text
computeHydrationProfile(nutrition):
  water_percent     = (water_g / serving_g) * 100
  electrolyte_score = scoreElectrolytes(Na, K, Mg)   // 0–100, weighted Na 50%, K 30%, Mg 20%
  sugar_penalty     = sugarPenalty(sugar_g, oz)       // 100 if low, scales down >6g/8oz
  hydration_score   = round(water%*0.6 + electrolyte_score*0.3 + sugar_penalty*0.1)
  hydration_tier    = >=85 optimal | >=70 high | >=50 moderate | low
  insight           = generateInsight(...)            // deterministic templated string
```

Pure, deterministic, unit-tested-friendly. Used at log time (frontend) and re-usable in edge functions.

---

### 3. Log creation — compute & store at write time

**File**: `src/hooks/useHydration.ts`

- `addWater(amount, liquidType, qualityClass)` → also looks up `hydration_beverage_database` row for `liquidType`, scales per-oz nutrition by `amount`, calls `computeHydrationProfile`, and writes the full nutrition + `hydration_profile` JSONB into the insert.
- Computed once at log time per requirement — never recomputed on render.
- Fallback: if no DB row, store `null` profile and UI shows volume-only.

---

### 4. UI — per-log hydration card

**New component**: `src/components/nutrition-hub/HydrationLogCard.tsx`

Replaces the plain row inside `HydrationTrackerWidget` popover and adds a richer breakdown in the Nutrition Hub.

Per log displays:
- Big score chip + tier label (color-coded: optimal=emerald, high=blue, moderate=amber, low=red)
- 4-stat grid: Water %, Sodium mg, Potassium mg, Sugar g
- Magnesium row + insight sentence
- Existing delete button

**Updated component**: `src/components/nutrition-hub/HydrationQualityBreakdown.tsx`

- Replace "Quality vs Filler" bar with **Daily Average Hydration Score** + tier
- Add aggregate breakdown row: total liquid oz · avg score · total Na · total K · total sugar
- Keep existing efficiency score logic but feed it from new score average

---

### 5. Vault daily view integration

**File**: `src/components/vault/...` (locate hydration daily-summary cell)

Show four new aggregate stats per day:
- Total liquid intake (oz)
- Average hydration score (0–100, color tier)
- Total electrolytes from fluids (Na+K+Mg)
- Total sugar from fluids (g)

Computed by aggregating the day's `hydration_logs` rows.

---

### 6. Hook updates

`useHydration` returns extended fields:
- `dailyAverageScore`, `dailyTier`
- `totalSodiumMg`, `totalPotassiumMg`, `totalMagnesiumMg`, `totalSugarG`
- Per-log enriched data (already in row via JSONB)

`useDailyNutritionTargets` and `MacroTargetDisplay` continue using `consumedHydration` (volume) for the goal-progress bar — unchanged. The score is **additive** insight, not a replacement for the volume goal.

---

### Files

| File | Action |
|---|---|
| **Migration** | Add columns to `hydration_logs`; create `hydration_beverage_database` + RLS |
| **Insert** | Seed `hydration_beverage_database` with ~15 USDA-backed entries |
| `src/utils/hydrationScoring.ts` | NEW — pure scoring engine |
| `src/hooks/useHydration.ts` | Compute + store profile on add; expose aggregates |
| `src/components/nutrition-hub/HydrationLogCard.tsx` | NEW — per-log rich card |
| `src/components/nutrition-hub/HydrationQualityBreakdown.tsx` | Replace binary with score-based breakdown |
| `src/components/custom-activities/HydrationTrackerWidget.tsx` | Use new HydrationLogCard for entries |
| Vault daily summary component | Add 4 aggregate hydration stats |
| `mem://features/nutrition-hub/hydration-quality-system` | Update memory to reflect score-based system |

### Backwards compatibility
- Legacy logs without `hydration_profile` → display volume only, no score chip
- `quality_class` column kept (read-only fallback) — not removed
- All existing realtime + BroadcastChannel sync logic preserved

### Out of scope (per "Optional later")
- Glucose/fructose split, osmolality, absorption rate
- Branded API integration (manual seed for v1; structure supports later sync)
- Editing nutrition on a logged drink

