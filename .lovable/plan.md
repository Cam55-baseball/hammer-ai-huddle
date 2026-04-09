

# Final Stability Audit — 3 Issues Found, 3 Fixes

## Issue 1: `refreshCustomActivities()` fires from broadcast even on the same tab

`useCustomActivities` broadcasts with `CUSTOM_ACTIVITIES_TAB_ID`. `useGamePlan` filters with `GAME_PLAN_TAB_ID`. These are **different UUIDs** in the same tab — so the same-tab broadcast from `useCustomActivities` is NOT filtered by `useGamePlan`'s listener. Result: `refreshCustomActivities()` fires immediately from the broadcast AND again from the 400ms setTimeout in GamePlanCard.

**Fix**: Use a single shared `TAB_ID` across all hooks in the same tab. Create a tiny module `src/utils/tabId.ts`:
```typescript
export const TAB_ID = crypto.randomUUID();
```
Import this in `useCustomActivities.ts`, `useGamePlan.ts`, and `useUnifiedDataSync.ts` instead of generating separate IDs per hook.

## Issue 2: Triple refresh on a single edit

After one successful edit, the current flow triggers:
1. `useCustomActivities`: `setTimeout(fetchTemplates, 400)` — refetches templates
2. `useGamePlan` broadcast listener: `refreshCustomActivities()` — immediate refetch (because TAB_IDs differ)
3. `GamePlanCard`: `setTimeout(refreshCustomActivities, 400)` — another refetch

With Fix 1 (shared TAB_ID), item 2 is eliminated. But items 1 and 3 still both fire at 400ms.

**Fix**: Remove the `setTimeout(() => fetchTemplates(), 400)` from `useCustomActivities.updateTemplate` (line 296). The GamePlanCard already handles the delayed refresh via `refreshCustomActivities()`. The `useCustomActivities` hook's local `templates` state was already patched optimistically (line 282-284) — that's sufficient for the TemplatesGrid consumer.

## Issue 3: Dual state remains a drift risk under edge cases

`useCustomActivities.templates` and `useGamePlan.customActivities` are separate `useState` arrays. The optimistic patch in `useCustomActivities` (line 282) updates `templates`, while `updateOptimisticActivity` in `useGamePlan` updates `customActivities`. If one succeeds and the other is stale, they drift.

**Fix**: This is mitigated by Fix 1 + Fix 2 (single delayed refresh ensures both converge). Add a final safety: in `useCustomActivities.updateTemplate`, after the DB write succeeds, also call `refreshCustomActivities` (from GamePlan context) via the broadcast. With Fix 1's shared TAB_ID, the broadcast won't trigger on the same tab — so the GamePlanCard's `setTimeout(refreshCustomActivities, 400)` remains the sole delayed refresh. This is already the case after Fix 1+2. No additional code needed — just confirm the flow.

## Files Summary

| File | Change |
|------|--------|
| `src/utils/tabId.ts` | **New** — export single `TAB_ID = crypto.randomUUID()` |
| `src/hooks/useCustomActivities.ts` | Import shared `TAB_ID`; remove `setTimeout(fetchTemplates, 400)` (line 296); remove local `CUSTOM_ACTIVITIES_TAB_ID` |
| `src/hooks/useGamePlan.ts` | Import shared `TAB_ID`; remove local `GAME_PLAN_TAB_ID` |
| `src/hooks/useUnifiedDataSync.ts` | Import shared `TAB_ID`; remove local `tabIdRef` |

## Result After Fixes

A single edit triggers exactly:
1. Optimistic patch in both `useCustomActivities` (templates) and `useGamePlan` (customActivities) — instant
2. DB write — awaited
3. One `setTimeout(refreshCustomActivities, 400)` from GamePlanCard — confirms DB state
4. Broadcast to other tabs only (same-tab filtered by shared TAB_ID)

Zero redundant refreshes. Single source of confirmed persistence before any refresh.

