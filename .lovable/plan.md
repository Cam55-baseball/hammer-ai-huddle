

# Fix Date Timezone Mismatch Between Quick Log and Nutrition Hub

## Problem Identified

The celery meal with 95 oz hydration **was saved successfully** to the database with `entry_date: 2026-02-03`. However, the Nutrition Hub is querying for a **different date** due to timezone inconsistency.

### Root Cause

| Component | Date Method | Example Output (US Eastern, Feb 2 at 7pm) |
|-----------|-------------|-------------------------------------------|
| QuickNutritionLogDialog | `new Date().toISOString().split('T')[0]` | `"2026-02-03"` (UTC) |
| NutritionDailyLog | `format(new Date(), 'yyyy-MM-dd')` | `"2026-02-02"` (local) |
| NutritionHubContent | `format(new Date(), 'yyyy-MM-dd')` | `"2026-02-02"` (local) |

The Quick Log saves with UTC date, but the Hub queries with local date - they never match for users in timezones behind UTC.

---

## Solution

Standardize all date formatting to use the user's **local date** consistently across all components.

### Files to Modify

| File | Change |
|------|--------|
| `src/components/QuickNutritionLogDialog.tsx` | Use `format(new Date(), 'yyyy-MM-dd')` instead of `toISOString().split('T')[0]` |
| `src/hooks/useMealVaultSync.ts` | Same fix - use `format()` for consistent local dates |

---

## Technical Implementation

### 1. Fix QuickNutritionLogDialog.tsx (Line 75)

**Before:**
```typescript
const today = new Date().toISOString().split('T')[0];
```

**After:**
```typescript
import { format } from 'date-fns';
// ...
const today = format(new Date(), 'yyyy-MM-dd');
```

### 2. Fix useMealVaultSync.ts (Line 102)

The `syncMealToVault` function also uses `format()` already, but we should verify it's consistent.

---

## Why This Fix Works

- `format(new Date(), 'yyyy-MM-dd')` from date-fns uses the **local timezone**
- All components (Quick Log, Nutrition Hub, Daily Log) will now use the same local date
- Meals logged on "Tuesday night" in the user's timezone will appear under "Tuesday" everywhere

---

## Expected Behavior After Fix

1. Log meal from Game Plan Quick Log at 7pm local time
2. Meal is saved with local date (e.g., "2026-02-02")
3. Navigate to Nutrition Hub
4. Nutrition Hub queries for local date ("2026-02-02")
5. Meal appears correctly in Daily Log and macro totals update

---

## Additional Verification

The `date-fns` `format()` function is already imported in `NutritionHubContent.tsx` and `NutritionDailyLog.tsx`. We just need to add the import to `QuickNutritionLogDialog.tsx` and update the date calculation.

