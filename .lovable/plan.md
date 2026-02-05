

## Overview
Strengthen the Smart Food Recognition to reliably auto-fill ALL appropriate fields by fixing several issues in the current implementation.

---

## Issues Identified

### Issue 1: Database Query Fails with Special Characters
**From network logs:**
```
GET /nutrition_food_database?or=(name.ilike.%pork chop, rice and 8oz of water%...)
Status: 400
Error: "failed to parse logic tree... unexpected '%'"
```
When user input contains commas (`,`), the PostgREST `or()` filter breaks. This causes the DB search to fail silently, forcing every query to AI even when simpler foods could match locally.

### Issue 2: Auto-Fill Only Works When Value > 0
Current logic:
```typescript
if (!touchedFields.current.has('calories') && totals.calories > 0) {
  setCalories(Math.round(totals.calories).toString());
}
```
This means if a food has **0 carbs** (like "grilled chicken"), the carbs field remains empty instead of showing "0". Users don't know if it's truly 0 or just didn't fill.

### Issue 3: Meal Type Not Auto-Detected
The AI could infer meal type from context:
- "oatmeal and orange juice" → breakfast
- "chicken sandwich" → lunch
- "steak and mashed potatoes" → dinner
- "protein bar" → snack
- "glass of water" → hydration

Currently this is never set automatically.

### Issue 4: Hook Doesn't Expose Full Food Items
The hook returns `totals` for auto-fill but the UI doesn't show what was recognized. Users can't verify accuracy before saving.

---

## Solution

### Phase 1: Fix Database Query Escaping
In `useSmartFoodLookup.ts`, sanitize the query before sending to PostgREST:
- Escape or remove special characters (`,`, `%`, `*`) that break `ilike`
- Use only alphanumeric + spaces for DB search

```typescript
// Sanitize for safe PostgREST query
const sanitized = trimmed.replace(/[%,*()]/g, ' ').replace(/\s+/g, ' ').trim();
```

### Phase 2: Auto-Fill Fields Even When Value is 0
Change the condition from `> 0` to `>= 0` with a check that the field exists:
```typescript
if (!touchedFields.current.has('carbs') && typeof totals.carbs_g === 'number') {
  setCarbs(Math.round(totals.carbs_g).toString());
}
```
This ensures "0" displays explicitly for zero-value macros.

### Phase 3: Add Meal Type Auto-Detection to AI
Update the edge function's tool schema to include:
```typescript
suggested_meal_type: {
  type: "string",
  enum: ["breakfast", "lunch", "dinner", "snack", "hydration"],
  description: "Inferred meal type based on foods (breakfast items → breakfast, etc.)"
}
```
Update the system prompt to guide the AI:
```
Infer meal_type from context:
- Morning items (eggs, bacon, oatmeal, cereal, toast, coffee, juice) → "breakfast"
- Midday items (sandwich, salad, soup, burger) → "lunch"
- Evening items (steak, pasta, casserole, dinner plate) → "dinner"
- Small items (bar, nuts, fruit, chips) → "snack"
- Only beverages with no calories → "hydration"
```

### Phase 4: Update Hook to Return Suggested Meal Type
```typescript
export interface SmartFoodResult {
  // ... existing fields
  suggestedMealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'hydration';
}
```

### Phase 5: Auto-Fill Meal Type in UI Components
In all three dialogs, when result arrives:
```typescript
if (!mealType && lookupResult.suggestedMealType) {
  setMealType(lookupResult.suggestedMealType);
}
```
Only set if user hasn't already selected one (respects user choice).

### Phase 6: Show Recognized Foods Preview
Add a collapsible "What I recognized:" section below the status badge:
```
✨ AI Estimate • High confidence
▼ What I recognized:
  • Pork chop (6 oz) - 380 cal
  • White rice (1 cup) - 205 cal
  • Water (8 oz) - 0 cal
```
This builds trust and lets users verify before saving.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/parse-food-text/index.ts` | Add `suggested_meal_type` to tool schema; enhance system prompt for meal type inference |
| `src/hooks/useSmartFoodLookup.ts` | Fix query sanitization; add `suggestedMealType` to result; change `> 0` to `typeof === 'number'` |
| `src/components/vault/VaultNutritionLogCard.tsx` | Auto-fill meal type; show "0" for zero macros; add recognized foods preview |
| `src/components/QuickNutritionLogDialog.tsx` | Same changes as VaultNutritionLogCard |
| `src/components/nutrition-hub/MealLoggingDialog.tsx` | Same changes as VaultNutritionLogCard |
| `src/i18n/locales/en.json` | Add `smartFood.recognizedFoods` translation |

---

## Technical Details

### Sanitized Query Example
```typescript
// Input: "pork chop, rice and 8oz of water"
// Sanitized: "pork chop rice and 8oz of water"
const sanitized = trimmed.replace(/[%,*()]/g, ' ').replace(/\s+/g, ' ').trim();
```

### Updated Tool Schema (Edge Function)
```typescript
suggested_meal_type: {
  type: "string",
  enum: ["breakfast", "lunch", "dinner", "snack", "hydration"],
  description: "Inferred meal type: breakfast (morning items), lunch (midday), dinner (evening), snack (small items), hydration (beverages only)"
}
```

### Auto-Fill Logic (All Zero Values Fill)
```typescript
// Fill ALL macro fields including zeros
const fields = [
  { key: 'calories', value: totals.calories, setter: setCalories },
  { key: 'protein', value: totals.protein_g, setter: setProtein },
  { key: 'carbs', value: totals.carbs_g, setter: setCarbs },
  { key: 'fats', value: totals.fats_g, setter: setFats },
  { key: 'hydration', value: totals.hydration_oz, setter: setHydration },
];

fields.forEach(({ key, value, setter }) => {
  if (!touchedFields.current.has(key) && typeof value === 'number') {
    setter(Math.round(value).toString());
  }
});
```

---

## QA Checklist
1. Type "grilled chicken" → carbs shows "0" (not empty)
2. Type "pork chop, rice and water" → no 400 error, AI fills all fields including hydration
3. Type "oatmeal and OJ" → meal type auto-sets to "breakfast"
4. Type "protein bar" → meal type auto-sets to "snack"
5. Type "just water" → meal type auto-sets to "hydration", hydration fills
6. Manually select "dinner" first, then type food → meal type stays "dinner"
7. See "What I recognized:" preview with item breakdown
8. Edit any field manually → that field won't be overwritten on subsequent lookups

