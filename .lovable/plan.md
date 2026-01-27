
## What’s happening (why you’re seeing “Scheduled off” items still in the main list)

From the current code, the app correctly detects that “Complete Morning Check-In” (`quiz-morning`) and “Complete Pre-Workout Check-In” (`quiz-prelift`) are scheduled off for Monday (they’re in `calendar_skipped_items` and the UI even labels them “Scheduled off”).

However, on the Dashboard Game Plan, there is one view mode where “Scheduled off” tasks are not filtered out of the *main* list:

- In **Timeline mode**, the main task list only filters out **manually skipped** tasks, but it **does not filter out “scheduled off” (weekly skipped)** tasks.
- At the same time, the “Skipped for today” section *does* include weekly-skipped tasks.
- Result: the same task appears in both places (main list + “Skipped for today”), which matches exactly what you’re reporting.

This is an end-to-end UI logic mismatch inside `src/components/GamePlanCard.tsx`.

---

## Goal

On Monday (or any day):
- If a task is “Scheduled off” via weekly repeat settings, it must **not** appear in the **main actionable** Game Plan list in any sort mode (Auto / Manual / Timeline).
- It can still appear under **“Skipped for today”** with the “Scheduled off” label so the user can hit the pencil icon to edit the schedule back on (this keeps the ability to re-enable a task).

---

## Scope of changes (files)

1) `src/components/GamePlanCard.tsx`
- Fix Timeline mode filtering to exclude weekly-skipped items from the main list.
- Ensure timeline reorder logic doesn’t accidentally “lose” hidden (scheduled-off) tasks.
- Ensure any “save schedule / lock schedule” actions based on timeline tasks use the same “visible today” list (so scheduled-off tasks aren’t locked/saved as if active today).

No backend/schema changes required.

---

## Implementation steps (code-level)

### Step 1 — Centralize “hidden today” logic in GamePlanCard
In `GamePlanCard.tsx`, create a single helper predicate for “should not show in the main list today”:

- hidden if:
  - manually skipped today (`skippedTasks.has(task.id)`), OR
  - weekly scheduled off (`isWeeklySkipped(task)`)

This reduces the chance of future view modes drifting out of sync.

### Step 2 — Fix Timeline mode main list filtering
Currently Timeline mode renders:

- `timelineTasks.filter(t => !skippedTasks.has(t.id))`

Update Timeline mode to instead use:

- `timelineVisibleTasks = timelineTasks.filter(t => !skippedTasks.has(t.id) && !isWeeklySkipped(t))`

Then render the `Reorder.Group` values and list using `timelineVisibleTasks`.

This ensures “Scheduled off” tasks never appear in the main list in Timeline mode.

### Step 3 — Keep “Scheduled off” tasks available in the “Skipped for today” section
Do not remove weekly-skipped tasks from `skippedTasksList`. That section is where “Scheduled off” belongs (with the pencil icon).

This maintains:
- Visibility that it’s scheduled off
- A direct edit path to re-enable it

### Step 4 — Make Timeline reorder work even when some tasks are hidden
Important: If Timeline mode only renders `timelineVisibleTasks`, the drag reorder callback will only reorder visible tasks.

We must update `handleReorderTimeline(newVisibleOrder)` so it:
- Reorders only the visible tasks within the full `timelineTasks` array,
- While keeping hidden tasks (scheduled off / manually skipped) in the underlying `timelineTasks` state so they can reappear automatically when schedules change.

Implementation approach:
- Build a queue from `newVisibleOrder`
- Iterate the existing `timelineTasks` in order:
  - if a task is visible, replace it with the next from the queue
  - if a task is hidden, keep it in place
- Save the merged order back into `timelineTasks`
- Persist localStorage order from the merged list (or persist only visible IDs + keep hidden stable; simplest is merged list IDs)

This prevents:
- “Scheduled off” tasks from disappearing permanently from timeline state
- Ordering corruption when toggling schedule settings

### Step 5 — Ensure Timeline-based “Lock Schedule” / “Save Template” uses visible-today tasks
There are multiple places in `GamePlanCard.tsx` that build schedules from `timelineTasks` directly (locking, templates, etc.).

Update those to use the same filtered list used for Timeline display (i.e., exclude weekly-skipped and manually-skipped for today), so that “scheduled off” tasks are not treated as part of today’s active schedule.

Specifically update any place that does something like:
- `timelineTasks.map(...)`

to use:
- `timelineVisibleTasks.map(...)`

Key places to update:
- Lock order saving (schedule build)
- Template save (schedule build)
- Any other timeline-only schedule serialization

This is the “E2E” part: not just hiding in UI, but also preventing scheduled-off tasks from being “baked into” today’s saved schedule artifacts.

---

## Testing checklist (to confirm it’s fixed)

On **Monday**:

1) Ensure `quiz-morning` is scheduled off for Monday (already is in your DB based on the data).
2) Go to `/dashboard`.
3) Switch sort mode to **Timeline** (if not already).
4) Confirm:
   - “Complete Morning Check-In” and “Complete Pre-Workout Check-In” do **not** appear in the main list.
   - They appear only under “Skipped for today” with the “Scheduled off” label.
5) Edit one scheduled-off task from the skipped section (pencil), re-enable Monday, save:
   - It should immediately move from “Skipped for today” back into the main list (Timeline view) without refresh.
6) Confirm lock/template actions don’t include scheduled-off tasks:
   - With a task scheduled off, lock today’s schedule and verify it does not reinsert that task as active.

---

## Expected result after fix

- No more duplication (“Scheduled off” tasks showing as actionable).
- Consistent behavior across Auto, Manual, and Timeline modes.
- Scheduled-off tasks remain discoverable/editable under “Skipped for today” only.
