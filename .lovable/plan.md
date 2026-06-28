# Plan — AI Season Schedule Importer

Replace the "Season dates" button's naive `navigate("/calendar")` jump with a real importer dialog where athletes (or parents) paste a free-text schedule **or** upload a photo of a printed/team-app schedule. Lovable AI parses it into structured events, the athlete reviews/edits, and on confirm we persist them to `games` and/or `custom_activity_logs` so the calendar projection, Hammer daily plan, season-phase inference, and game-day context all react automatically.

## User flow

1. On Home → Hammer schedule strip, tap **Season dates** → opens `SeasonScheduleImporterDialog` (does not navigate away).
2. Two tabs:
   - **Paste text** — multiline textarea. Example placeholder: "April 1–4 'Final Bash' Tournament in Dunedin, FL · April 7–12 Game vs Madison in Wisconsin…"
   - **Upload photo** — drag/drop or file picker (jpg/png/heic→png, ≤8 MB, single image; multi-image v2).
3. Tap **Analyze with Hammer AI** → spinner → results table of proposed events with: date(s), title, type (game / tournament / practice / travel / other), opponent, location, confidence, source snippet.
4. User can edit any row inline, delete rows, toggle "Add to calendar".
5. **Add N events to my calendar** → writes rows, invalidates calendar + Hammer queries, toasts success, closes dialog. Failures surface per-row with retry.

## Architecture

### New edge function: `supabase/functions/parse-season-schedule/index.ts`
- Auth-gated (validate JWT, derive `user_id`).
- Input: `{ mode: "text" | "image", text?: string, imageBase64?: string, mimeType?: string, timezone: string, todayISO: string }`.
- Calls Lovable AI Gateway `google/gemini-3-flash-preview` (multimodal — text or `image_url` data URL) with a strict JSON-schema tool call.
- Output shape:
  ```ts
  { events: Array<{
      kind: "game" | "tournament_day" | "practice" | "travel" | "other";
      start_date: string;   // YYYY-MM-DD
      end_date: string;     // inclusive; equals start_date for single day
      title: string;
      opponent?: string;
      location?: string;
      time_local?: string;  // HH:mm if present
      confidence: "high" | "medium" | "low";
      source_snippet: string;
  }> }
  ```
- System prompt enforces: expand date ranges into per-day rows; never invent years (default to current season year from `todayISO`); leave unknowns null; mark low confidence when ambiguous; reject non-schedule images with `events: []`.
- CORS + 402/429 surfacing per Lovable AI conventions.

### New component: `src/components/hammer/SeasonScheduleImporterDialog.tsx`
- shadcn `Dialog` + `Tabs` (Paste / Upload).
- Image preview, client-side downscale (max 1280px, jpeg q0.85) before base64 to stay under 30 MB gateway cap (reuses the pattern already in `src/lib/frameExtraction.ts`).
- `useMutation` → invokes the edge function.
- Review step uses `Table` with editable cells (date pickers via the shadcn Datepicker pattern, with `pointer-events-auto` on the calendar wrapper).
- Confirm step calls a new hook `useImportScheduleEvents`.

### New hook: `src/hooks/useImportScheduleEvents.ts`
- For each accepted row:
  - `kind === "game" | "tournament_day"` → insert into `games` (`user_id`, `game_date = start_date`, `opponent_name`, `status: "scheduled"`, plus location/notes columns that already exist; we'll inspect the table for exact column names before writing the migration if any column is missing).
  - `kind === "practice"` → insert into `scheduled_practice_sessions`.
  - `kind === "travel" | "other"` → insert into `custom_activity_logs` with a system template (create-if-missing "Travel" / "Schedule note" template under the user).
- Emits an RR-8 life-context `relational.schedule.imported` ASB event per import batch (additive, interpretive-only — never authors organism truth) with row count, source mode, ai model/version.
- Invalidates: `['calendar-projection', ...]`, `['schedule-window-games', ...]`, `['schedule-window-practices', ...]`, `['game-day-context', ...]`, Hammer daily plan keys.

### Wire-up
- `src/components/hammer/HammerScheduleStrip.tsx`: replace the "Season dates" button's `onClick={() => navigate("/calendar")}` with `onClick={() => setImporterOpen(true)}` and mount the new dialog. Keep "Add game" as a quick single-event path to `/calendar` (unchanged).
- Add a secondary "Import schedule" entry on the Calendar page header so power users can reach the same flow there.

### Downstream automatic reactions (no extra work needed once data lands)
- `useCalendarProjection` already reads `games` + practices + custom logs → events render.
- `useScheduleWindow` & `useGameDayContext` pick up new games → Hammer daily plan recalibrates priorities, season-phase suggestions update, "Mark in-season" banner clears when appropriate.
- Category-goal ordering and existing roadmap reasons remain intact; game density now flows from real data instead of empty state.

## Safety, trust, and constitutional fit
- AI is interpretive — output is **proposed**, never auto-committed. Athlete approval gate enforced.
- Each persisted row stores `source: "ai_schedule_import"` and `source_snippet` in a `metadata` jsonb (add column via migration if not present on `games`; otherwise stash in `notes`).
- Minor-safeguarding: no change — same RLS path; parent-linked accounts continue to operate under existing policies.
- Lineage event emitted into `asb_events` under `relational.schedule.imported` (interpretive only, matches RR-8 doctrine in memory index).
- No organism-truth authorship; no override of injury/RR-6 logic.

## Files

**New**
- `supabase/functions/parse-season-schedule/index.ts`
- `src/components/hammer/SeasonScheduleImporterDialog.tsx`
- `src/components/hammer/SeasonScheduleReviewTable.tsx`
- `src/hooks/useImportScheduleEvents.ts`
- `src/lib/hammer/schedule/importLineage.ts` (emit ASB event)
- Migration: add `metadata jsonb` to `games` if missing; ensure `scheduled_practice_sessions.metadata` exists. Add `parse-season-schedule` to `supabase/config.toml` with `verify_jwt = true`.

**Edited**
- `src/components/hammer/HammerScheduleStrip.tsx` — button handler + dialog mount.
- `src/pages/Calendar.tsx` — small "Import schedule" button in header.

## Out of scope (deferrable v2)
- Multi-image batch upload, PDF parsing, ICS export, recurring weekly practice inference, conflict-detection against existing rows (we'll show a soft "already on this day" badge in review but not auto-merge).

## Open question before build
None blocking — defaults above (game → `games` table, practice → `scheduled_practice_sessions`, travel/other → custom log) follow existing conventions. If you'd prefer travel days *not* land on the calendar (just inform Hammer's context), say so and I'll route them to a metadata-only RR-8 event instead.
