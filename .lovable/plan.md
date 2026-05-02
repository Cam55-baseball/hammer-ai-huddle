
# Phase X — Follower Report System Hardening

Make the follower report pipeline retry-safe, load-safe, failure-tolerant, observable, and deterministic. No behavior changes for the user — only reliability, performance, and crash prevention.

## Scope of Changes

### 1. Database migration (one new migration)

- Add unique constraint on `follower_reports`:
  `UNIQUE (follower_id, player_id, report_type, period_start)`
- Add indexes:
  - `idx_sessions_user_date` on `performance_sessions(user_id, session_date)`
  - `idx_games_user_date` on `game_logs(user_id, game_date)` (verify table name first)
  - `idx_reports_lookup` on `follower_reports(follower_id, player_id)`
- New observability table `follower_report_logs` (id, follower_id, player_id, report_type, status: success|skipped|failed, reason, error, duration_ms, created_at) with RLS — admin/service-role read only.

### 2. `supabase/functions/generate-follower-reports/index.ts` (rewrite hot paths)

Critical fixes:
- Replace all `any` in aggregation helpers with typed guards (`(v): v is number => typeof v === 'number'`).
- Type `gradeDeltas` as `Record<string, { current: number; delta: number | null }>`.
- Replace `.insert(...)` with `.upsert(..., { onConflict: 'follower_id,player_id,report_type,period_start' })` so retries are safe at the DB level.
- Validate `follower_role` against `['scout','coach']` whitelist before processing; otherwise log `skipped: invalid_role`.
- Guarantee return shape: ensure `snapshot`, `recent_sessions`, `weaknesses`, `strengths`, `tool_grades`, `prescriptive_fixes` are always defined (object or array) before persisting.

Performance/scale:
- Cap work per invocation: `pairs = pairs.slice(0, 200)`.
- Batch followers in groups of 5 with `Promise.all`, not sequential `for await`.
- Pre-fetch all needed players, sessions, games, grades **once in bulk** (by `IN (playerIds)` with date window) and index by `player_id` in maps. Eliminate per-pair queries inside the loop.

Resilience:
- Wrap whole request in `AbortController` with 25s timeout; pass `signal` to the Lovable AI `fetch`.
- `generateHeadline`: tier 1 = AI; on any failure (timeout, non-200, JSON parse, abort) fall back to deterministic string:
  `"Player recorded ${sessions_count} sessions and ${games_count} games. Performance trends remain stable."` — never the generic "Activity summary".

Observability:
- Around each `generateForFollower`, record start time and insert into `follower_report_logs` with `status` (success/skipped/failed), `reason`, `error?.message`, and `duration_ms`. Logging must never throw — wrap in try/catch.

### 3. `supabase/functions/get-follower-reports/index.ts`

- Confirm every read path filters by `.eq('follower_id', user.id)` (already true — verify and lock in).
- Continue using SERVICE_ROLE only on server side.

### 4. `src/hooks/useFollowerReports.ts`

- Remove the orphan `await supabase.functions.invoke('get-follower-reports')` call inside `useFollowerReport` (it fires a wasted request before the real fetch). Keep only the `fetch` with `?id=` query param.
- Early-return `null` when `id` is null (already gated by `enabled`, but guard the body too).

### 5. `src/components/follower-reports/PlayerReportDrawer.tsx`

- Add `if (!reportId) return null;` before any rendering inside the open sheet.
- Wrap every field access with safe defaults:
  - `report?.headline ?? 'No headline available'`
  - `player?.full_name ?? 'Unknown Player'`
  - `rd?.period_metrics?.* ?? '—'`
  - Array sections: `(rd?.strengths ?? []).length > 0 ?` etc.

### 6. `src/components/follower-reports/FollowerReportsInbox.tsx`

- Guard `report.player?.full_name` and `report.headline` with the same fallbacks.

## Verification (post-implementation)

Run via `supabase--read_query`:
- Duplicate check: `SELECT follower_id, player_id, report_type, period_start, COUNT(*) FROM follower_reports GROUP BY 1,2,3,4 HAVING COUNT(*) > 1;` → must be empty.
- Failure rate: `SELECT status, COUNT(*) FROM follower_report_logs WHERE created_at > now() - interval '30 minutes' GROUP BY status;` → failures near 0.
- Re-invoke `generate-follower-reports` twice in a row → row counts unchanged (idempotent).

## Acceptance — ELITE STABLE

- [ ] Zero duplicate `follower_reports` rows after double-run
- [ ] Function safely re-runnable (upsert + unique constraint)
- [ ] Lovable AI failure produces deterministic headline, never crashes
- [ ] UI renders cleanly with null/missing fields
- [ ] Batch (5) processing completes well under 25s for ≤200 pairs
- [ ] `follower_report_logs` shows successes; failures ≈ 0
- [ ] No `any` left in the generator's aggregation paths

## Out of Scope

- No new UI features, no new report types, no schedule/cron changes.
- No changes to `mark-follower-report-viewed` (already minimal and safe).
