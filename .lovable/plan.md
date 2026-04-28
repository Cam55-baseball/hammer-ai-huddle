## Problem

When a custom activity is marked completed (either by checking every checklist item — which now auto-promotes — or by pressing **Complete Activity**), two things must happen on the Game Plan:

1. The row must **visually show as completed** (strike-through title, dimmed text, green check icon) — same treatment any other completed task gets.
2. Position behavior depends on sort mode:
   - **Auto** — completed items move to the bottom of their section (current behavior, keep).
   - **Manual** — the activity stays where the user placed it.
   - **Timeline** — the activity stays where the user placed it.

Today: Manual already preserves position. Auto already moves to bottom. **Timeline incorrectly re-sorts completed tasks to the bottom** in two handlers (`handleCustomActivityToggle` and `handleNNGateSatisfied` in `GamePlanCard.tsx`) — that violates the rule.

The strike-through itself is already keyed on `task.completed`, which `useGamePlan` correctly derives from `completion_state === 'completed' || completed`. So once `refetch()` lands after the auto-promote write, the row repaints as completed. The only remaining gap is timeline re-sorting.

## Fix

### 1. `src/components/GamePlanCard.tsx`

**`handleCustomActivityToggle`** (line ~703): when `sortMode === 'timeline'`, update the task's `completed` field in `timelineTasks` **in place** — do **not** call `sortTimelineByCompletion` and do **not** rewrite `gameplan-timeline-order` in localStorage. The user's chosen order must survive completion.

**`handleNNGateSatisfied`** (line ~726): same fix — drop the `sortTimelineByCompletion` call and the `localStorage.setItem('gameplan-timeline-order', ...)` write. Just flip `completed: true` in place inside `timelineTasks`.

Manual mode already preserves position (no re-sort code path on toggle).
Auto mode keeps using `autoSort ? sortByCompletion(...) : ...` at lines 1003-1006 — unchanged.

### 2. Strike-through verification (no code change required)

`useGamePlan.ts` line 1578 already sets `completed: (activity.log?.completion_state === 'completed') || activity.log?.completed`, so an `auto_check_all` promotion (which writes both fields) flips `task.completed` to `true` on the next render. The existing JSX at `GamePlanCard.tsx` lines 1228 (`line-through`), 1303/1309/1315/1336 (dimmed text), and 1436 (`bg-green-500` check) already react to `task.completed`. Nothing else to change.

If the user reports the strike-through is not appearing immediately after auto-completion, the cause is the local optimistic state in the dialog updating `selectedCustomTask` only — the parent list waits for `refetch()` to reflect the new `completion_state`. We can add a second optimistic patch into `tasks`/section arrays if the lag is noticeable, but the existing `refetch()` call already runs in the same handler and should resolve within ~400 ms.

## Behavior summary

| Sort mode | Complete via "Complete Activity" or auto-check-all | Uncomplete (reopen) |
|---|---|---|
| Auto | Strikes through; moves to bottom of section | Moves back into incomplete group |
| Manual | Strikes through; stays in place | Stays in place |
| Timeline | Strikes through; stays in place | Stays in place |

## Files touched

- `src/components/GamePlanCard.tsx` — two small edits inside `handleCustomActivityToggle` and `handleNNGateSatisfied` to stop re-sorting in timeline mode.
