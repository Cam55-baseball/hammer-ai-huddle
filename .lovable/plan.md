

# Scheduling Coach Links, Approval Workflow, and Fielding Taxonomy Restructure

## Part A: Player-Coach Linking on Scheduled Sessions + Approval Workflow

### Problem
Currently, players can schedule sessions and optionally select a connected coach (via CoachSelector), but there's no approval workflow. Coaches can schedule for players (via CoachScheduleDialog), but sessions land directly as `scheduled` — no accept/reject. Neither side gets notifications about pending sessions.

### Solution

**Database**: Add a `requires_approval` boolean and expand the `status` column to support `pending_approval` / `accepted` / `rejected` states on `scheduled_practice_sessions`.

**Player scheduling** (`SchedulePracticeDialog.tsx`): Already has CoachSelector. When a coach is linked, the session is created normally. No change needed here — the player is scheduling for themselves.

**Coach scheduling** (`CoachScheduleDialog.tsx`): When a coach schedules for players, set `status = 'pending_approval'` instead of `'scheduled'`. This triggers the approval workflow.

**New component** `PendingSessionApprovals.tsx`: Modeled after `PendingCoachActivitiesSection.tsx`. Shows pending coach-scheduled sessions with Accept/Reject buttons. Placed in Practice Hub and Game Plan. Accepting changes status to `scheduled`; rejecting changes to `rejected`.

**Notification badge**: Add a pending count badge to the Practice Hub nav and Game Plan cards so users know sessions await action.

**Game Plan integration**: Add a card/section showing pending session approvals on the player's Game Plan dashboard.

## Part B: Fielding Taxonomy Restructure (Practice Hub)

### Changes to `PlayDirectionSelector.tsx` (Play Type)
- **Remove** `slow_roller` and `chopper` from `playTypeOptions`
- **Add** `clean_pick` to `playTypeOptions` (moved from Rep Type)

### Changes to `AdvancedRepFields.tsx` and `RepScorer.tsx` (Batted Ball Type)
- **Add** `slow_roller` and `chopper` to batted ball type options (alongside ground, line, fly, barrel)

### Changes to `InfieldRepTypeFields.tsx` (Rep Type)
- **Remove** `double_play` (single generic option) and `clean_pick`
- **Add** specific double play variants:
  - `dp_flip` — DP Flip
  - `dp_throw` — DP Throw
  - `dp_turn_2b` — DP Turn at 2B
  - `dp_unassisted_2b` — Unassisted DP at 2B
  - `dp_unassisted_1b` — Unassisted DP at 1B
  - `dp_unassisted_3b` — Unassisted DP at 3B
  - `dp_turn_3b` — DP Turn at 3B

### Edge function update
- Add `slow_roller` and `chopper` to `VALID_BATTED_BALL_TYPES` in `calculate-session/index.ts`

## Files Changed

| File | Change |
|------|--------|
| DB migration | Add `requires_approval` column to `scheduled_practice_sessions` |
| `src/hooks/useScheduledPracticeSessions.ts` | Add `fetchPendingSessions()`, `acceptSession()`, `rejectSession()` methods |
| `src/components/coach/CoachScheduleDialog.tsx` | Set status to `pending_approval` on create |
| `src/components/practice/PendingSessionApprovals.tsx` | **New** — Accept/Reject UI for coach-assigned sessions |
| `src/pages/PracticeHub.tsx` | Add PendingSessionApprovals above scheduled sessions |
| `src/pages/GamePlan.tsx` | Add pending sessions card |
| `src/components/practice/PlayDirectionSelector.tsx` | Remove slow_roller/chopper, add clean_pick |
| `src/components/practice/InfieldRepTypeFields.tsx` | Replace double_play + clean_pick with 7 specific DP variants + backhand |
| `src/components/practice/AdvancedRepFields.tsx` | Add slow_roller/chopper to batted ball type |
| `src/components/practice/RepScorer.tsx` | Add slow_roller/chopper to batted ball type |
| `supabase/functions/calculate-session/index.ts` | Add slow_roller/chopper to valid batted ball types |

