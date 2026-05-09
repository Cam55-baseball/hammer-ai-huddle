
## Phase II — Completion plan

### Pre-flight finding (important)

A full re-read of the three files flagged as "heavily corrupted" shows **no syntax corruption is actually present**:

- `supabase/functions/_shared/notificationAdapters.ts` — `10 * 60_000`, `2 * 60_000`, `30 * 86_400_000` style operators are intact; all generics (`Promise<void>`, `Promise<AdapterResult>`, `Record<string, unknown> | null`, `SupabaseClient | null`) are intact; block comments well-formed; no dangling braces.
- `supabase/functions/foundation-health-alerts/index.ts` — `2 * 60_000` intact, `/* never block evaluator */` comment intact, no malformed multiplication.
- `src/pages/owner/FoundationOpsObservability.tsx` — JSX, `.map`, ternaries, SVG path interpolation, generics all clean; panel exports + dashboard wiring present.

I'll still run the formal sweep (ripgrep for `\d+ \d+_000\b` without `*`, `Promise<\s*>`, `Record<\s*>`, stray `/ ... /` single-slash comments, brace/paren/JSX balance), but no edits should be required there. **If the sweep flags anything, I'll fix it before continuing.**

### What's actually missing

1. **Regression tests** — only `foundationHealthAlerts.lifecycle.test.ts` exists; the Phase II suites are not yet written.
2. **Email template** — no `supabase/functions/_shared/transactional-email-templates/foundation-alert.tsx` exists, and the project has no transactional-email scaffold at all, so the email adapter currently 4xxs at the `send-transactional-email` URL (the function itself doesn't exist).
3. **Live verification** — not yet executed against the new tables/indexes.

---

### Step 1 — Malformed-patch sweep (read-only)

Run `rg` patterns across the 4 touched files for: missing `*` between numerics, empty generics, `/ ... /` single-slash comments, duplicate imports, and brace/paren imbalance. Apply targeted `code--line_replace` only if a real defect is found (none expected based on current read).

### Step 2 — Add regression tests

Create under `src/lib/__tests__/`:

- `foundationNotifications.dispatch.test.ts` — disabled-mode skip, non-critical severity skip, happy path returns results.
- `foundationNotifications.retry.test.ts` — adapter that fails twice then succeeds (asserts `attempts === 3`); adapter that always fails (asserts `dlq` status logged); per-attempt timeout aborts via injected `AbortSignal`.
- `foundationNotifications.flap.test.ts` — when `isFlapping` returns true, adapter is not called and `skipped_flap` is logged.
- `foundationNotifications.idempotency.test.ts` — duplicate-key insert error path logs `skipped_idem` and does not throw.
- `foundationNotifications.logger.test.ts` — logger insert that throws is swallowed (dispatch still resolves).
- `foundationHealthAlerts.antiFlap.test.ts` — for an open alert with `first_seen_at` <2 min ago and `fired=false`, asserts `last_seen_at` is refreshed and `resolved_at` stays null.
- `foundationHealthAlerts.nonBlocking.test.ts` — stub `dispatch` to hang; assert evaluator returns within the 25s race ceiling and writes a heartbeat.
- `foundationOpsObservability.resolved.test.tsx` — pagination, severity filter, debounced search (vitest fake timers), empty/error/loading.
- `foundationOpsObservability.drift.test.tsx` — `bucketize` produces 7 buckets, sparkline path string is non-empty, low-sample badge renders when `total < REPLAY_MISMATCH_MIN_SAMPLE`.
- `foundationOpsObservability.mismatch.test.tsx` — renders 20 rows, handles empty + error.

All Supabase calls mocked via `vi.mock('@/integrations/supabase/client', ...)`. Adapter tests use a fake `SupabaseClient` shape returning `{ data, error }`.

For Deno: `supabase/functions/_shared/notificationAdapters_test.ts` covering disabled/severity/flap paths against a stubbed `fetch` and stubbed Supabase client.

### Step 3 — Wire the foundation-alert email template

Two viable paths — the plan picks **(b)** to avoid invasive infra changes, since notifications are off by default:

a. Run `email_domain--check_email_domain_status` → if no domain, surface the `<lov-open-email-setup>` dialog → after setup, call `email_domain--setup_email_infra` then `email_domain--scaffold_transactional_email`, then add a `foundation-alert.tsx` template with `{ severity, title, alertKey, detailJson }` props.

b. **(default)** Switch `emailAdapter` to a self-contained sender that posts to a tiny new edge function `foundation-alert-email` (or simply logs `email_disabled` if no domain). The adapter no longer references `send-transactional-email`, so it can never 4xx for missing infra. Add a runbook note: "to enable real email, run option (a)".

I'll go with **(b)** unless you tell me to set up email infra now. The adapter will:
- Return `{ ok: false, error: 'email_disabled' }` and log `skipped_disabled` when neither `SLACK_WEBHOOK_URL` nor a future `FOUNDATION_ALERT_EMAIL_HOOK_URL` is set.
- POST to the configured hook URL with a JSON body if set.

### Step 4 — Verification (in this order)

1. `bunx tsc --noEmit`
2. Malformed-patch sweep (ripgrep patterns above)
3. `bunx vitest run src/lib/__tests__/foundation*` and `src/pages/owner/__tests__/foundationOps*` — capture exact pass count.
4. `supabase--test_edge_functions` for `notificationAdapters_test.ts`.
5. `supabase--deploy_edge_functions` for `foundation-health-alerts`, `foundation-alert-retention`.
6. `supabase--curl_edge_functions` POST both; capture JSON.
7. `supabase--read_query`:
   - `select * from foundation_cron_heartbeats where function_name in ('foundation-health-alerts','foundation-alert-retention') order by ran_at desc limit 4`
   - `select count(*), status from foundation_notification_dispatches group by status`
   - `select indexname from pg_indexes where tablename='foundation_health_alerts'` (proof for `idx_fha_resolved_severity`, `idx_fha_alert_key_resolved`)
   - `select indexname from pg_indexes where tablename='foundation_notification_dispatches'`
   - `explain select id from foundation_health_alerts where resolved_at is not null and severity='critical' order by resolved_at desc limit 25` (confirms index use)

### Step 5 — Final report

Output: exact diffs, sweep results, `tsc` status, vitest counts (e.g. `42/42`), Deno test counts, live invocation JSON, `pg_indexes` rows, and any remaining risks.

---

### Out of scope
- No threshold tuning, no UX redesign, no new analytics domains, no replacement of Phase H behavior.
- No Slack/email enablement (flag stays off until you flip `FOUNDATION_NOTIFICATIONS_ENABLED`).

### Confirm before I implement
- **Email path**: option (a) full transactional-email scaffold, or option (b) inert hook-URL adapter? Default = (b).
