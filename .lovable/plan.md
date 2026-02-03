
# Fix Goal Sync Between Settings and Main Display

## Problem Analysis

When you change your goal to "Maintain" in the Nutrition Hub Settings dialog, the main page still shows "Gain Lean Muscle" because there are **two separate instances** of the `useTDEE()` hook:

1. **Settings Dialog** - Uses its own `useTDEE()` and calls `refetchTDEE()` after saving
2. **Main Page** - Uses a different instance of `useTDEE()` through `useDailyNutritionTargets()` which never gets refreshed

The `MacroTargetDisplay` component receives `targets.goalType` from `useDailyNutritionTargets()`, which internally calls `useTDEE()`. When the settings dialog updates the goal and calls its own `refetchTDEE()`, the main page's separate hook instance still has stale data.

---

## Solution

Trigger a refetch of the `useTDEE()` data in `NutritionHubContent` when `onGoalChanged` is called from the settings dialog. This ensures the `MacroTargetDisplay` receives the updated goal type.

---

## File to Update

| File | Changes |
|------|---------|
| `src/components/nutrition-hub/NutritionHubContent.tsx` | Update `onGoalChanged` callback to refetch TDEE data |

---

## Technical Implementation

### `src/components/nutrition-hub/NutritionHubContent.tsx`

**Current code (line 447):**
```typescript
<NutritionHubSettings
  open={settingsOpen}
  onOpenChange={setSettingsOpen}
  onGoalChanged={refetchTDEE}
  onEditProfile={() => setShowTDEESetup(true)}
/>
```

This is already correctly passing `refetchTDEE` - however, the issue is that the settings dialog is **also** calling its own `refetchTDEE` from its own `useTDEE()` instance. The parent's `refetchTDEE` should handle the refresh.

**The actual issue**: The settings dialog calls `refetchTDEE()` from its internal `useTDEE()` but that's a different instance. We need to ensure the `onGoalChanged` callback is properly awaited and the parent's data is refreshed.

**Fix: Wrap the callback to ensure proper refresh sequence:**

```typescript
// Create a handler that properly refreshes all data
const handleGoalChanged = useCallback(async () => {
  await refetchTDEE();
}, [refetchTDEE]);

// In the JSX:
<NutritionHubSettings
  open={settingsOpen}
  onOpenChange={setSettingsOpen}
  onGoalChanged={handleGoalChanged}
  onEditProfile={() => setShowTDEESetup(true)}
/>
```

---

## Expected Outcome

1. User opens Nutrition Hub Settings
2. User changes goal from "Gain Lean Muscle" to "Maintain"
3. User clicks "Update Goal"
4. The `onGoalChanged` callback triggers `refetchTDEE()` in the parent component
5. `MacroTargetDisplay` receives updated data showing "Maintain"
6. Both settings dialog and main page display the same goal
