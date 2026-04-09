

# Six Targeted Fixes — Optimistic Updates, State Unification, Weighted Scoring, and Memoized Insights

## Fix 1: Optimistic update BEFORE async in GamePlanCard

**Problem**: `updateOptimisticActivity` is already called before `await updateTemplate` (line 1973), but `updateTemplate` internally does its own `setTemplates` patch (line 279-281) and `fetchTemplates()` (line 293) — creating a race. The real issue is lack of rollback.

**Fix in `src/components/GamePlanCard.tsx`**: Confirmed the call order is correct (optimistic first, then await). No change needed here — the ordering is already right.

## Fix 2: Rollback logic on failure in GamePlanCard

**Problem**: On failure (line 1982), the code calls `refreshCustomActivities()` which is async and slow. There's no snapshot to restore to.

**Fix in `src/components/GamePlanCard.tsx`**: Capture `previousActivities` snapshot before the optimistic patch. On failure, call `updateOptimisticActivity` with the original template data to instantly revert, then background-refresh.

```
const previousTemplate = customActivities.find(a => a.template.id === editingTemplate.id)?.template;
updateOptimisticActivity(editingTemplate.id, data);
const result = await updateTemplate(editingTemplate.id, data);
if (!result && previousTemplate) {
  updateOptimisticActivity(editingTemplate.id, previousTemplate); // instant rollback
}
```

## Fix 3: BroadcastChannel listener for `custom-activity-updated`

**Problem**: `useCustomActivities` emits `custom-activity-updated` on the broadcast channel, but `useUnifiedDataSync` only listens for `{ type: 'invalidate' }` messages. The `custom-activity-updated` message type is ignored.

**Fix in `src/hooks/useUnifiedDataSync.ts`**: Add a handler in the `bc.onmessage` callback for `custom-activity-updated` that invalidates `['customActivities']` and `['gamePlan']` query keys. This ensures other tabs pick up edits.

## Fix 4: Eliminate dual state between useGamePlan and useCustomActivities

**Problem**: `useGamePlan` has its own `customActivities` state (via `setCustomActivities`) and `useCustomActivities` has `templates` state. Both fetch from the same `custom_activity_templates` table independently.

**Fix**: Make `useGamePlan.refreshCustomActivities` the authoritative refresh, and have `useCustomActivities.updateTemplate` emit a broadcast event that `useGamePlan` reacts to. Additionally, after `updateTemplate` succeeds in `useCustomActivities`, skip the internal `fetchTemplates()` call and instead broadcast, letting `useGamePlan` (the consumer in GamePlanCard) handle the refresh. In `useCustomActivities`, update only local `templates` state optimistically — the GamePlan side is handled by `updateOptimisticActivity`.

Specifically:
- In `useCustomActivities.updateTemplate`: remove the trailing `fetchTemplates()` call (line 293). The optimistic `setTemplates` patch (line 279) + broadcast is sufficient.
- In `useGamePlan`: add a `useEffect` listener on a shared BroadcastChannel that calls `refreshCustomActivities()` when it receives `custom-activity-updated`.

## Fix 5: Weighted `computePerformanceScore`

**Problem**: Current implementation is a simple average of all composite values. Metrics like `competitive_execution` and `bqi` should carry more weight than supplementary metrics.

**Fix**: Create `src/hooks/useSessionInsights.ts` (combines with Fix 6) containing a weighted scoring function:

```typescript
const METRIC_WEIGHTS: Record<string, number> = {
  bqi: 1.5,
  pei: 1.5,
  fqi: 1.5,
  competitive_execution: 1.4,
  decision: 1.3,
  barrel_pct: 1.0,
  chase_pct: 1.0,
  // all others default to 1.0
};

function computeWeightedScore(composites) {
  let weightedSum = 0, totalWeight = 0;
  for (const [key, value] of Object.entries(composites)) {
    const w = METRIC_WEIGHTS[key] ?? 1.0;
    weightedSum += value * w;
    totalWeight += w;
  }
  return Math.round(weightedSum / totalWeight);
}
```

## Fix 6: Extract insights into memoized `useSessionInsights` hook

**Problem**: `PracticeSessionDetailDialog` computes `generateInsights()` and `computePerformanceScore()` inline on every render.

**Fix**: Create `src/hooks/useSessionInsights.ts`:
- Accepts `session` object
- Returns `{ insights, perfScore }` via `useMemo`
- Contains the weighted `computePerformanceScore` from Fix 5
- `PracticeSessionDetailDialog` imports and uses this hook instead of inline computation

## Files Summary

| File | Fix # | Action |
|------|-------|--------|
| `src/components/GamePlanCard.tsx` | 2 | Add snapshot + rollback on updateTemplate failure |
| `src/hooks/useUnifiedDataSync.ts` | 3 | Handle `custom-activity-updated` broadcast messages |
| `src/hooks/useCustomActivities.ts` | 4 | Remove trailing `fetchTemplates()` after optimistic patch |
| `src/hooks/useGamePlan.ts` | 4 | Add BroadcastChannel listener for `custom-activity-updated` → `refreshCustomActivities()` |
| `src/hooks/useSessionInsights.ts` | 5, 6 | New — memoized hook with weighted scoring + insights |
| `src/components/PracticeSessionDetailDialog.tsx` | 6 | Replace inline computation with `useSessionInsights(session)` |

