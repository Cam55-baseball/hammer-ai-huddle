## Phase H Stabilization & Verification Plan

The foundation_health_alerts table, alerts edge function, dashboard panel, trace inspector pagination/CSV/replay/recompute actions, and centralized thresholds are already in place. Two gaps remain plus a verification sweep.

### 1. Migration gap-fill (`supabase/migrations/<new>_foundation_health_alerts_hardening.sql`)

The existing migration covers: table, unique-open-key index, severity/last_seen partial index, RLS enable, admin SELECT policy. It is missing:

- An index on `(alert_key, resolved_at)` to keep the open-key upsert lookup cheap once history grows.
- An index on `resolved_at DESC` for resolution audits.
- An explicit "service role manages alerts" ALL policy. Service role bypasses RLS today, but stating the policy makes intent reviewable and survives any future `FORCE ROW LEVEL SECURITY` flip.
- Comment block documenting auto-resolve semantics.

No table-shape changes — additive only, safe to ship.

### 2. Cron wiring (`supabase--insert`, not migration — contains project URL + anon key)

Schedule `foundation-health-alerts` hourly at minute 5 (offset from `:00` `hourly-trigger-decay` and `:15` decay sweep to avoid collision):

```
select cron.schedule(
  'foundation-health-alerts-hourly',
  '5 * * * *',
  $$ select net.http_post(
       url := 'https://wysikbsjalfvjwqzkihj.supabase.co/functions/v1/foundation-health-alerts',
       headers := '{"Content-Type":"application/json","apikey":"<anon>"}'::jsonb,
       body := '{}'::jsonb) $$);
```

Pre-check `cron.job` to skip if a row with that name already exists (idempotent).

### 3. TypeScript / JSX integrity sweep

Targeted automated checks (no manual `tsc` per project rule — rely on harness build, then read result). In addition, explicit grep audits across the five Phase H files for the corruption patterns called out:

- Stripped operators: `rg -n " = =[^=]| =\\*[^*]|>=[^ =0-9a-zA-Z_(]| <[^=a-zA-Z<]| >[^=a-zA-Z>]" <files>`
- Bare `*` / missing `*` in arithmetic: `rg -n "[a-zA-Z0-9_)]\\s+[0-9]" <files>` reviewed for missing operator
- Broken JSX tags: `rg -n "<[A-Z][A-Za-z]*\\s[^>]*$" <files>` (unterminated)
- Malformed ternaries: `rg -n "\\?[^:]*$" <files>` then visually inspect
- Stripped generics: `rg -n "Map<\\s|Record<\\s|useState<\\s" <files>`
- Map callback shape: `rg -n "\\.map\\(\\s*\\)" <files>`

Files audited:
- `src/lib/foundationThresholds.ts`
- `src/pages/owner/FoundationHealthDashboard.tsx`
- `src/pages/owner/FoundationTraceInspector.tsx`
- `supabase/functions/foundation-health-alerts/index.ts`
- `supabase/functions/foundations-recompute-user/index.ts`
- `supabase/functions/foundations-replay/index.ts`

Then run `bunx vitest run src/lib/__tests__/foundationFatigue.test.ts src/lib/__tests__/foundationScorer.replay.test.ts src/lib/__tests__/foundationStateMachine.test.ts src/lib/__tests__/foundationCornerCases.test.ts` to catch any regression to surrounding scorer/fatigue logic.

### 4. Regression checks (read-only against live data)

Each check uses `supabase--read_query` or `supabase--curl_edge_functions` — no writes:

| Check | Method |
|---|---|
| Cursor pagination contiguity | Inspect rendered network calls: first page `limit=100`, second page adds `created_at=lt.<cursor>`; verify no duplicate `trace_id` across pages by sampling DB |
| CSV export cap/chunking | Code-path review — `while (total < TRACE_EXPORT_MAX)` with `Math.min(TRACE_EXPORT_CHUNK, TRACE_EXPORT_MAX - total)` and `cursor` advance. Confirm cap branch toasts `(capped)` |
| Replay action | `supabase--curl_edge_functions` POST `/foundations-replay` with a real `traceId`; assert `matched_count`/`total` returned |
| Recompute action | Same for `/foundations-recompute-user`; verify a new `admin_replay` trace row appears |
| Alert auto-resolve | Manually invoke `/foundation-health-alerts` twice with no fault conditions; verify `opened=0`, second call returns `resolved>=0` and DB shows `resolved_at IS NOT NULL` for any prior open key |
| System-user exclusion | `select count(*) from foundation_recommendation_traces where user_id = SYSTEM_USER` — confirm dashboard funnel and alerts function both filter via `.neq` |
| Cron heartbeat transitions | Inspect `foundation_cron_heartbeats` last 5 rows per function; confirm `status` values and dashboard pill mapping (`green`/`amber`/`red`) at ages `< maxAge`, `> maxAge`, `> 2× maxAge` |

### 5. Final deliverables

A consolidated report listing:
- Compile issues found + fixes (or "none")
- Runtime issues found + fixes (or "none")
- Final files changed in this stabilization pass (only the new hardening migration + the cron-insert SQL — no source edits unless audit finds defects)
- Confirmation of each regression check pass/fail
- Remaining known risks (e.g., service-role bypass dependence, anon-key in cron)

### Sequencing

1. Author hardening migration → request user approval.
2. After migration applied, run cron-insert SQL.
3. Deploy `foundation-health-alerts` (already exists; redeploy to be safe).
4. Curl-test each edge function.
5. Run vitest + read harness build output.
6. Run regression read-queries.
7. Emit final report.

No new feature work begins until every regression check passes.
