
Implementation plan (approved scope consolidated into one fix batch):

1) Restore Owner Bio content
- Root cause: `get-owner-profile` uses `.maybeSingle()` on `user_roles` for `role='owner'`. There are multiple owner rows, so it falls into the null fallback response.
- Changes:
  - `supabase/functions/get-owner-profile/index.ts`
    - Replace single-owner lookup with deterministic owner selection:
      - Join owner roles to profiles
      - Prefer owner with non-empty bio/credentials
      - Fallback to oldest active owner
    - Keep translation behavior unchanged.
  - `src/components/AppSidebar.tsx`
    - Add safe fallback to `original_bio` / `original_credentials` if translated fields are empty.
    - Invalidate stale cached owner profile when API returns empty payload.

2) Velocity bands start at 10 mph
- Changes:
  - `src/data/baseball/velocityBands.ts`
  - `src/data/softball/velocityBands.ts`
- Update both machine and pitching lists to start at `10-15`, then continue 5-mph increments upward (preserving existing upper ranges).

3) Scheduling/rescheduling must sync Calendar + Game Plan, and show Skip/Push in Game Plan
- Root issues found:
  - `RestDayScheduler` currently mutates only `calendar_events` rows.
  - Most Game Plan items are generated from schedules/templates, not `calendar_events`.
  - `useGamePlan` skip query excludes `item_type='program'`, so workout skips can desync.
- Changes:
  - Introduce a shared reschedule engine (hook/utility) used by both Calendar Day Sheet and Game Plan:
    - Handle by item type:
      - manual/calendar rows -> move/delete `calendar_events`
      - game_plan/program/custom template items -> write unified scheduling overrides (date-specific move/drop) and apply to both modules
  - Update `RestDayScheduler` input model to receive full schedulable item metadata (not just `id/title/type`).
  - Add “Skip / Move to next open day / Push forward” entry points in `GamePlanCard` (same actions as Calendar).
  - `useGamePlan.ts`: include `program` in skip fetch and apply same override logic used by calendar aggregation.
  - `useCalendar.ts`: apply the same override logic during event aggregation.
- Backend (migration):
  - Add a date-specific schedule override table (user-scoped) with RLS for owner-only rows.
  - Read/write policies limited to authenticated user’s own records.

4) Video + Log scroller reliability
- Changes:
  - `src/components/practice/VideoRepLogger.tsx`
- Hardening:
  - Keep scrubber + rewind/FF + frame-step controls, but fix reliability gaps:
    - guard `video.play()` promise + error handling
    - stable duration resolution for WebM/recorded blobs
    - prevent scrubber jitter when duration is unknown/Infinity
    - clamp seek operations and sync state on `seeking/seeked`
  - Add native `controls` fallback for device/browser edge cases while preserving custom controls.

5) Fix Tex Vision scoring inaccuracies
- Root issues to address:
  - Several drill components compute final accuracy from async state snapshots, causing occasional off-by-one/late updates.
  - Some drills can trigger completion paths twice.
- Changes:
  - Add shared scoring utility (clamped, deterministic accuracy/reaction calculations).
  - Update drill components in `src/components/tex-vision/drills/*` to:
    - compute final score from refs/finalized counters
    - enforce single `onComplete` emission per run
    - standardize attempt counting semantics across drills
  - Keep `ActiveDrillView` completion guard, and ensure all drill results conform to same scoring contract.

Validation plan (must pass before close)
- Owner bio:
  - Sidebar shows full owner bio/credentials again in EN + translated language.
- Velocity bands:
  - Session config + rep scoring selectors start at `10-15` for both sports.
- Scheduling sync:
  - Perform skip/move/push from Calendar and verify Game Plan reflects immediately.
  - Perform same actions from Game Plan and verify Calendar reflects immediately.
- Video controls:
  - In Video + Log: play/pause, scrub, rewind/FF, frame-step all work on mobile and desktop.
- Tex Vision:
  - Run multiple drills and verify end-of-drill score matches visible attempt/correct counts consistently.
