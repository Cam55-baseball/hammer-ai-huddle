
# React Query Cache Invalidation for Seamless Nutrition Sync

## Overview

This plan implements centralized cache invalidation so all nutrition logging entry points (Game Plan Quick Log, Nutrition Hub dialogs, meal editing) automatically update macro displays across all views in real-time.

---

## Current Problem

| Entry Point | Saves To | Refreshes |
|-------------|----------|-----------|
| Game Plan → Quick Log | `vault_nutrition_logs` | Only Game Plan's own `refetch()` |
| Nutrition Hub → MealLoggingDialog | `vault_nutrition_logs` | Only local `handleMealSaved()` |
| NutritionDailyLog delete | `vault_nutrition_logs` | Only local state |

**Result**: Changes from one module don't propagate to others. Macros (calories, carbs, fats, protein) stay stale until manual navigation.

---

## Solution Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                     MEAL LOGGING ENTRY POINTS                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Game Plan                    Nutrition Hub                     │
│  ┌────────────────┐          ┌──────────────────────┐          │
│  │QuickNutrition  │          │ MealLoggingDialog    │          │
│  │LogDialog       │          │ CommonFoodsGallery   │          │
│  │                │          │ FavoriteFoodsWidget  │          │
│  └───────┬────────┘          └──────────┬───────────┘          │
│          │                              │                       │
│          └──────────────┬───────────────┘                       │
│                         ▼                                       │
│            ┌────────────────────────┐                          │
│            │  vault_nutrition_logs  │                          │
│            │     (Supabase)         │                          │
│            └───────────┬────────────┘                          │
│                        │                                        │
│                        ▼                                        │
│   ┌────────────────────────────────────────────────┐           │
│   │     queryClient.invalidateQueries()            │           │
│   │  • ['nutritionLogs', dateStr]                  │           │
│   │  • ['macroProgress', dateStr]                  │           │
│   └────────────────────────────────────────────────┘           │
│                        │                                        │
│         ┌──────────────┼──────────────┐                        │
│         ▼              ▼              ▼                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │ GamePlan   │ │ MacroTarget │ │ DailyLog    │              │
│  │ (status ✓) │ │ Display     │ │ (meal list) │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Purpose |
|------|---------|
| `src/components/QuickNutritionLogDialog.tsx` | Add query invalidation after save |
| `src/components/nutrition-hub/MealLoggingDialog.tsx` | Add query invalidation after save |
| `src/components/nutrition-hub/NutritionDailyLog.tsx` | Convert to React Query with cache key |
| `src/components/nutrition-hub/NutritionHubContent.tsx` | Convert fetchConsumed to React Query |
| `src/hooks/useMealVaultSync.ts` | Add query invalidation after vault sync |

---

## Technical Implementation

### 1. QuickNutritionLogDialog.tsx

Add `useQueryClient` and invalidate nutrition queries after successful save:

```typescript
// Add import
import { useQueryClient } from '@tanstack/react-query';

// Inside component
const queryClient = useQueryClient();

// After successful save (line ~92):
const { error } = await supabase.from('vault_nutrition_logs').insert({...});
if (error) throw error;

// ADD: Invalidate all nutrition-related queries
queryClient.invalidateQueries({ queryKey: ['nutritionLogs'] });
queryClient.invalidateQueries({ queryKey: ['macroProgress'] });

toast.success(t('vault.nutrition.mealLogged'));
```

### 2. MealLoggingDialog.tsx

Add query invalidation after meal sync:

```typescript
// Add import
import { useQueryClient } from '@tanstack/react-query';

// Inside component
const queryClient = useQueryClient();

// After syncMealToVault succeeds (both quick and detailed handlers):
if (result.success) {
  queryClient.invalidateQueries({ queryKey: ['nutritionLogs'] });
  queryClient.invalidateQueries({ queryKey: ['macroProgress'] });
  toast.success('Meal logged successfully');
  // ...rest of success handling
}
```

### 3. NutritionDailyLog.tsx

Convert to React Query for automatic cache synchronization:

