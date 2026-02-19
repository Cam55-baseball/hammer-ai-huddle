
# Fix: Vault Goals Sync with Nutrition Hub + Midnight Reset

## Two Issues to Fix

### Issue 1 — Vault Goals Show Wrong Numbers (2,000 instead of 2,246)

**Root Cause:** There are two completely separate goal systems:

- **Nutrition Hub** uses `useTDEE` → `useDailyNutritionTargets` → TDEE-calculated goals derived from biometrics (weight, height, DOB, sex, activity level) + the athlete's active body goal (lose fat / maintain / gain muscle). This correctly shows 2,246 cal.

- **Vault Nutrition Log** uses `vault_nutrition_goals` — a manually-editable table with a hardcoded `DEFAULT_GOALS` of 2,000 cal. This is entirely disconnected from the TDEE engine.

The `VaultNutritionLogCard` receives `goals: VaultNutritionGoals | null` from `useVault`, which either loads from the manual table or falls back to the 2,000/150/250/70 defaults. It has zero awareness of the TDEE calculation.

**Fix:** The Vault's `VaultNutritionLogCard` should use `useTDEE` directly (the same hook the Nutrition Hub uses) as its primary source of truth for goal numbers. The `vault_nutrition_goals` table row will be used as a **manual override fallback** only — if the user has explicitly set custom goals in the Vault's "Set Goals" dialog. This preserves the manual goals feature while making the default goals match the Nutrition Hub automatically.

Concretely:
- In `VaultNutritionLogCard.tsx`, call `useTDEE()` to get `nutritionTargets`
- Derive effective goals: if `nutritionTargets` exists (profile complete), map TDEE targets → goal format. If `goals` prop (manual override from `vault_nutrition_goals`) exists, those take precedence
- The progress bars and goal numbers will now read from TDEE automatically — matching the Nutrition Hub

The `VaultNutritionGoals` manual table and the "Set Goals" dialog are **kept intact** — they become optional overrides for athletes who want custom numbers instead of TDEE-calculated ones.

### Issue 2 — Vault Logs Don't Clear at Midnight

**Root Cause:** `useVault.ts` computes `today = format(new Date(), 'yyyy-MM-dd')` once at hook instantiation and caches it forever. If a user leaves the app open overnight and continues into the next day, `today` stays as yesterday's date. The nutrition logs fetched are still yesterday's, and new logs are written to yesterday's date.

The Game Plan already has a proven midnight-detection pattern: a `setInterval` that checks every 30 seconds if the date has changed, and if so, triggers a full re-fetch.

**Fix:** Add the same midnight-detection interval to `useVault.ts`. When the date rolls over, `fetchNutritionLogs()` re-fetches (now with the new `today`), which returns 0 results — making the log appear cleared. The `today` variable needs to be moved from a plain const to a `useRef` that gets updated when midnight fires.

---

## Files to Modify

### File 1: `src/components/vault/VaultNutritionLogCard.tsx`

**Change:** Import and use `useTDEE` to compute TDEE-derived goals. Merge them with the `goals` prop:

```
// Priority order:
// 1. Manual vault_nutrition_goals (if user has explicitly set them)
// 2. TDEE-calculated targets (from profile + active goal)
// 3. Hardcoded DEFAULT_GOALS (2000 cal etc.) — last resort only

const { nutritionTargets } = useTDEE();

const effectiveGoals: NutritionGoals = useMemo(() => {
  // Manual override always wins
  if (goals) return goals;
  
  // TDEE-derived goals
  if (nutritionTargets) {
    return {
      calorie_goal: nutritionTargets.dailyCalories,
      protein_goal: nutritionTargets.macros.protein,
      carbs_goal: nutritionTargets.macros.carbs,
      fats_goal: nutritionTargets.macros.fats,
      hydration_goal: 100, // from hydration settings
      supplement_goals: [],
    };
  }
  
  // Fallback
  return DEFAULT_GOALS;
}, [goals, nutritionTargets]);
```

`effectiveGoals` then replaces `currentGoals` everywhere in the component. The progress bars, goal editors, and all display logic use `effectiveGoals` going forward.

### File 2: `src/hooks/useVault.ts`

**Change 1 — Move `today` to a `useRef` so it can be updated at midnight:**

```ts
const todayRef = useRef(format(new Date(), 'yyyy-MM-dd'));
const today = todayRef.current;
```

**Change 2 — Add midnight-detection interval (matching Game Plan's pattern):**

```ts
useEffect(() => {
  const interval = setInterval(() => {
    const newDate = format(new Date(), 'yyyy-MM-dd');
    if (newDate !== todayRef.current) {
      todayRef.current = newDate;
      // Re-fetch today's nutrition logs (will be empty for new day)
      fetchNutritionLogs();
      fetchSupplementTracking();
      // Invalidate Nutrition Hub queries too
      queryClient.invalidateQueries({ queryKey: ['nutritionLogs'] });
      queryClient.invalidateQueries({ queryKey: ['macroProgress'] });
    }
  }, 30000); // check every 30 seconds
  return () => clearInterval(interval);
}, [fetchNutritionLogs, fetchSupplementTracking, queryClient]);
```

This mirrors the exact same pattern already used in `useGamePlan.ts`.

---

## Summary

| Issue | Root Cause | Fix |
|---|---|---|
| Vault shows 2,000 cal goal instead of 2,246 | `vault_nutrition_goals` table is disconnected from TDEE engine | `VaultNutritionLogCard` calls `useTDEE` directly; TDEE goals used unless user has manual override |
| Vault logs don't clear at midnight | `today` const never updates after hook mounts | Add 30-second interval in `useVault.ts` to detect date rollover and re-fetch |

No database migrations needed. No new tables. No breaking changes to the "Set Goals" dialog — manual goal overrides still work, they just take precedence over TDEE now instead of being the only option.
