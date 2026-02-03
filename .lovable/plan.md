

# Fix Quick Nutrition Log: Double Units and Energy Level Error

## Problems Identified

### Issue 1: Double Unit Labels
The labels display units twice (e.g., "Protein (g) (g)") because:
- **Translation strings already include units**: 
  - `vault.nutrition.protein` = "Protein (g)"
  - `vault.nutrition.carbs` = "Carbs (g)"
  - `vault.nutrition.fats` = "Fats (g)"
  - `vault.nutrition.hydration` = "Hydration (oz)"
- **Code adds units again** on lines 202, 212, 221, and 235

### Issue 2: Energy Level Constraint Violation
When clicking "Log Meal", the error occurs because:
- **Database constraint**: `energy_level` must be between 1 and 5
  ```sql
  CHECK ((energy_level >= 1) AND (energy_level <= 5))
  ```
- **UI offers values 1-10**: Default is 5 (works), but selecting 6-10 violates the constraint

---

## Solution

| File | Change |
|------|--------|
| `src/components/QuickNutritionLogDialog.tsx` | Remove duplicate "(g)" and "(oz)" from labels; Change energy level scale to 1-5 |

---

## Technical Implementation

### 1. Fix Double Unit Labels (Lines 202, 212, 221, 235)

**Before:**
```typescript
<Label>{t('vault.nutrition.protein')} (g)</Label>  // "Protein (g) (g)"
<Label>{t('vault.nutrition.carbs')} (g)</Label>    // "Carbs (g) (g)"
<Label>{t('vault.nutrition.fats')} (g)</Label>     // "Fats (g) (g)"
<Label>{t('vault.nutrition.hydration')} (oz)</Label> // "Hydration (oz) (oz)"
```

**After:**
```typescript
<Label>{t('vault.nutrition.protein')}</Label>   // "Protein (g)"
<Label>{t('vault.nutrition.carbs')}</Label>     // "Carbs (g)"
<Label>{t('vault.nutrition.fats')}</Label>      // "Fats (g)"
<Label>{t('vault.nutrition.hydration')}</Label> // "Hydration (oz)"
```

### 2. Fix Energy Level Scale (Lines 251-271)

**Before:**
```typescript
{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
  <button
    // Styling for 10 levels with different color thresholds
    className={`... ${
      energyLevel === level
        ? level <= 3 ? 'bg-red-500' 
          : level <= 5 ? 'bg-orange-500'
            : level <= 7 ? 'bg-amber-500' 
              : 'bg-green-500'
        : 'bg-muted'
    }`}
  >
```

**After:**
```typescript
{[1, 2, 3, 4, 5].map((level) => (
  <button
    // Styling adjusted for 5 levels
    className={`... ${
      energyLevel === level
        ? level <= 2 ? 'bg-red-500 text-white'     // Low (1-2)
          : level === 3 ? 'bg-amber-500 text-secondary'  // Medium (3)
            : 'bg-green-500 text-white'             // High (4-5)
        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
    }`}
  >
```

---

## Expected Outcome

After these fixes:
1. Labels will display correctly: "Protein (g)", "Carbs (g)", "Fats (g)", "Hydration (oz)"
2. Energy level selector will show 1-5 only, matching the database constraint
3. "Log Meal" button will successfully save entries without constraint violations

