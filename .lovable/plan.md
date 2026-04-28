I found the likely cause of the repeat failure: when a custom activity has not yet been added/logged for today, multiple fast checklist clicks can run multiple “create today log” paths at the same time. The database only allows one log for the same user/activity/date/instance, so the second rapid click can hit the add/create error. That failed save then lets refresh/realtime data override the optimistic UI, making items appear to uncheck.

Plan:

1. Make custom activity log creation concurrency-safe
   - Add a per-template/day “ensure log exists” queue in `useCustomActivities.ts`.
   - If several checklist clicks happen before the first log is created, they will all wait on the same creation request instead of trying to insert duplicate logs.
   - Treat duplicate-insert conflicts as recoverable by re-reading and returning the existing log instead of surfacing `customActivity.addError`.

2. Preserve the user’s checklist state while the first log is being created
   - When a new log is created from a checklist click, include the already-merged `performance_data.checkboxStates` in that initial insert whenever available.
   - After the real log ID is known, continue saving through the existing per-log serialized write queue.
   - This prevents the first server row from briefly existing with empty checkbox state and causing a snap-back.

3. Stop background refresh from regressing checklist state
   - Avoid immediate blocking refreshes inside the high-frequency checkbox save path where they can race with queued writes.
   - Keep optimistic local state authoritative until the queued save reconciles.
   - Keep the user’s most recent checked/unchecked choice unless they click it again.

4. Apply the same race-proofing to calendar checklist flow
   - `useCalendarActivityDetail.ts` has its own get/create/update path for checklist toggles.
   - Update it to use a safe upsert/re-read pattern and preserve merged checkbox states during rapid taps.

5. Harden folder-assigned checklist items too
   - Folder item checklist saves use a similar select-then-insert pattern against `folder_item_completions`.
   - Update that path to avoid duplicate insert races and merge checkbox state per key.

6. Verify the behavior
   - Test opening a custom activity checklist that is not yet logged today.
   - Rapidly check multiple items back-to-back.
   - Confirm there is no “custom activity add” error and no checked item unchecks itself unless clicked again.
   - Also verify unchecking still works intentionally and “check all / complete” still behaves correctly.