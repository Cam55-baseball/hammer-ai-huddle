# Item 2 — Allowed skips and session removals

## What changes
- In the player’s Week calendar, coaches and authorized organization admins can select a current or upcoming day and act on a whole card or one activity.
- **Allow skip** leaves the activity available. The player sees “Coach Jordan allowed skipping this today — your choice” and **Skip (allowed)**. Permission alone never marks work done.
- **Remove for this session** makes the selected work unavailable for that dated session, retaining “Removed by Coach Jordan for today” and an optional reason. Previously logged results remain intact; other dates remain unchanged.
- Chosen allowed skips and mandatory removals are exempt from Discipline requirements, without claiming performed reps or measurements. Completing the remaining required work still completes the day.
- Player Week and Sent workouts show the decision, player response, coach name, date/time, exact target and reason.

## Safety and access
- Reuse existing linked-coach/assigned-organization training access and canonical saved-day identities. Recheck access and the exact saved target on every write.
- Keep the existing Okay / Cancel warning flow and under-18 reason requirements where applicable; Cancel writes nothing.
- Removing a safety prerequisite must not leave dependent work runnable. Apply existing dependency judges; refuse an unsafe isolated removal rather than bypassing the rule or inventing substitute work.
- Do not modify generation floors, workload limits, prescriptions on another date, or historical performed logs.

## Technical approach
- Add a backward-compatible dated decision/audit path alongside existing coach prescriptions, using the existing athlete/date lock for atomic target validation, decision and player-response writes.
- Resolve whole-card targets to exact saved activity identities, including laterality and selected sport; never authorize an action by display name alone.
- Project exemptions through the canonical task/prescription completion and Discipline readers, not a second score or counter. Keep removed work as an annotated historical record while excluding its active logging controls.
- Reuse shared decision projections across player cards, Week calendar and Sent workouts; make read/save failures visible and invalidate affected saved-day views after confirmed writes.

## Verification
- Targeted network-blocked tests: permissions, exact dated scope, card/activity selection, laterality, optional permission versus chosen skip, full-day completion without exempt work, unchanged next day, preserved logs, safety prerequisites and Cancel/no-write behavior.
- Check database load before each browser proof. Use one session at a time: coach action → affected TEST player readback, optional skip/save/refresh, mandatory removal/save/refresh, then calendar/Sent-workouts readback.
- Capture one player screenshot for the allowed-skip note and one for removed work. Check the automatic preview result. No live suites, sub-agents, proof documents, publishing, cron or iOS changes.