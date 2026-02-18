
# Fix: All Nutrition Entry Points → Elite E2E Sync

## What's Broken (Full Audit)

Five specific issues have been identified across the sync chain:

### Issue 1 — UTC Date Bug in useVault.ts (Critical)
Line 246 of `useVault.ts`:
```
const today = new Date().toISOString().split('T')[0]; // UTC date
```
After 7:00 PM Eastern (midnight UTC), meals logged from The Vault are saved under **tomorrow's** UTC date. The Nutrition Hub queries today's **local** date, so the entry never appears. Every other logging path already uses `format(new Date(), 'yyyy-MM-dd')`.

### Issue 2 — No React Query Invalidation After Vault Save/Delete (Critical)
`saveNutritionLog` and `deleteNutritionLog` in `useVault.ts` call `fetchNutritionLogs()` (a local state setter for The Vault's own display), but they never call `queryClient.invalidateQueries`. The Nutrition Hub's `nutritionLogs` and `macroProgress` queries are never told that data changed — so the Nutrition Hub stays stale until a full page refresh. `useQueryClient` isn't even imported in this file.

### Issue 3 — meal_time Is Saved But Never Displayed (UX Gap)
The `meal_time` field was added to the database and is being saved correctly. However:
- `NutritionDailyLog.tsx` maps query results to `MealLogData` but doesn't include `mealTime` in the mapped object
- `MealLogCard.tsx` only shows `loggedAt` (the saved-at timestamp), never `meal_time` (when they actually ate)
- The `MealLogData` interface has no `mealTime` field

Users fill in "Meal Time" but it silently disappears — it never shows on their meal cards.

### Issue 4 — digestion_notes Is Saved But Never Displayed (UX Gap)
Same pattern as above: `digestion_notes` is saved to the database but `NutritionDailyLog` never fetches or maps it, and `MealLogCard` has no UI to display it.

### Issue 5 — DIGESTION_TAGS Defined 3 Times (Code Duplication)
`DIGESTION_TAGS` and `toggleDigestionTag` are copy-pasted identically in `VaultNutritionLogCard.tsx`, `QuickNutritionLogDialog.tsx`, and `MealLoggingDialog.tsx`. Same for `convertMealTime`. This creates drift risk when tags need updating.

---

## Fix Plan

### File 1: `src/hooks/useVault.ts`

**Change 1** — Add `useQueryClient` import from `@tanstack/react-query`

**Change 2** — Fix the UTC date bug on line 246:
```ts
// BEFORE (UTC - wrong)
const today = new Date().toISOString().split('T')[0];

// AFTER (local timezone - correct)
const today = format(new Date(), 'yyyy-MM-dd');
```

**Change 3** — In `saveNutritionLog` (after success), add query invalidation:
```ts
if (!error) {
  await updateStreak();
  await fetchNutritionLogs();
  queryClient.invalidateQueries({ queryKey: ['nutritionLogs'] });
  queryClient.invalidateQueries({ queryKey: ['macroProgress'] });
}
```

**Change 4** — In `deleteNutritionLog` (after success), add query invalidation:
```ts
if (!error) {
  await fetchNutritionLogs();
  queryClient.invalidateQueries({ queryKey: ['nutritionLogs'] });
  queryClient.invalidateQueries({ queryKey: ['macroProgress'] });
}
```

---

### File 2: `src/components/nutrition-hub/MealLogCard.tsx`

**Change 1** — Add `mealTime` and `digestionNotes` to the `MealLogData` interface:
```ts
export interface MealLogData {
  // ...existing fields
  mealTime?: string | null;       // "7:30 AM"
  digestionNotes?: string | null; // "Felt great, Energized"
}
```

**Change 2** — Display `mealTime` (when set) instead of/alongside `loggedAt`:
Currently shows: `{format(new Date(meal.loggedAt), 'h:mm a')}` — the save time  
After fix: Show `meal_time` if present (e.g., "Eaten at 7:30 AM"), fall back to logged-at time. This makes the time field the user filled out actually visible.

**Change 3** — Display `digestionNotes` in the collapsible expanded section, shown as tag chips when the value matches a known tag, or as plain italic text for free-form entries.

---

### File 3: `src/components/nutrition-hub/NutritionDailyLog.tsx`

**Change 1** — Map `meal_time` and `digestion_notes` from the database query result into the `MealLogData` object:
```ts
return (data || []).map(log => ({
  // ...existing fields
  mealTime: log.meal_time,
  digestionNotes: log.digestion_notes,
})) as MealLogData[];
```
Without this, the new fields are fetched but thrown away before they reach the card component.

---

### File 4 (Optional Cleanup): Extract Shared Constants

Create `src/constants/nutritionLogging.ts` to export:
- `DIGESTION_TAGS` array (currently duplicated in 3 files)
- `convertMealTime(time24: string): string` utility (currently duplicated in 3 files)

Then import from this single source in all three logging components. This is a code quality improvement that eliminates drift risk.

---

## Summary of All Files Changed

| File | Change Type | Impact |
|---|---|---|
| `src/hooks/useVault.ts` | Bug fix (UTC date + RQ invalidation) | Vault entries now appear in Nutrition Hub immediately |
| `src/components/nutrition-hub/MealLogCard.tsx` | Feature (display meal_time + digestion_notes) | Users can see what they entered |
| `src/components/nutrition-hub/NutritionDailyLog.tsx` | Bug fix (map new fields from DB) | Passes meal_time/digestion_notes to card |
| `src/constants/nutritionLogging.ts` | Refactor (extract shared constants) | Eliminates 3x duplication |

No database migrations needed — the `meal_time` column already exists from the previous migration.

---

## Technical Notes

- `useQueryClient` is already imported and used in `VaultNutritionLogCard.tsx` — so the pattern exists in the codebase. `useVault.ts` just needs to adopt it.
- The Nutrition Hub's `macroProgress` query key is `['macroProgress', today, user?.id]` — invalidating at the key prefix `['macroProgress']` will correctly match all variants.
- `meal_time` stored values look like `"7:30 AM"` — already formatted, no conversion needed for display. Just render the string directly.
- Digestion notes in the card should parse comma-separated tags and render them as small inline badges, matching the visual language of the quick-tap tags used during entry.
