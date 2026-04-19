

## Plan — Allow unlimited Quick Adds per day

### Problem
Tapping a favorite in the Quick Add drawer a second time on the same day is a silent no-op. Root cause:

1. **DB**: `custom_activity_logs` has a unique constraint `(user_id, template_id, entry_date)`.
2. **Code**: `addToToday()` in `useCustomActivities.ts` uses `upsert` with `onConflict: 'user_id,template_id,entry_date'`, so the second tap updates the same row instead of creating a new one.

The user wants every Quick Add tap to produce a brand-new, independently completable card on the Game Plan.

### Fix

**1. Database migration**
- Drop the unique constraint `custom_activity_logs_user_id_template_id_entry_date_key`.
- Add a new column `instance_index INTEGER NOT NULL DEFAULT 0`.
- Add a new partial unique constraint `(user_id, template_id, entry_date, instance_index)` so each Quick Add gets its own row (index 0 = the scheduled occurrence, 1+ = additional Quick Adds).
- Backfill existing rows with `instance_index = 0` (default).

**2. `src/hooks/useCustomActivities.ts` — `addToToday()`**
- Replace the `upsert` with: query `MAX(instance_index)` for `(user, template, today)`, then `INSERT` with `instance_index = max + 1` if at least one row already exists, else `0`.
- Keep optimistic-update + retry pattern.

**3. `src/hooks/useCustomActivities.ts` — toggle/reopen/remove helpers (lines 109, 401, 494, 716)**
- These currently use `todayLogs.find(l => l.template_id === templateId)` to locate the single log. Change them to operate on a specific `logId` instead, so each instance toggles/reopens/removes independently.
- Update call sites to pass the `logId` (the log row already exists in scope wherever cards are rendered, since the Game Plan iterates per-log).

**4. Game Plan rendering (`useGamePlan.ts` + `GamePlanCard.tsx`)**
- Where today's custom-activity cards are produced, iterate over **all** logs for each template (not just the first match). Each log becomes its own task with a stable id like `${templateId}:${logId}` so React keys stay unique.
- Card label: append `#2`, `#3`, etc. when `instance_index > 0` so users can distinguish the duplicates.

### Out of scope
- No change to recurring/scheduled occurrences — they still produce one base instance (index 0) per day.
- No change to Calendar projection (already keyed by log id where applicable).
- No change to the template-level "favorited" or schedule logic.

### Verification
1. On `/dashboard`, tap Quick Add → pick "Stretching" → it appears on Game Plan.
2. Tap Quick Add → pick "Stretching" again → a SECOND "Stretching #2" card appears (toast confirms add).
3. Repeat 5×: 5 independent cards, each with its own checkbox / completion state.
4. Completing card #2 does NOT complete card #1.
5. Removing card #3 leaves cards #1, #2, #4, #5 intact.
6. Existing scheduled recurring activities still appear once per day as before.

