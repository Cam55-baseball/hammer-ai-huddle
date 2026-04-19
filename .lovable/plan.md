

## Plan — Schedule Baserunning IQ Sessions (Player + Coach)

### Background
The scheduling system (`scheduled_practice_sessions` table + `useSchedulingService`) already supports:
- Per-player solo scheduling (`scheduleSession`)
- Coach-assigned sessions to multiple players (`scheduleBulkSessions`)
- All session modules via the `session_module` text field
- A polished `SchedulePracticeDialog` UI with module/type/date/time/recurring controls

Baserunning IQ (`/baserunning-iq`) currently has zero scheduling integration.

### Approach
Two minimal additions — one shared option upgrade, one new dedicated coach-aware dialog launched from the Baserunning IQ page.

### Changes

**1. Add "Baserunning IQ" module option** — `src/components/practice/SchedulePracticeDialog.tsx`
Add to the `MODULES` array:
```ts
{ value: 'baserunning_iq', label: 'Baserunning IQ' }
```
This immediately makes Baserunning IQ schedulable from Game Plan, Practice Hub, and Calendar (where `SchedulePracticeDialog` already mounts).

**2. New coach/player dialog on the Baserunning IQ page** — `src/components/baserunning-iq/ScheduleBaserunningIQDialog.tsx` (new)
Dedicated entry that auto-locks `session_module='baserunning_iq'` and adds an **assignment target picker** (Self / Linked Player / Team / Organization) for coaches.

UI flow:
- "Schedule" button rendered in the Baserunning IQ header next to the page title.
- Opens a dialog with:
  - **Assign to:** segmented control — `Myself`, `Player(s)`, `Team` (only `Player(s)`/`Team` shown if user has linked players via `useCoachPlayerPool` OR is org coach).
  - **Player picker** (multi-select) when "Player(s)" chosen — uses `useCoachPlayerPool` (already exists, merges linked + roster).
  - **Lesson focus** dropdown — optional, lists lessons from `useBaserunningProgress` (so coach can pin "Stealing 2nd Read" etc.); stored in `description`.
  - **Session type:** `solo_work` (player) / `team_session` (team) auto-derived from target.
  - **Date / Start time / End time**.
  - **Recurring weekly + day picker** (reuse same UX as `SchedulePracticeDialog`).

Submit logic:
- `Myself` → `schedulingService.scheduleSession({ session_module: 'baserunning_iq', ... })`
- `Player(s)` → `schedulingService.scheduleBulkSessions(playerIds, { session_module: 'baserunning_iq', ... }, 'coach')`
- `Team` → single session with `assignment_scope: 'team'`, `organization_id` from `usePlayerOrganization`

**3. Mount the button** — `src/pages/BaserunningIQ.tsx`
Add `<ScheduleBaserunningIQDialog />` inside the header `<div className="flex items-center justify-center gap-2">` block (line 49) so it sits alongside the title — visible in both first-time and returning-user states (move to a row above the title for clean layout).

**4. Surface scheduled sessions to the player**
The existing `PlayerScheduledSessions` component already lists every scheduled session for the user regardless of module — it will automatically show coach-assigned Baserunning IQ sessions. No change needed there. We add it to the Baserunning IQ page (above lessons list) so players see "You have an assigned Baserunning IQ session today" without leaving the module.

### Out of scope
- No DB migration — `session_module` is free-text, no enum constraint.
- No new RLS — existing policies on `scheduled_practice_sessions` already cover coach→player assignment.
- No notifications/emails — those follow the existing practice-session pattern (none currently fire on assign).
- No deep-link "Start lesson now" from the scheduled card — phase 2.

### Files
- **New:** `src/components/baserunning-iq/ScheduleBaserunningIQDialog.tsx`
- **Modified:** `src/components/practice/SchedulePracticeDialog.tsx` (add module option)
- **Modified:** `src/pages/BaserunningIQ.tsx` (mount dialog button + `PlayerScheduledSessions` filtered to baserunning_iq if desired)

### Verification
1. Player on `/baserunning-iq` taps **Schedule** → picks date/time → session appears in their Game Plan & Calendar on that date with title "Baserunning IQ Solo Work".
2. Coach (with linked players) on `/baserunning-iq` taps **Schedule** → "Assign to Player(s)" → selects 2 players → submits → both players see the session in their Game Plan; coach sees it in their Coach Sessions list.
3. Recurring weekly Mon/Wed Baserunning IQ session repeats every week as expected.
4. Existing Practice Hub `SchedulePracticeDialog` now also lists "Baserunning IQ" as a selectable module.

