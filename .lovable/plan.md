## Plan: stop Calendar import from kicking users to login

### Goal
Users must be able to open Calendar, click **Import schedule**, choose **Paste text**, type/paste schedule text, analyze it, and review/save events without being sent to `/auth`.

### What I will change
1. **Make auth eviction impossible while editing the importer**
   - Add a small app-wide "user is actively editing" signal for focused inputs/textareas, including the schedule paste box.
   - Teach `AuthContext` and `useRequireAuth` to treat that signal as a hard block against redirecting to login.

2. **Stop Calendar from unmounting during transient auth/network blips**
   - Change `Calendar.tsx` so once Calendar has had a valid user in the current mount, a temporary `user === null` does not replace the page with the loading/auth path.
   - Keep the importer dialog mounted and preserve typed text through backend/realtime reconnect noise.

3. **Harden the schedule importer itself**
   - Mark the paste textarea and review edit fields as protected editing surfaces.
   - Snapshot the current session before calling Hammer AI; if the auth context blips during analysis, do not close the dialog or redirect.
   - Keep clear error text if the AI function fails, instead of leaving the user spinning.

4. **Expand regression coverage**
   - Update `tests/e2e/calendar/run.mjs` with a new scenario specifically for **Import schedule → Paste text → slow typing/paste → Analyze**.
   - Assert the URL never becomes `/auth`, the textarea keeps its content, and the user remains on Calendar even during synthetic auth/network blips.

5. **Deliver verification report**
   - Update `.lovable/phase-57-calendar-stability.md` with the new root cause, fix, and regression scenario.

### Technical notes
- The prior fix only checked `document.activeElement` at one moment. The current bug can still happen when the dialog remounts, focus shifts, or the auth context temporarily reports no user before the active element check catches typing.
- The fix will move from "check focus once" to "maintain an explicit protected-editing state," which is safer for paste boxes, dialogs, mobile keyboards, and analysis requests.