```typescript
// Add import
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Replace useState + fetchMeals with useQuery:
const dateStr = format(currentDate, 'yyyy-MM-dd');

const { data: meals = [], isLoading: loading, refetch } = useQuery({
  queryKey: ['nutritionLogs', dateStr, user?.id],
  queryFn: async () => {
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('vault_nutrition_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('entry_date', dateStr)
      .order('logged_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(log => ({
      id: log.id,
      mealType: log.meal_type,
      mealTitle: log.meal_title,
      loggedAt: log.logged_at || log.created_at || new Date().toISOString(),
      calories: log.calories,
      proteinG: log.protein_g,
      carbsG: log.carbs_g,
      fatsG: log.fats_g,
      supplements: Array.isArray(log.supplements) ? log.supplements : null,
    })) as MealLogData[];
  },
  enabled: !!user,
});

// Update handleDeleteMeal to invalidate cache:
const handleDeleteMeal = async (mealId: string) => {
  try {
    const { error } = await supabase.from('vault_nutrition_logs').delete().eq('id', mealId);
    if (error) throw error;
    
    // Invalidate to refresh list
    queryClient.invalidateQueries({ queryKey: ['nutritionLogs'] });
    queryClient.invalidateQueries({ queryKey: ['macroProgress'] });
    toast.success('Meal deleted');
  } catch (error) {
    console.error('Error deleting meal:', error);
    toast.error('Failed to delete meal');
  }
};
```

### 4. NutritionHubContent.tsx

Convert `fetchConsumed` to React Query:

```typescript
// Add import
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Replace useState + fetchConsumed with useQuery:
const today = format(new Date(), 'yyyy-MM-dd');

const { data: consumedTotals = { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }, isLoading: loadingConsumed } = useQuery({
  queryKey: ['macroProgress', today, user?.id],
  queryFn: async () => {
    if (!user) return { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 };
    
    const { data, error } = await supabase
      .from('vault_nutrition_logs')
      .select('calories, protein_g, carbs_g, fats_g')
      .eq('user_id', user.id)
      .eq('entry_date', today);

    if (error) throw error;

    return (data || []).reduce((acc, log) => ({
      calories: acc.calories + (log.calories || 0),
      protein: acc.protein + (log.protein_g || 0),
      carbs: acc.carbs + (log.carbs_g || 0),
      fats: acc.fats + (log.fats_g || 0),
      fiber: acc.fiber,
    }), { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 });
  },
  enabled: !!user,
});

// Remove dailyLogRefreshTrigger state and related logic
// Remove refreshTrigger prop from NutritionDailyLog usage
```

### 5. useMealVaultSync.ts

Add query invalidation after vault operations:

```typescript
// Add import
import { useQueryClient } from '@tanstack/react-query';

// Inside hook
const queryClient = useQueryClient();

// At end of syncMealToVault (after successful insert):
if (!error) {
  queryClient.invalidateQueries({ queryKey: ['nutritionLogs'] });
  queryClient.invalidateQueries({ queryKey: ['macroProgress'] });
}

return { success: true };
```

---

## Query Key Strategy

| Query Key | Used By | Purpose |
|-----------|---------|---------|
| `['nutritionLogs', dateStr, userId]` | NutritionDailyLog | Meal list for specific date |
| `['macroProgress', dateStr, userId]` | NutritionHubContent | Day's macro totals |

Invalidating the parent key (e.g., `['nutritionLogs']`) will invalidate all child queries.

---

## Expected Behavior After Implementation

1. **Log meal from Game Plan** → Nutrition Hub's MacroTargetDisplay and DailyLog update instantly
2. **Log meal from Nutrition Hub** → Game Plan's nutrition status updates
3. **Delete meal in Daily Log** → Macro totals recalculate automatically
4. **Edit existing meal** → All displays reflect changes immediately
5. **No manual navigation needed** → React Query handles all synchronization

---

## Cleanup

Remove deprecated patterns:
- `dailyLogRefreshTrigger` state in NutritionHubContent
- `refreshTrigger` prop from NutritionDailyLog
- Manual `fetchConsumed()` calls
- Manual `fetchMeals()` calls

This aligns with the "Full Loop Integration Philosophy" where every module feeds data bidirectionally.
