## Bug

Checking off items in a custom-activity checklist sometimes silently unchecks an item the user just checked. Reproduces most easily when checking two items in quick succession or when an item is checked while a previous save is still in flight.

## Root cause

Every checkbox toggle goes through a parent handler that:

1. Reads `selectedCustomTask.customActivityData.log.performance_data` from a **stale closure** (not from the latest state).
2. Computes `newCheckboxStates = { ...currentCheckboxStates, [fieldId]: checked }`.
3. Calls `setSelectedCustomTask(prev => …)` (functional, OK) — but the `newPerformanceData` object it merges in was computed from the stale closure.
4. Writes that **stale-derived** `newPerformanceData` to the DB via `updateLogPerformanceData(log.id, newPerformanceData)`. This is a full-object overwrite of `performance_data.checkboxStates`.
5. `updateLogPerformanceData` then awaits `fetchTodayLogs()`, which refreshes `todayLogs` (independent of `selectedCustomTask`).

When the user clicks a second checkbox before the first click's render commits, the second handler's closure still sees the pre-first-click state. It computes `{B: true}` (without A), writes that to DB, and React's last-write-wins on `selectedCustomTask` plus the DB update both end up showing only B. From the user's perspective, A "unchecked itself."

The same bug exists in three sibling handlers:

- `src/components/GamePlanCard.tsx` line 2421 — main custom-activity dialog open from the Game Plan.
- `src/components/GamePlanCard.tsx` line 2931 — folder-item logger (custom-activity dialog inside a folder).
- `src/components/GamePlanCard.tsx` line 3109 — second folder-item logger render path.
- `src/hooks/useCalendarActivityDetail.ts` line 302 — calendar day-sheet detail dialog.

The dialog itself (`src/components/CustomActivityDetailDialog.tsx`) renders `<Checkbox checked={getCheckboxState(fieldId)} />` directly off the `task` prop, so any momentary regression in the parent state is immediately visible as a flipped checkbox.

There is also no serialization between concurrent writes — overlapping `await updateLogPerformanceData` calls race each other in the network.

## Fix

Two layers of defense.

### Layer 1 — Authoritative client-side merge (fixes the data-loss bug)

In each of the four handlers, replace the stale-closure read with a functional updater that derives `newCheckboxStates` from the latest state, then writes that **same** merged object to the DB.

Pattern (applied per call site):

```ts
onToggleCheckbox={async (fieldId, checked) => {
  if (!selectedCustomTask?.customActivityData) return;

  // Capture the merged state inside the functional updater so we always
  // operate on the latest checkboxStates, even when clicks are queued.
  let mergedPerformanceData: Record<string, any> | null = null;
  let logIdAtCommit: string | undefined;

  setSelectedCustomTask(prev => {
    if (!prev?.customActivityData) return prev;
    const prevLog = prev.customActivityData.log;
    const prevPd = (prevLog?.performance_data as Record<string, any>) || {};
    const prevStates = (prevPd.checkboxStates as Record<string, boolean>) || {};
    const nextStates = { ...prevStates, [fieldId]: checked };
    const nextPd = { ...prevPd, checkboxStates: nextStates };

    mergedPerformanceData = nextPd;
    logIdAtCommit = prevLog?.id;

    return {
      ...prev,
      customActivityData: {
        ...prev.customActivityData,
        log: prevLog
          ? { ...prevLog, performance_data: nextPd }
          : { id: 'pending', template_id: prev.customActivityData.template.id, completed: false, performance_data: nextPd } as any,
      },
    };
  });

  // Ensure log exists, then persist using the merged object captured above.
  let log = selectedCustomTask.customActivityData.log;
  if (!log) {
    log = await ensureLogExists(selectedCustomTask.customActivityData.template.id);
    if (!log) { toast.error(t('customActivity.addError')); return; }
  }
  if (!mergedPerformanceData) return;
  await updateLogPerformanceData(log.id, mergedPerformanceData);

  // Existing DEMOTE-rule block stays as-is.
}}
```

