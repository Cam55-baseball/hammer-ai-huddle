## Goal
On the Hammer schedule strip, the "Add game" button currently navigates to `/calendar`. Change it so it opens the `SeasonScheduleImporterDialog` in place — identical behavior to the "Season dates" button right next to it.

## Change
**File:** `src/components/hammer/HammerScheduleStrip.tsx`

- Remove the `navigate("/calendar")` handler on the "Add game" button.
- Reuse the existing `importerOpen` state (already wired for "Season dates") so "Add game" also calls `setImporterOpen(true)`.
- Drop the now-unused `useNavigate` import if nothing else in the file uses it.

No other files change. The importer dialog itself, its paste/photo flow, auth-stable typing guard, and persistence (`useImportScheduleEvents`) already work end-to-end and are unaffected.

## Verification
- Tap "Add game" on the dashboard schedule strip → `SeasonScheduleImporterDialog` opens (no route change).
- Paste text or upload a photo → analyze → import succeeds, calendar reflects new games.
- "Season dates" still opens the same dialog (unchanged).
- "Tell Hammer what changed" still opens `TellHammerDialog` (unchanged).
