

# Final Stability Fixes — 5 Targeted Patches

## Fix 1: BroadcastChannel source tagging to prevent same-tab double refresh

**Problem**: `useCustomActivities` broadcasts `custom-activity-updated` without a `source` field (line 288). `useGamePlan` listens (line 874) but doesn't filter by source — so the same tab that just did the optimistic update also triggers `refreshCustomActivities()`, causing a redundant fetch.

**Fix**:
- In `useCustomActivities.ts`: Add a module-level `TAB_ID = crypto.randomUUID()` and include `source: TAB_ID` in the broadcast message.
- In `useGamePlan.ts` (line 870-880): Add a module-level `TAB_ID` and skip messages where `event.data.source === TAB_ID`.
- In `useUnifiedDataSync.ts` (line 294): Already filters by `source` for `invalidate` messages but NOT for `custom-activity-updated`. Add `source` check there too.

## Fix 2: Delayed background refresh after successful update

**Problem**: After optimistic update + DB write, there's no safety net to guarantee UI matches DB if the optimistic patch was slightly off (e.g., server-side defaults).

**Fix in `useCustomActivities.ts`**: After successful update (line 283, after toast), add:
```typescript
setTimeout(() => fetchTemplates(), 400);
```
This 400ms delayed refresh silently corrects any drift without blocking UX.

**Fix in `GamePlanCard.tsx`**: After successful `updateTemplate` (line 1978-1979), add:
```typescript
setTimeout(() => refreshCustomActivities(), 400);
```

## Fix 3: Confirm single source of truth

**Current state**: `useCustomActivities` has `templates` state (line 23), `useGamePlan` has `customActivities` state (line 102). Both fetch from `custom_activity_templates` independently. This IS dual state.

**Fix**: Full unification into React Query would be ideal but is a large refactor. Pragmatic fix: In `useGamePlan`, the `customActivities` state is the **display** source for GamePlanCard (it merges templates with today's logs). In `useCustomActivities`, `templates` is the **management** source for TemplatesGrid. They serve different consumers. The real issue is sync — which Fix 1 + Fix 2 solve. Add a comment in both hooks documenting this relationship.

## Fix 4: `isUpdating` guard to prevent overlapping optimistic updates

**Problem**: Rapid double-clicks on save could fire two concurrent `updateTemplate` calls, each doing optimistic patches that collide.

**Fix in `GamePlanCard.tsx`**: Add `isUpdatingRef = useRef(false)` guard around the edit save handler:
```typescript
const isUpdatingRef = useRef(false);
// In onSave:
if (isUpdatingRef.current) return;
isUpdatingRef.current = true;
try {
  // ... existing optimistic + update logic
} finally {
  isUpdatingRef.current = false;
}
```

## Fix 5: Dynamic performance score weights by session module

**Problem**: Weights are static — `bqi` gets 1.5x regardless of whether the session is hitting, pitching, or defense.

**Fix in `useSessionInsights.ts`**: Replace static `METRIC_WEIGHTS` with a function:
```typescript
const MODULE_WEIGHTS: Record<string, Record<string, number>> = {
  hitting: { bqi: 1.5, pei: 1.5, competitive_execution: 1.4, decision: 1.3 },
  pitching: { fqi: 1.5, pei: 1.5, competitive_execution: 1.4, command: 1.3 },
  defense: { fqi: 1.5, decision: 1.4, competitive_execution: 1.3 },
};

function getWeights(module: string) {
  return MODULE_WEIGHTS[module] ?? MODULE_WEIGHTS.hitting;
}
```
Pass `sessionModule` into `computeWeightedScore`.

## Files Summary

| File | Fix # | Change |
|------|-------|--------|
| `src/hooks/useCustomActivities.ts` | 1, 2 | Add TAB_ID to broadcast source; add 400ms delayed fetchTemplates |
| `src/hooks/useGamePlan.ts` | 1, 2, 3 | Filter broadcast by source; add delayed refreshCustomActivities; add state docs |
| `src/hooks/useUnifiedDataSync.ts` | 1 | Add source check for `custom-activity-updated` messages |
| `src/components/GamePlanCard.tsx` | 2, 4 | Add delayed refresh; add isUpdatingRef guard |
| `src/hooks/useSessionInsights.ts` | 5 | Dynamic weights by session module |

