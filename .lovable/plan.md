

# Advantage Layer — Elite Refinement

## Changes

### 1. `src/hooks/useNutritionGuidance.ts` — Score-Impact Ranking + Compressed Output

**Prioritization upgrade**: Rank limiting factors by `(100 - percent) * microWeight / 13` — this approximates actual score points recoverable per nutrient. Nutrients with adaptive priority multipliers from baseline get an additional boost.

**Food suggestions upgrade**: Query top 2 foods (not 3) for the primary limiting nutrient. For each food, also check if it covers the second limiting nutrient — if so, label it as "dual-benefit". Select columns for both limiting nutrient values to compute density ranking.

**Nudge compression**: Return max 1 nudge. Priority order: progress delta > coverage warning > consistency prompt. Progress nudge reframed: `"Micronutrient coverage improved +X% — higher scoring potential unlocked"`.

**Suppressed state message**: Change to `"Guidance unavailable — log verified foods to unlock"`.

### 2. `src/components/nutrition-hub/GuidancePanel.tsx` — Decision-Grade Display

**Limiting factors**: Reframe impact from passive (`"Recovery / sleep quality"`) to active (`"Low magnesium may reduce recovery quality"`). Show score impact estimate: `"~X pts recoverable"`.

**Food suggestions**: Each item shows: food name + which nutrients it fixes + why (e.g., "highest combined density" or "fastest single-source correction"). Max 2 items.

**Nudges**: Max 1, with outcome framing.

**Zero data**: Single line only — no card chrome, no empty panels.

### 3. `src/components/nutrition-hub/CravingGuidance.tsx` — Tighten Alignment

**Constraint**: Craving suggestions must intersect with top 2 limiting factors (from guidance hook). Pass limiting factor keys as prop. Filter `deficientKeys` to only those in limiting factors.

**No match**: Show `"No aligned foods found — prioritize nutrient correction first"` instead of generic message.

**Zero data**: Don't render the card at all (not even suppressed state) — hard stop per requirement.

### 4. `src/components/nutrition-hub/DeficiencyAlert.tsx` — Supplement Intelligence

**Supplement differentiation**: For nutrients at optimal/excess when supplements are present, distinguish:
- If food-derived intake < 25% RDA → `"Covered via supplement only — whole-food sources improve absorption"`
- If food-derived intake >= 25% RDA → `"Supported by food + supplement"`

Show as small inline label below the nutrient row. One line only, no over-messaging.

### 5. `src/constants/nutrientPerformanceMap.ts` — Impact Reframing

Add `NUTRIENT_IMPACT_ACTIVE` map with direct physiological framing:
```typescript
magnesium_mg: 'Low magnesium may reduce recovery quality'
iron_mg: 'Low iron may limit energy output'
// etc.
```

## Files Changed

| File | Change |
|------|--------|
| `src/constants/nutrientPerformanceMap.ts` | Add `NUTRIENT_IMPACT_ACTIVE` map |
| `src/hooks/useNutritionGuidance.ts` | Score-weighted ranking, dual-nutrient food query, 1-nudge limit, progress reframing |
| `src/components/nutrition-hub/GuidancePanel.tsx` | Active impact framing, food justification, score-pts display, compressed layout |
| `src/components/nutrition-hub/CravingGuidance.tsx` | Filter by limiting factors, stricter no-match message, hard-stop on zero data |
| `src/components/nutrition-hub/DeficiencyAlert.tsx` | Supplement-only vs food+supplement distinction |
| `src/components/nutrition-hub/NutritionDailyLog.tsx` | Pass limiting factor keys to CravingGuidance |

## Compression Rules Enforced
- Max 2 limiting factors
- Max 2 food suggestions
- Max 1 nudge
- Zero-data = single line, no card

