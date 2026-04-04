

# Advantage Layer — Precision Guidance System

## Summary
Create a new `GuidancePanel` component and supporting hook that derives actionable guidance strictly from existing scored data. Adds a craving-driven suggestion feature. No new scoring logic — pure read from existing computations.

## New Files

### 1. `src/constants/nutrientPerformanceMap.ts`
Fixed mapping of nutrients to athlete-relevant outcomes:
```typescript
export const NUTRIENT_IMPACT: Record<string, string> = {
  magnesium_mg: 'Recovery / sleep quality',
  iron_mg: 'Energy / oxygen transport',
  vitamin_b12_mcg: 'Cognitive function / energy',
  vitamin_c_mg: 'Immune support / recovery',
  potassium_mg: 'Hydration / muscle function',
  calcium_mg: 'Bone strength / muscle contraction',
  zinc_mg: 'Immune function / tissue repair',
  vitamin_d_mcg: 'Bone health / immune support',
  vitamin_a_mcg: 'Vision / immune support',
  folate_mcg: 'Cell repair / energy metabolism',
  vitamin_b6_mg: 'Protein metabolism / energy',
  vitamin_e_mg: 'Antioxidant / cell protection',
  vitamin_k_mcg: 'Blood clotting / bone health',
};
```

### 2. `src/hooks/useNutritionGuidance.ts`
Hook that consumes existing query data (score breakdown, deficiency alerts, micro coverage) and computes:

- **Top 2 limiting factors** — reads `NutritionScoreCard` breakdown to identify lowest-scoring dimension (micro/hydration/macro/variety), then drills into specific nutrients from deficiency data
- **Fastest path to improvement** — queries `nutrition_food_database` for top foods matching the limiting nutrients
- **Suppression** — returns `null` guidance if `microCoverage.withMicros === 0`
- **Behavioral nudges**:
  - If `microCoverage < 50%` → "Increase verified foods to unlock full nutrient tracking"
  - If consistency is `null` → "Log nutrient-complete meals to activate consistency scoring"
  - If coverage improved vs yesterday → "+X% micronutrient coverage vs yesterday"

Data sources: reuses `nutritionScore`, `deficiencyAlerts`, `micronutrients` query keys already cached by existing components. No new DB queries for score computation.

### 3. `src/components/nutrition-hub/GuidancePanel.tsx`
Renders the guidance output. Structure:

```
┌─────────────────────────────────┐
│ ⚡ How to Improve Your Score    │
│                                 │
│ Top limiting factors:           │
│  1. Magnesium (12% RDA)        │
│     → Recovery / sleep quality  │
│  2. Iron (34% RDA)             │
│     → Energy / oxygen transport │
│                                 │
│ Fastest path:                   │
│  • Spinach (high Mg + Iron)     │
│  • Pumpkin seeds (Mg + Zinc)    │
│                                 │
│ ┌─ Nudge ─────────────────────┐ │
│ │ +22% micro coverage vs      │ │
│ │ yesterday                   │ │
│ └─────────────────────────────┘ │
│                                 │
│ When micros = 0:                │
│ "Guidance unavailable —         │
│  insufficient micronutrient     │
│  data"                          │
└─────────────────────────────────┘
```

Suppressed entirely when micro coverage = 0 (shows single "unavailable" message instead).

### 4. `src/components/nutrition-hub/CravingGuidance.tsx`
Small input + response card:

- Text input or quick-pick chips: "Sweet", "Salty", "Crunchy", "Chocolate"
- On submit: reads current deficiency data from cached query
- Matches craving category to foods from `nutrition_food_database` that are high in deficient nutrients
- Returns 2-3 specific foods with nutrient alignment explanation
- **Suppressed** when `microCoverage = 0` — shows "Log verified foods to unlock craving guidance"
- No AI calls — pure DB lookup + deterministic matching

### 5. Supplement Handling (in existing `DeficiencyAlert.tsx`)
- Already included in daily micro totals (existing behavior is correct)
- Add visual distinction: if a nutrient reaches RDA primarily via supplements, show "covered via supplement" label
- Still show "Consider whole-food sources" nudge for supplement-covered nutrients

## Modified Files

| File | Change |
|------|--------|
| `src/constants/nutrientPerformanceMap.ts` | New — fixed nutrient→outcome mappings |
| `src/hooks/useNutritionGuidance.ts` | New — guidance computation hook |
| `src/components/nutrition-hub/GuidancePanel.tsx` | New — guidance UI |
| `src/components/nutrition-hub/CravingGuidance.tsx` | New — craving-driven suggestions |
| `src/components/nutrition-hub/NutritionDailyLog.tsx` | Add `<GuidancePanel />` and `<CravingGuidance />` below NutritionScoreCard |
| `src/components/nutrition-hub/DeficiencyAlert.tsx` | Add "covered via supplement" label + whole-food nudge |

## Suppression Rules (enforced in hook)
- `microCoverage.withMicros === 0` → all guidance returns `{ status: 'suppressed', message: 'Guidance unavailable — insufficient micronutrient data' }`
- All confidence labels pass through from existing data — no re-computation
- No estimation of missing micros

## What This Does NOT Do
- No new scoring logic
- No AI API calls (craving guidance is pure DB lookup)
- No new database tables or migrations
- No simulated or estimated data
- Every output traceable to a stored value

