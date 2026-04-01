
Root cause

- The unresolved failure is a client-side state/lifecycle bug in the Calendar custom-activity edit flow.
- Exact failure point:
  - `src/components/calendar/CalendarDaySheet.tsx` opens the builder from `handleEditFromDetail()`
  - that handler calls `closeDetailDialog()`
  - `src/hooks/useCalendarActivityDetail.ts` clears `selectedTask` inside `closeDetailDialog()`
  - but the builder is rendered only when `selectedTask?.customActivityData?.template` exists
- Result: the template state is destroyed before the builder can mount, so users are dropped back to the underlying screen and experience it as being “kicked out”.

What this is and is not

- State management: Yes, this is the root cause.
- Routing/navigation: Not a router redirect; it only looks like one because the modal state collapses.
- Memory leak/component crash: No evidence.
- Permission/auth handling: Not the primary issue in this path.
- Backend function issue: No evidence; this failing path does not depend on a backend function before the exit happens.

Evidence from current code/logs

- The failing path is visible directly in code:
  - `CalendarDaySheet.tsx` edit handoff
  - `useCalendarActivityDetail.ts` clearing `selectedTask`
  - builder render guarded by `selectedTask`
- Current console snapshot does not show a Custom Activity Builder exception.
- Current logs mainly show unrelated warnings:
  - missing service worker `sw.js` 404
  - missing dialog description warnings
  - role debug logs
- The latest network snapshot does not show custom activity save requests tied to this failure, which supports that the exit happens before save/network execution.

Why this was not resolved earlier

- Earlier fixes targeted auth/session drift, role loading, coach access, and scheduling sync.
- Those were separate issues and would not fix this one because this bug happens locally in the UI before any backend call.
- This is a silent state teardown, not a thrown crash, so it is easy to miss unless this exact calendar edit path is reviewed.

Permanent fix

1. Decouple builder state from detail-dialog state in `src/components/calendar/CalendarDaySheet.tsx`
   - add dedicated `editingTemplate` state
   - optionally add `editingTemplateId` for save/delete stability

2. Change the edit flow
   - when user taps Edit, snapshot the template into `editingTemplate`
   - open the builder from that stable snapshot
   - only then close the detail dialog

3. Render the builder from stable edit state
   - stop rendering it from `selectedTask`
   - render it from `editingTemplate`

4. Save/delete against stable edit state
   - use `editingTemplate.id` instead of `selectedTask.customActivityData.template.id`
   - clear `editingTemplate` only when the builder actually closes

5. Keep detail state and edit state fully separate
   - `closeDetailDialog()` should only manage detail state
   - the builder must never depend on state that another dialog clears

6. Add hardening
   - guard edit open if no template snapshot exists
   - keep refresh after save so Calendar/Game Plan stay synced
   - optionally add lightweight builder open/close logs and proper `DialogDescription` to reduce console noise

Files

- `src/components/calendar/CalendarDaySheet.tsx` — core permanent fix
- `src/hooks/useCalendarActivityDetail.ts` — only if a small API cleanup is needed
- `src/components/CustomActivityDetailDialog.tsx` — optional UX hardening only

Safeguards to prevent future forced exits

- Audit every Custom Activity Builder entry point and enforce the same rule:
  - builder must always be controlled by its own stable create/edit state
  - never by transient selection state owned by another dialog
- The calendar flow is the known offender; Templates/Game Plan/Folders already follow the safer pattern more closely.

Verification after implementation

- Desktop and mobile:
  1. My Custom Activities → Create New → Save / Cancel
  2. My Custom Activities → Edit Existing → Save / Cancel
  3. Dashboard/Game Plan → open custom activity detail → Edit → Save
  4. Calendar → open day sheet → open custom activity detail → Edit → Save / Cancel
  5. Received activity → Accept → Customize → Save
  6. Folder item → Create / Edit
- Confirm:
  - no forced exit
  - no route jump
  - builder stays mounted until user closes it
  - save requests actually fire
  - edited data persists and refreshes correctly

Technical details

- No database migration is needed.
- No backend-function permission rewrite is needed for this issue.
- The exact unresolved problem is a modal-state ownership bug, not a backend/auth crash.
