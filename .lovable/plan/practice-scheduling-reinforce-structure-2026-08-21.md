# Practice Scheduling — Reinforce & Structure

## Short answer to your question

Yes — practices are accepted today, but the system is half-wired:

- The AI schedule importer already understands `practice`, `travel` and `other` rows and saves them.
- Practices already appear on the calendar (teal), including recurring weekly ones.
- **They do not modulate Hammers Today.** The daily plan generator looks for a column that does not exist on the practice table (`session_date` instead of `scheduled_date`), so "is this a practice day?" is always false. Practices have never influenced your workout.
- **There is no practice taxonomy.** Team vs. personal-trainer vs. solo vs. lesson vs. showcase is not captured, so the plan could not react intelligently even once the query is fixed.
- **There is no manual "Add practice."** The only entry point is the AI importer, reached through an "Add game" button.
- The calendar's practice query has no user or date filter, so it pulls every practice row the account can see (including sessions a coach created for other athletes) and grows unbounded.

## What gets built

### 1. Practice taxonomy (the missing structure)
Add a first-class practice kind to every practice row:

- `team` — official team practice
- `trainer` — private/personal trainer session or lesson
- `solo` — self-directed personal practice
- `showcase` — showcase / camp / tryout
- `travel` / `other` — non-training day markers (already used)

Plus intensity (`light` / `standard` / `heavy`) and duration, since a 45-minute solo cage session and a 3-hour team practice load the athlete very differently.

### 2. Fix plan modulation (the real bug)
- Correct the generator's practice lookup to the real date column, and include recurring weekly practices, not just exact-date rows.
- Feed practice kind + intensity into the same day-type logic that already handles game days: heavy team practice suppresses heavy lifts and duplicative skill volume; solo/light practice only trims overlap; travel days switch to mobility/recovery.
- Keep the existing game-day crossover rules unchanged and give practice days their own lighter rule set.

### 3. Manual scheduling UI
- Rename the strip action to "Add to schedule" and offer three paths: **Game**, **Practice**, **Import from text/photo**.
- A practice form with date (or weekly recurrence), start/end time, kind, intensity, focus module, and title/notes.
- Practices become editable and reschedulable from the calendar day sheet, matching how games already cancel/reschedule.

### 4. Guarantee everything lands on the event schedule
- Scope the calendar practice query to the signed-in athlete and the visible date range.
- Add a single reconciliation path so games (`gp_games`), practices, and travel/other markers all flow through one scheduling service that writes the row, refreshes the calendar, and invalidates today's plan — no matter whether the source was AI import, manual add, or coach assignment.
- Extend the importer to pass the athlete's real sport to practice rows (it currently hard-codes baseball) and to classify team/trainer/solo from the source text.

## Technical notes

- Migration on `public.scheduled_practice_sessions`: add `practice_kind text` (default `'team'`), `intensity text` (default `'standard'`), `duration_minutes int`; backfill existing rows from `session_type`; no RLS change needed (existing policies already scope by `user_id`/`created_by`).
- `supabase/functions/wk-generate-daily/index.ts`: fix `.eq("session_date", planDate)` → `scheduled_date`, add recurring-day match, and thread `practice_kind`/`intensity` into `trainingContext.day_type` and the load caps.
- `src/hooks/useImportScheduleEvents.ts`: use `defaultSport` for practice inserts; map parsed kind → `practice_kind`.
- `supabase/functions/parse-season-schedule/index.ts`: extend the enum so team/trainer/solo practices are distinguishable in extraction.
- `src/hooks/useCalendar.ts`: add `.eq('user_id', user.id)` and range filtering to the practice query; mark practices `editable: true`.
- New `AddPracticeDialog` + updated `HammerScheduleStrip`, reusing `useSchedulingService` for writes and audit logging.
