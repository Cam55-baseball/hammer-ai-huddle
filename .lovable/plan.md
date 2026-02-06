
# Fix: "Failed to save nutrition log" Error

## Root Cause

The database error logs show:
```
new row for relation "vault_nutrition_logs" violates check constraint "vault_nutrition_logs_energy_level_check"
```

The energy level slider in the Vault Nutrition Log form allows values from **1 to 10**, but the database has a CHECK constraint that only accepts **1 to 5**. When a user sets their energy level to 6 or higher (or the default value of 5 is fine, but anything above 5 fails), the insert is rejected by the database.

## Solution

Update the energy level slider to match the database constraint (1-5 scale). This is consistent with the memory note that says "The energy level scale is strictly limited to 1-5 to comply with database constraints."

### Changes to `src/components/vault/VaultNutritionLogCard.tsx`

1. **Change Slider max from 10 to 5** (line 787)
   - `max={10}` becomes `max={5}`

2. **Update the label display** (line 782)
   - Change `{energyLevel[0]}/10` to `{energyLevel[0]}/5`

3. **Update the number markers below the slider** (lines 792-800)
   - Change the array from `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]` to `[1, 2, 3, 4, 5]`

No database changes needed -- the constraint is correct and should stay as-is. The UI simply needs to match the allowed range.

## Files Modified

| File | Change |
|------|--------|
| `src/components/vault/VaultNutritionLogCard.tsx` | Update slider max from 10 to 5, update label and number markers |

## Why This Fixes It

- The database only accepts energy_level values 1-5
- The slider currently allows values up to 10
- Any value above 5 causes the insert to fail with a constraint violation
- Limiting the slider to 1-5 prevents invalid values from ever being submitted
