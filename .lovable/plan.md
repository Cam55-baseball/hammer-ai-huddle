
## Overview
Make the nutrition logging experience intuitive for users as young as 10 years old by:
1. Replacing the confusing "Meal Title" label with a simple, action-oriented phrase
2. Adding Smart Food Recognition to the Vault's nutrition log form (VaultNutritionLogCard)

---

## Change 1: Kid-Friendly Label Rename

### Current State
- Label: "Meal Title"
- Placeholder: "e.g., Protein Shake, Power Breakfast..."

### New State (optimized for 10-year-olds)
- Label: **"What did you eat?"**
- Placeholder: **"Type what you ate (e.g., 2 eggs, pizza, apple...)"**

This wording:
- Uses simple, direct language a child understands
- Frames it as a question (conversational)
- Gives concrete, relatable food examples kids recognize

### Files to Update

| File | Change |
|------|--------|
| `src/i18n/locales/en.json` | Update `vault.nutrition.mealTitle` and `vault.nutrition.mealTitlePlaceholder` |
| `src/components/QuickNutritionLogDialog.tsx` | Use translation key for label |
| `src/components/nutrition-hub/MealLoggingDialog.tsx` | Use translation key for label |
| `src/components/vault/VaultNutritionLogCard.tsx` | Already uses translation keys |

---

## Change 2: Add Smart Food Recognition to Vault Nutrition Log

### Current State
`VaultNutritionLogCard.tsx` has a meal title input field but **no** smart lookup integration. Users must manually enter all macro values.

### New State
Wire up the same `useSmartFoodLookup` hook that powers QuickNutritionLogDialog and MealLoggingDialog:
- When user types 3+ characters in "What did you eat?" field → trigger smart lookup
- Auto-fill calories/protein/carbs/fats (respecting touched fields)
- Show inline status: "Searching...", "Matched food database", or "AI estimate"

### Implementation Details

1. **Import the hook**
```typescript
import { useSmartFoodLookup } from '@/hooks/useSmartFoodLookup';
```

2. **Add touched fields tracking** (same pattern as other dialogs)
```typescript
const touchedFields = useRef<Set<string>>(new Set());
```

3. **Wire up useEffect for lookup trigger**
```typescript
useEffect(() => {
  if (mealTitle.length >= 3) {
    triggerLookup(mealTitle);
  } else {
    clearLookup();
  }
}, [mealTitle, triggerLookup, clearLookup]);
```

4. **Auto-fill macros when result arrives**
```typescript
useEffect(() => {
  if (lookupResult && lookupStatus === 'ready') {
    const { totals } = lookupResult;
    if (!touchedFields.current.has('calories') && totals.calories > 0) {
      setCalories(Math.round(totals.calories).toString());
    }
    // ... same for protein, carbs, fats
  }
}, [lookupResult, lookupStatus]);
```

5. **Add status indicator below the input field**
- Show spinner during "searching_db" or "calling_ai"
- Show "Matched food database" badge on DB match
- Show "AI estimate • X confidence" badge on AI result
- Show "Enter values manually" on error

6. **Update macro input handlers** to track touched state
```typescript
const handleMacroChange = (field: string, value: string, setter: (v: string) => void) => {
  setter(value);
  if (value) touchedFields.current.add(field);
};
```

---

## Translation Updates

```json
{
  "vault": {
    "nutrition": {
      "mealTitle": "What did you eat?",
      "mealTitlePlaceholder": "Type what you ate (e.g., 2 eggs, pizza, apple...)"
    }
  }
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/i18n/locales/en.json` | Update `mealTitle` and `mealTitlePlaceholder` translations |
| `src/components/vault/VaultNutritionLogCard.tsx` | Add `useSmartFoodLookup` integration with touched field tracking and status UI |
| `src/components/QuickNutritionLogDialog.tsx` | Use translation key for label (already uses key, just verify) |
| `src/components/nutrition-hub/MealLoggingDialog.tsx` | Update hardcoded "Meal Title" to translation key |

---

## QA Checklist
1. Open Vault → Nutrition Log → type "banana" → macros auto-fill
2. Open Nutrition Hub → Quick Entry → type "chicken sandwich" → macros auto-fill
3. Open Game Plan → Quick Log → type "oatmeal" → macros auto-fill
4. Verify label reads "What did you eat?" across all three locations
5. Manually edit protein, then type more → protein should NOT be overwritten
