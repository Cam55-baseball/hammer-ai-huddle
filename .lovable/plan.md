

# Fix Skip Day & Push Day Undo End-to-End

## Two Root Causes

### 1. Push Undo fails — separate hook instances
`GamePlanPushDayDialog` calls `useRescheduleEngine()` internally, creating its own `useRef` for the snapshot. When the user clicks "Undo Push" in `GamePlanCard`, it calls `undoLastAction()` on a different hook instance whose snapshot is empty — hence "Unable to undo."

**Fix**: Remove `useRescheduleEngine` from the dialog. Instead, pass the engine's functions as props from `GamePlanCard` so both share the same ref.

### 2. Skip Day RLS error — missing UPDATE policy
The `game_plan_skipped_tasks` table has INSERT, SELECT, and DELETE policies but no UPDATE policy. The `upsert` call tries UPDATE on conflict, which gets blocked by RLS (403 errors visible in console).

**Fix**: Add an UPDATE RLS policy on `game_plan_skipped_tasks` for authenticated users where `auth.uid() = user_id`.

## Changes

### A. Database migration
```sql
CREATE POLICY "Users can update own skips"
ON public.game_plan_skipped_tasks
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### B. GamePlanPushDayDialog.tsx
- Remove the internal `useRescheduleEngine()` call
- Accept `skipDay`, `pushForwardOneDay`, `pushToDate`, `replaceDay`, `undoLastAction` as props from parent

### C. GamePlanCard.tsx
- Pass the reschedule engine functions to `GamePlanPushDayDialog` as props
- This ensures the snapshot ref is shared, so "Undo Push" actually has data to revert

| File | Change |
|------|--------|
| Migration SQL | Add UPDATE RLS policy for `game_plan_skipped_tasks` |
| `src/components/game-plan/GamePlanPushDayDialog.tsx` | Accept engine functions as props instead of creating own instance |
| `src/components/GamePlanCard.tsx` | Pass engine functions to dialog |

