## Game Plan toolbar restoration

The user's three issues all live in `src/components/GamePlanCard.tsx` (header toolbar, lines ~1596–1750):

1. **Lock system "gone"** — The Lock dropdown only renders when `sortMode === 'timeline'` (line 1660: `{sortMode === 'timeline' && (...)}`). Users in Auto or Manual mode never see it, so it appears removed. It must be visible in **all** modes.

2. **Auto/Timeline/Manual rotation broken** — The toggle is rendered as a single ghost button that calls `cycleSortMode` (lines 1649–1657). `cycleSortMode` (line 674) early-returns with an error toast whenever `todayLocked` is true — so anyone with a locked day is stuck on whatever mode they were in. Plus, a single button labeled only with the current mode is not discoverable as a rotator.

3. **Push Day is obsolete** — A push/skip/rest day bar already sits above the Game Plan (the day-control row above `TodayCommandBar`/`GamePlanCard`). The in-card "Push Day / Undo Push" button (lines 1626–1647) duplicates that and should be removed.

### Changes — `src/components/GamePlanCard.tsx`

**A. Always show the Lock control**
- Remove the `{sortMode === 'timeline' && (...)}` wrapper around the Lock Popover (line 1660).
- The Lock dropdown, its `Popover`/`PopoverContent`, and all its handlers (`handleLockCurrentOrder`, `handleOpenUnlockDialog`, `handleUnlockSave`, `handleLockDays`, `unlockDate`, etc.) stay exactly as they are.
- The lock applies to the **day**, not the view mode, so it should never have been gated by `sortMode`.

**B. Replace the single sort-mode button with a 3-segment toggle**
- Replace lines 1649–1657 with a compact segmented control showing all three modes side-by-side: `Auto | Timeline | Manual`.
- Use existing icons: `ArrowUpDown` (Auto), `Clock` (Timeline), `GripVertical` (Manual). Active segment uses `bg-primary text-primary-foreground`; inactive uses `text-white/70 hover:text-white`. Built with three small `<Button>`s in a `flex` row with rounded container — no new dependency needed (the existing `ToggleGroup` primitive is fine if cleaner, but plain buttons match the rest of the toolbar).
- Each segment calls `setSortMode('auto' | 'timeline' | 'manual')` directly and writes to `localStorage('gameplan-sort-mode')`.
- **Remove the `todayLocked` block** from `cycleSortMode`. Switching the **view** of tasks must never be blocked by a day lock; the lock prevents reordering/editing, not viewing. The existing `todayLocked` checks on the reorder handlers (`handleReorderCheckin`, etc.) and on `Reorder.Item drag={!todayLocked}` already enforce that correctly.
- Delete the now-unused `cycleSortMode` function (or keep as a no-op shim if referenced elsewhere — quick grep first).

**C. Remove the redundant Push Day button**
- Delete lines 1626–1647 (the entire Push Day / Undo Push `<Button>` block).
- Remove `pushDayDialogOpen` / `setPushDayDialogOpen` state, `dayPushed` / `setDayPushed` state.
- Remove the `<GamePlanPushDayDialog>` mount and its import (`line 34`).
- Audit the `useRescheduleEngine` destructure (line 112) — keep `undoLastAction`, `skipDay`, etc. only if still referenced after the Push removal. Skip Day stays untouched.

### Resulting toolbar (right side of header, mobile-first)

```text
[ Schedule Practice ]  [ Skip Day ]  [ Auto | Timeline | Manual ]  [ 🔒 Lock ]
```

All four controls visible in every mode. Push Day removed.

### Out of scope

- No DB or schema changes.
- `useGamePlanLock`, `useRescheduleEngine`, `useCalendarDayOrders`, and `TodayCommandBar` untouched.
- No changes to scout/coach Game Plan cards.
- `GamePlanPushDayDialog.tsx` left on disk; not deleted (safe cleanup for a follow-up after confirming no other consumers).
