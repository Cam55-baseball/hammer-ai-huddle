
## Issues Identified

### 1. Missing Translation Keys (Raw Text Showing)
The following translation keys are missing from `en.json`, causing raw key strings to display:
- `smartFood.aiEstimate` - shows as "smartFood.aiEstimate"
- `smartFood.confidence` - shows as "smartFood.confidence"
- `smartFood.matchedDatabase` - referenced but not defined
- `smartFood.aiAnalyzing` - referenced but not defined
- `smartFood.enterManually` - referenced but not defined
- `vault.nutrition.presets` used as a label returns an object (the key exists as an object with nested keys, not a string)

### 2. Hydration Not Extracted from Food Input
When a user types "water" or "2 glasses of water" in "What did you eat?", the AI parses it but:
- The current `parse-food-text` function doesn't return hydration data
- The frontend hook doesn't extract or auto-fill hydration
- No hydration-aware logic exists in the smart lookup flow

### 3. Vault Nutrition Logs Not Syncing to Nutrition Hub
The Vault's `VaultNutritionLogCard` saves directly to `vault_nutrition_logs` but doesn't trigger React Query cache invalidation for `nutritionLogs` and `macroProgress` queries, causing the Nutrition Hub to show stale data.

---

## Solution

### Phase 1: Add Missing Translation Keys
Add the `smartFood` namespace to `en.json`:

```json
"smartFood": {
  "aiEstimate": "AI Estimate",
  "confidence": "confidence",
  "matchedDatabase": "Matched food database",
  "aiAnalyzing": "AI analyzing...",
  "enterManually": "Enter values manually",
  "high": "High",
  "medium": "Medium",
  "low": "Low"
}
```

Fix the presets label issue by using the existing `vault.nutrition.quickPresets` translation instead of `vault.nutrition.presets` (which is an object containing preset names).

### Phase 2: Add Hydration Parsing to AI & Frontend

**Backend (`parse-food-text/index.ts`):**
- Add `hydration_oz` field to the AI tool schema
- When user mentions "water", "juice", "coffee", "tea", "drink", etc., AI should estimate fluid ounces

**Frontend (`useSmartFoodLookup.ts`):**
- Add `hydration_oz` to `SmartFoodResult.totals`
- Return hydration value from AI response

**UI Components:**
- In `VaultNutritionLogCard.tsx`, `QuickNutritionLogDialog.tsx`, and `MealLoggingDialog.tsx`:
  - Auto-fill hydration field when `lookupResult.totals.hydration_oz > 0` (respecting touched fields)

### Phase 3: Sync Vault Nutrition Logs to Nutrition Hub
In `VaultNutritionLogCard.tsx`:
- After successful `onSave()`, invalidate React Query cache for `nutritionLogs` and `macroProgress` keys
- This ensures the Nutrition Hub reflects all logged data from any entry point

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/i18n/locales/en.json` | Add `smartFood` namespace with all required keys |
| `src/components/vault/VaultNutritionLogCard.tsx` | Fix presets label, add hydration auto-fill, add cache invalidation after save |
| `supabase/functions/parse-food-text/index.ts` | Add `hydration_oz` to AI tool schema |
| `src/hooks/useSmartFoodLookup.ts` | Add `hydration_oz` to result totals type and parsing |
| `src/components/QuickNutritionLogDialog.tsx` | Add hydration auto-fill logic |
| `src/components/nutrition-hub/MealLoggingDialog.tsx` | Add hydration auto-fill logic |

---

## Technical Details

### Translation Key Structure
```json
{
  "smartFood": {
    "aiEstimate": "AI Estimate",
    "confidence": "confidence",
    "matchedDatabase": "Matched food database",
    "aiAnalyzing": "AI analyzing...",
    "enterManually": "Enter values manually"
  }
}
```

### Hydration Schema Addition
```typescript
// In parse-food-text tool schema:
hydration_oz: { 
  type: "number", 
  description: "Total fluid ounces if beverages mentioned (water, juice, coffee, etc.)" 
}
```

### Auto-fill Logic
```typescript
// In useEffect for auto-fill:
if (!touchedFields.current.has('hydration') && totals.hydration_oz > 0) {
  setHydration(Math.round(totals.hydration_oz).toString());
}
```

### Cache Invalidation
```typescript
// After successful save in VaultNutritionLogCard:
queryClient.invalidateQueries({ queryKey: ['nutritionLogs'] });
queryClient.invalidateQueries({ queryKey: ['macroProgress'] });
```

---

## QA Checklist
1. Open Vault → Nutrition Log → verify "Quick Presets" label displays correctly (not raw object)
2. Type "greek yogurt" → verify "Matched food database" badge shows (not raw key)
3. Type "2 eggs and water" → verify AI returns estimate with hydration auto-filled
4. Manually edit hydration, then re-type food → hydration should NOT be overwritten
5. Save a meal in Vault → open Nutrition Hub → verify totals update immediately
6. Verify all smartFood translation keys render properly (no raw keys visible)
