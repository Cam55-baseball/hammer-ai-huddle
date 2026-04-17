

## Plan — Always-Enabled "Complete Activity" Button

### Change

In `src/components/CustomActivityDetailDialog.tsx`:

1. **Remove `disabled={checkedCount === 0}`** from the "Complete Activity" button — always clickable.
2. **Change click handler** to always perform a "check all" completion:
   - Mark every checkable item as `true` in `checkboxStates`
   - Set `completion_state = 'completed'`, `completion_method = 'check_all'`
   - Persist + close dialog

This means clicking "Complete Activity" will:
- ✅ Auto-check every item in the activity
- ✅ Mark the activity as completed on the Game Plan
- ✅ Work whether the user has checked 0, some, or all items

### Backend safety

This satisfies all existing trigger invariants:
- `check_all` method requires `all_checked()` → we set every box to `true` first
- `completed_at` auto-set by trigger
- No DB schema changes

### Files

| File | Change |
|------|--------|
| `src/components/CustomActivityDetailDialog.tsx` | Remove disabled state; rewrite click to always check-all then complete |

### Out of scope

- "Done" button behavior — unchanged
- Per-item checkbox interaction — unchanged
- Triggers, hooks, other dialogs — unchanged

