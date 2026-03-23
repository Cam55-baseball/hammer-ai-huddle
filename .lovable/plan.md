

# Add Undo Button for Skip Day and Push Day

## Current State
- **Skip Day** (GamePlanCard line 1285): Skips all incomplete tasks individually via `handleSkipTask`, shows a plain success toast with no undo option.
- **Push Day** (GamePlanPushDayDialog): Already shows an undo toast via `showUndoToast`, but the undo engine in `useRescheduleEngine` overwrites the snapshot on each call — since Push Day calls `skipDay()` then `pushForwardOneDay()` sequentially, only the push snapshot survives, losing the skip data.

## Changes

### 1. GamePlanCard.tsx — Add undo toast to Skip Day button
Replace the Skip Day `onClick` handler (lines 1288-1293) to:
- Collect all skipped task IDs
- Perform the bulk skip
- Show a toast with an **Undo** action button (15s duration)
- On undo, call `handleRestoreTask` for each skipped task ID to restore the day

### 2. useRescheduleEngine.ts — Fix snapshot stacking
The `skipDay` + `pushForwardOneDay` sequence overwrites `lastAction.current`. Fix by making the snapshot **compound** — when `pushForwardOneDay` runs after a `skipDay`, merge both into one snapshot so undo reverses both the push and the skip in a single action.

### 3. GamePlanPushDayDialog.tsx — No structural changes needed
The existing `showUndoToast` pattern already works. Once the engine properly stacks snapshots, undo will restore both the push and the skipped tasks.

## Files

| File | Change |
|------|--------|
| `src/components/GamePlanCard.tsx` | Add undo action to Skip Day toast |
| `src/hooks/useRescheduleEngine.ts` | Stack skip + push snapshots into compound undo |

