## Why custom activities are missing

The calendar's **derived projection layer** (`buildCalendarEvents`) is now the sole source for `custom_activity` events on the calendar — the merge adapter drops every legacy `custom_activity` row. But that projection silently filters out three very common cases:

1. **Orphan quick-logs are dropped.** `QuickLogSheet` writes rows into `custom_activity_logs` with `template_id = null`. The projection has `if (!log.template_id) continue;` — so every quick-log a user saves never shows on the calendar.
2. **Logs whose template was soft-deleted are dropped.** Even though the historical activity happened, `if (!tpl) continue;` removes it. Users see their past work disappear when they tidy up templates.
3. **Recurring templates require `display_on_game_plan = true`.** Many custom activities have `recurring_days` set but never had that toggle flipped on — so they never project onto future dates.

## Why the calendar is slow

The page runs **two full data layers in parallel** for every month change:

- `useCalendar` (legacy): 11 parallel Supabase queries, no React Query cache, calls `setLoading(true)` on every month nav → full skeleton flash and a fresh round-trip every time, even when re-visiting the same month.
- `useCalendarProjection`: 5 React Query'd queries on top of that. Two of them (`custom_activity_templates`, `custom_activity_logs`) duplicate what legacy already fetches.

So each month nav fires ~16 queries, two of which are redundant, with no stale-while-revalidate.

## Plan

### 1. Fix the projection to stop hiding activities (`src/lib/calendar/buildCalendarEvents.ts`)

- Emit an event for `custom_activity_logs` rows even when `template_id` is null. Title falls back to first line of `notes`, then `performance_data.module`, then `'Quick Log'`. Color falls back to source default.
- Emit an event for logs whose template is soft-deleted (use `tpl.title` snapshot if available, else log-derived title). Mark these as non-editable.
- Project recurring templates whenever `recurring_days` or `display_days` is non-empty, regardless of `display_on_game_plan`. Keep `display_on_game_plan === false` as an explicit opt-out only.
- Update `buildCalendarEvents.test.ts` with cases for: orphan log, deleted-template log, recurring template with `display_on_game_plan` null/true/false.

### 2. Make the projection fetch templates that include soft-deleted (`src/hooks/useCalendarProjection.ts`)

- Drop the `.is('deleted_at', null)` filter on the templates query so deleted-template logs can still resolve a title. The pure builder already gates recurring projection on `deleted_at`, so recurrence behavior is unchanged.

### 3. Remove duplicate fetches from legacy and stop the loading flash (`src/hooks/useCalendar.ts`)

- Delete the `custom_activity_templates` and `custom_activity_logs` queries from `fetchEventsForRange` and the code paths that build legacy `custom_activity` events from them — the derived layer is already authoritative (and we're keeping the merge adapter's drop rule).
- Replace the ad-hoc `useState(loading)` + `setLoading(true)` pattern with a React Query `useQuery` keyed on `['calendar-legacy', userId, sport, startStr, endStr]`. Use `placeholderData: keepPreviousData` so navigating months keeps the prior month visible while the next one loads (no full skeleton flash). Existing realtime invalidation in `useSchedulingRealtime` already targets these keys after change.

### 4. Verification

- Run `vitest src/lib/calendar/buildCalendarEvents.test.ts`.
- Manually: create a Quick Log, confirm it appears on today's calendar cell and in the day sheet. Soft-delete a template that has past logs, confirm those past dates still show the activity. Create a recurring template without toggling Game Plan display, confirm it still projects onto its recurring weekdays.
- Network tab on month nav should drop from ~16 to ~12 requests, and re-visiting a month should be instant (cache hit).

### Out of scope

- No schema changes. No RLS changes. No new tables.
- No changes to the calendar grid UI, filters, or day sheet.
- No changes to training-block or game-plan projection logic.
- The `display_on_game_plan` toggle stays in the template editor — it just becomes a true opt-out rather than a required opt-in.
