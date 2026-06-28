
## Problem

1. **Toolbar overflow** — The header in `src/components/calendar/CalendarView.tsx` puts `SchedulePracticeDialog`, `Import schedule`, and `Add Event` in a non-wrapping `flex` row next to the title. At ~885px the row can't shrink and `Add Event` clips out of the card.
2. **Analyze spinner never resolves** — When pasting text and clicking *Analyze with Hammer AI*, the spinner runs forever. The `parse-season-schedule` edge function was added one turn ago and may not be deployed yet, and the dialog has no client-side timeout, so any silent invoke failure (not deployed, gateway hang, missing key) leaves `parsing=true` indefinitely with no toast.

## Fix

### 1. Make the toolbar wrap cleanly (`src/components/calendar/CalendarView.tsx`)
- Change the outer header row to allow the title block to shrink and the actions to wrap to a new line on narrow widths.
  - Add `min-w-0 flex-1` to the title block.
  - Change the actions container to `flex flex-wrap items-center justify-end gap-2` so all three buttons stay inside the card and wrap below the title if needed.
  - Add `shrink-0` and `whitespace-nowrap` on each button so labels aren't clipped.
- No visual restyle — same buttons, same order, just contained.

### 2. Make the importer actually return (or fail loudly)
- **Deploy** `parse-season-schedule` so the freshly added function is live.
- **Harden** `src/components/hammer/SeasonScheduleImporterDialog.tsx`:
  - Wrap the `supabase.functions.invoke` call in a 45-second client `AbortController` race; on timeout, toast "Hammer AI didn't respond — please try again" and clear `parsing`.
  - Surface `data?.error` from non-2xx gateway responses (right now `error` from invoke is thrown but a 200-with-error body would still be treated as empty).
  - Log the failure path to the console with the request mode so we can diagnose if it happens again.
- **Verify** by calling the deployed function directly with a short text payload and confirming a JSON `{ events: [...] }` response.

### Out of scope
- No changes to event coloring, calendar grid, or import persistence — those are working from the prior turn.
- No queue/background-worker refactor; Gemini-flash on a small text payload completes well under the edge timeout, so a synchronous call with a client timeout is sufficient.

## Files touched
- `src/components/calendar/CalendarView.tsx` — header layout only
- `src/components/hammer/SeasonScheduleImporterDialog.tsx` — abort/timeout + error surfacing
- Deploy: `parse-season-schedule`