Apply the equivalent change to:

- `GamePlanCard.tsx` line 2421 block (uses `updateLogPerformanceData`).
- `GamePlanCard.tsx` line 2931 block (uses `saveFolderCheckboxState`).
- `GamePlanCard.tsx` line 3109 block (uses `saveFolderCheckboxState`).
- `useCalendarActivityDetail.ts` `handleToggleCheckbox` (line 302) — same idea but `selectedTask` lives in `useState` inside the hook; use the functional `setSelectedTask(prev => …)` form, capture `nextPerformanceData` in the closure, then run the DB write with that captured object instead of the closure-derived `newPerformanceData`.

### Layer 2 — Per-field write serialization (defense in depth)

Wrap each toggle handler (or `updateLogPerformanceData`) in a small per-log write queue so two updates to the same log are awaited sequentially, never in parallel. Implementation: a `Map<logId, Promise<void>>` ref in `useCustomActivities` and `useCalendarActivityDetail`. New writes chain off the previous promise:

```ts
const writeChain = useRef<Map<string, Promise<void>>>(new Map());
const enqueueWrite = (logId: string, fn: () => Promise<void>) => {
  const prev = writeChain.current.get(logId) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(fn);
  writeChain.current.set(logId, next);
  return next;
};
```

`updateLogPerformanceData(logId, pd)` becomes `enqueueWrite(logId, () => doActualUpdate(logId, pd))`. This guarantees that even if two clicks each compute `mergedPerformanceData` from slightly different snapshots, the second write always sees the result of the first via `fetchTodayLogs()` between them and computes its own merge correctly when the next user click fires.

Add the same queue to `saveFolderCheckboxState` in `useGamePlan.ts` (or wherever it's defined) — search confirms it's the folder equivalent and currently has no serialization either.

### Layer 3 — Dialog-side optimistic shadow (UX safety net)

Inside `src/components/CustomActivityDetailDialog.tsx`, mirror the existing `localFieldValues` pattern for checkboxes:

- Add `const [localCheckboxStates, setLocalCheckboxStates] = useState<Record<string, boolean>>({});`.
- `getCheckboxState(fieldId)` first checks `localCheckboxStates`, then falls back to the prop.
- `handleToggleCheckbox` sets the local state synchronously, then calls `onToggleCheckbox`. Local state is cleared on dialog close (same as `localFieldValues`).

Result: the checkbox UI is driven by the user's most recent click and cannot be visually overridden by any in-flight parent update. The parent state and DB still converge in the background.

## Files to change

- `src/components/GamePlanCard.tsx` — three `onToggleCheckbox` blocks (lines ~2421, ~2931, ~3109).
- `src/hooks/useCustomActivities.ts` — wrap `updateLogPerformanceData` in the per-log write queue.
- `src/hooks/useGamePlan.ts` — wrap `saveFolderCheckboxState` in the same per-item write queue.
- `src/hooks/useCalendarActivityDetail.ts` — refactor `handleToggleCheckbox` to use the functional-updater + captured-merge pattern.
- `src/components/CustomActivityDetailDialog.tsx` — add `localCheckboxStates` shadow state and update `getCheckboxState` + `handleToggleCheckbox` to read/write through it; clear it on dialog close alongside `localFieldValues`.

## Verification

After the fix:

1. Open a custom activity with 5+ checklist items and rapidly tap them in any order. Every box stays checked. Reload the page — the same set is still checked.
2. Open the same activity in two tabs. Check items in tab A; tab B updates via realtime without ever flipping back a checked item.
3. Toggle the same item on/off rapidly — the final visible state always matches the user's last click and the DB row.
4. Console contains no `[useCustomActivities] Error updating performance data` warnings during the test.

## Out of scope

- No DB schema changes. No edge function changes.
- No change to the "Mark all complete" / DEMOTE behaviour — kept as-is since it operates on the merged state we now compute correctly.
- No change to text/number field debouncing — that path already uses `localFieldValues`.
