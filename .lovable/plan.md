## Goal
Stop the Import-schedule paste flow from kicking you to login, and make every auth/session blip visible while it happens.

## Changes

### 1. Paste-specific focus guard (`SeasonScheduleImporterDialog.tsx`)
- Wrap the paste-mode textarea + its container in a hardened "paste guard":
  - `onFocus`, `onInput`, `onChange`, `onKeyDown`, `onPaste`, `onCompositionStart/Update/End` each refresh `noteProtectedEditing(60_000)`.
  - On focus, start a 1-second heartbeat interval that keeps re-arming the protected window until blur. Cleared on blur/unmount/dialog close.
  - Mark the textarea, its wrapping `<div>`, and the dialog content with `data-protected-editing="true"` so the active-element fallback in `protectedEditing.ts` matches even mid-React-rerender.
- Same treatment for the review-step inline `<Input>` edit fields (title/location/date), since they share the eviction risk.

### 2. Visible session telemetry during paste/import
- Add a tiny logger `src/lib/auth/authTelemetry.ts` that:
  - Logs `[paste-import]` events to `console.info` with a stable tag + payload (`{ phase, hasSession, userId, expiresAt, protectedActive }`).
  - Optionally surfaces a `toast.error` / `toast.warning` for adverse transitions (no session, expiring <60s, signed-out event during import).
- In `SeasonScheduleImporterDialog.tsx`:
  - On dialog open, on textarea focus, on Analyze click, on Analyze success/failure, and on Save: call the logger with current `supabase.auth.getSession()` snapshot.
  - Subscribe to `supabase.auth.onAuthStateChange` for the lifetime of the dialog. Log every event; if `SIGNED_OUT` or session=null arrives while the dialog is open, fire a visible `toast.error("Session blip detected during import — kept your text safe")` and re-arm the protected window instead of letting the dialog close.
  - Before calling the Edge Function, snapshot the access token; if `getSession()` returns null at that moment, show `toast.error("No active session — please sign in again")` and abort gracefully (no redirect from inside the dialog).

### 3. No changes to auth eviction rules
- `useRequireAuth` / `AuthContext` already honor `isProtectedEditingActive()`. The heartbeat + data-attribute changes above guarantee that signal stays true throughout paste/typing/analysis, so no global auth changes are needed.

### 4. Verification
- Manual: open Calendar → Import schedule → Paste text, type slowly, paste a large block, click Analyze. Confirm: no `/auth` redirect, textarea content preserved, console shows `[paste-import]` lifecycle, and any synthetic auth blip surfaces a toast instead of an eviction.
- Extend `tests/e2e/calendar/run.mjs` S5 to also assert (a) `[paste-import]` log lines are emitted and (b) a forced `SIGNED_OUT` event during paste produces a toast and does NOT navigate away.

## Files touched
- `src/components/hammer/SeasonScheduleImporterDialog.tsx` — paste guard wiring, auth listener, toasts, logging hooks.
- `src/lib/auth/authTelemetry.ts` *(new)* — small logger + toast helper for paste-import phase events.
- `tests/e2e/calendar/run.mjs` — extend S5 with telemetry + forced-signout assertions.
- `.lovable/phase-57-calendar-stability.md` — append "Paste-specific guard + telemetry" subsection.
