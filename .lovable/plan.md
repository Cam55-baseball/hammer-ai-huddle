

# Advantage Layer — Final Precision Lock

## Changes

### 1. `src/constants/nutrientPerformanceMap.ts` — Direct Impact Language
Replace all "may reduce/limit/impair" with direct physiological statements:
```
magnesium_mg: 'Low magnesium limits recovery quality'
iron_mg: 'Low iron limits energy output'
calcium_mg: 'Low calcium limits bone strength'
// etc — all 13 rewritten, no hedging
```

### 2. `src/hooks/useNutritionGuidance.ts` — Tighten Score Label
Change `ptsRecoverable` display format from `~X pts` to `+X score gain potential` (stored as string in a new `ptsLabel` field on `LimitingFactor`).

### 3. `src/components/nutrition-hub/GuidancePanel.tsx` — Decision Context Microcopy
- First limiting factor gets label: `"Highest impact nutrient to improve score"`
- Score display changes from `~{pts}pts` to `+{pts} score gain potential`

### 4. `src/components/nutrition-hub/CravingGuidance.tsx` — Hard Constraints
- **Max 2 suggestions** (change `.limit(3)` → `.limit(2)` on line 74)
- **Tighten deficiency threshold**: change `< 0.75` to `< 0.40` on line 61
- When `limitingFactorKeys` is empty (no limiting factors computed), return empty — don't fall back to all nutrients

### 5. Food Quality — No Code Change Needed
Food ranking already uses `.order(topKey, { ascending: false })` which ranks by nutrient density. The database content determines quality — fortified items rank naturally lower when nutrient density is the sort key. No code change required here; this is a data quality concern.

## Files Changed

| File | Change |
|------|--------|
| `src/constants/nutrientPerformanceMap.ts` | Direct impact language (remove "may") |
| `src/hooks/useNutritionGuidance.ts` | Add `ptsLabel` field to LimitingFactor |
| `src/components/nutrition-hub/GuidancePanel.tsx` | Show `+X score gain potential`, add "Highest impact" label to first factor |
| `src/components/nutrition-hub/CravingGuidance.tsx` | Max 2 suggestions, <40% RDA threshold, require limitingFactorKeys |

