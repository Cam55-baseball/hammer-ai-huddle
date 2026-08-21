# Players Club: video-only, with a clean home for everything else

## The problem

Players Club was built as the athlete's video vault, but it currently also loads
practice sessions and legacy games and renders them as cards in the same grid.
The result is a cluttered feed that mixes video with records that have no video
attached, and no good place to browse "what happened on this date".

## The rule going forward

Players Club holds **videos only**. Anything without a video lives in its native
home, and every date is browsable from the Calendar.

## What changes

### 1. Players Club becomes a pure video vault
- Remove the practice and game card types and the source filter (`all / video / practice / game`).
- Keep and sharpen what belongs: search, sport and module filters, grid/list toggle,
  annotated + shared-with-scouts badges, download, edit, share, delete.
- Add a small "Looking for practices, games or reports? Open History" link so nothing
  feels lost.
- Videos attached to a practice or game keep a chip linking back to that record.

### 2. A new History page (`/history`) — clutterless, collapsed by default
One page, grouped into collapsible sections that all start closed and show only a
heading plus a count:
- **Practice sessions** — date, module, session type, grade, drill count
- **Games** — opponent, date, result, links to the Game Hub entry
- **Game reports** — saved report snapshots, view / print / share link
- **Recaps & progress reports** — monthly / 6-week recaps
- **Analysis without video** — any analysis record with no clip

Each section: newest first, date-range and text search, lazy loaded only when the
section is opened, and a row click opens the existing detail dialog or the record's
native page. Nothing is duplicated into a new table — this reads the existing data.

### 3. Calendar date lookup shows the full day
- The day sheet gains a **"What happened"** block listing every record dated that
  day: sessions, games, reports, recaps, logged videos — each linking to its home.
- Add a date search/jump control on the Calendar so an athlete can type or pick a
  date and land straight on that day's record list.

### 4. Backend trim
`get-player-library` stops returning practices and games; it returns videos only.
The History page queries the practice, game, and report tables directly under the
athlete's existing row-level rules (and the same coach/scout view rules Players Club
uses when viewing another player).

## Technical notes

- `src/pages/PlayersClub.tsx`: delete `PracticeSession` / `GameSession` types,
  `renderPracticeCard`, `renderGameCard`, the source filter, and the practice/game
  dialogs; simplify `allItems` to the video list.
- New `src/pages/History.tsx` + `src/components/history/*` section components using
  the existing `Accordion` primitive; route added in `src/App.tsx` and a sidebar
  entry in `src/components/AppSidebar.tsx` next to Players Club.
- Data sources: `performance_sessions` (practices), `gp_games`, `gp_reports`,
  `monthly_reports`, videos without clips. Each section owns its own query hook so
  closed sections cost nothing.
- `src/components/calendar/CalendarDaySheet.tsx`: add a "What happened" section fed
  by a new `useDayRecords(date)` hook that unions the same sources by date.
  `src/components/calendar/CalendarView.tsx`: add the date jump control.
- `supabase/functions/get-player-library/index.ts`: drop the practices and games
  queries and their response keys.
- No schema changes. No data deleted — records simply render in their proper place.
