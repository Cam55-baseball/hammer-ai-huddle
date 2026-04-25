
# Phase 11 — Analytics Pipeline + Signal Extraction Layer

Turn the existing Phase 10 event tracker into a real analytics pipeline. **No UI, no scoring, no flow changes.** Pure visibility.

> **Transport choice:** This is a Vite SPA on Lovable Cloud — there is no Next-style `/api/analytics` route handler. The correct equivalent is a Supabase Edge Function (`analytics-ingest`) called via its public URL, fronted by `sendBeacon`. Behavior matches the spec exactly (fire-and-forget, no retries, no UX impact).

---

## Part 1 — Database table

Migration creating one append-only table:

```sql
create table public.launch_events (
  id          uuid primary key default gen_random_uuid(),
  event       text not null,
  payload     jsonb not null default '{}'::jsonb,
  ts          timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index launch_events_event_created_at_idx
  on public.launch_events (event, created_at desc);

alter table public.launch_events enable row level security;

-- No client policies. Only the edge function (service role) writes.
-- No SELECT policy → ordinary users cannot read.
```

No FK to `auth.users` (events are anonymous-by-default; we add `user_id` later if needed). Not added to realtime publication.

---

## Part 2 — Edge function `analytics-ingest`

**New file:** `supabase/functions/analytics-ingest/index.ts`

- `verify_jwt = false` (default) — endpoint is open so `sendBeacon` (which can't set auth headers) works.
- CORS: full headers on both `OPTIONS` preflight and every response.
- Accepts `POST` JSON: `{ event: string, payload?: object, ts?: number }`.
- Loose validation:
  - `event` must be one of the locked vocabulary (Part 3); reject others with 400.
  - `payload` must be an object (default `{}`); coerce non-objects to `{}`.
  - `ts` optional; ignored for storage (DB `ts` defaults to `now()` to keep server-trusted time).
- Insert into `launch_events` using the **service-role** client (`SUPABASE_SERVICE_ROLE_KEY`) with `persistSession: false`.
- Always return `204 No Content` on success, never blocks, never throws to caller.
- On insert error: log server-side, still return `204` so the client never sees a failure (matches "fire-and-forget").

This satisfies the spec's "fast and dumb" requirement: no joins, no derivation, single insert.

---

## Part 3 — Client transport in `src/lib/launchEvents.ts`

Extend (do not replace) the existing tracker.

**a) Add the locked vocabulary**

```ts
export type LaunchEvent =
  | 'NN_COMPLETED'
  | 'STANDARD_MET'
  | 'NIGHT_CHECKIN_COMPLETED'
  | 'DAY_SKIPPED'
  | 'FEEDBACK';
```

**b) Add `sendToAnalytics` (private)**

```ts
const ANALYTICS_URL =
  `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/analytics-ingest`;

function sendToAnalytics(event: LaunchEvent, payload?: Record<string, unknown>) {
  try {
    if (typeof window === 'undefined') return;
    const body = JSON.stringify({ event, payload: payload ?? {}, ts: Date.now() });
    const blob = new Blob([body], { type: 'application/json' });

    if (navigator?.sendBeacon?.(ANALYTICS_URL, blob)) return;

    // Fallback: non-blocking fetch
    fetch(ANALYTICS_URL, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never throw */
  }
}
```

**c) Wire into `trackLaunchEvent`**

Keep the existing DEV log untouched. Append:

```ts
if (import.meta.env.PROD) sendToAnalytics(event, payload);
if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.log('[HM-ANALYTICS-PAYLOAD]', { event, payload: payload ?? {} });
}
```

The DEV-only payload log satisfies Part 6 verification without touching call sites.

**Non-negotiables enforced:** never await, never throw (try/catch + `.catch(() => {})`), no retry logic, no UI coupling. `trackOnce` continues to gate firing, so dedupe still applies before transport.

---

## Part 4 — Payload standardization (flat `{ date, ... }`)

Update only the four existing call sites + add the one new FEEDBACK emit. No semantic change — just ensures every event carries a `date: YYYY-MM-DD` field.

| File | Current call | New call |
|---|---|---|
| `src/hooks/useCustomActivities.ts:481` | `trackOnce('NN_COMPLETED', \`nn:${today}:${templateId}\`, { templateId })` | `trackOnce('NN_COMPLETED', \`nn:${today}:${templateId}\`, { date: today, templateId })` |
| `src/components/GamePlanCard.tsx:1054` | `trackOnce('STANDARD_MET', \`standard_met:${getTodayDate()}\`, { nnTotal: total })` | `trackOnce('STANDARD_MET', \`standard_met:${today}\`, { date: today })` *(drop `nnTotal` to match the locked schema; the count is derivable from `NN_COMPLETED` rows)* |
| `src/components/vault/VaultFocusQuizDialog.tsx:588` | `trackOnce('NIGHT_CHECKIN_COMPLETED', \`night_checkin:${getTodayDate()}\`)` | `trackOnce('NIGHT_CHECKIN_COMPLETED', \`night_checkin:${today}\`, { date: today })` |
| `src/hooks/useDayState.ts:122` | `trackOnce('DAY_SKIPPED', \`day_skipped:${todayStr}\`)` | `trackOnce('DAY_SKIPPED', \`day_skipped:${todayStr}\`, { date: todayStr })` |

**New emit — FEEDBACK** in `src/components/vault/quiz/NightCheckInSuccess.tsx` inside `FeedbackPrompt`'s submit handler (right after the existing `safeSet(FEEDBACK_LOG_KEY, …)` write):

```ts
trackLaunchEvent('FEEDBACK', {
  date: getTodayDate(),
  helpful,                       // boolean already in scope
  ...(note ? { note: note.slice(0, 120) } : {}),
});
```

Use `trackLaunchEvent` (not `trackOnce`) — the existing 3-day local throttle already prevents spam, and we want each genuine submission recorded.

---

## Part 5 — Safety guarantees (verified by code shape, not new code)

- `sendToAnalytics` is wrapped in try/catch; `fetch` rejection is swallowed; `sendBeacon` returns `false` silently → fallback path also swallows.
- Edge function always returns `204` even on insert error → client never observes failure.
- No `await` anywhere in the client path.
- No retry queue, no localStorage buffering — by spec.
- If `VITE_SUPABASE_PROJECT_ID` is missing, the URL is malformed and `sendBeacon`/`fetch` simply fail silently. No crash.

---

## Part 6 — Dev verification (no code shipped)

After implementation I'll confirm:
1. `npm run build` succeeds, zero TS errors.
2. Built bundle still contains zero `[HM-EVENT]` / `[HM-ANALYTICS-PAYLOAD]` strings (gated behind `import.meta.env.DEV`, dead-code-eliminated).
3. Edge function deploys cleanly (`supabase--deploy_edge_functions`).
4. A quick `curl` POST to the deployed function returns `204` and produces a `launch_events` row (verified via `supabase--read_query`).

User-side acceptance (you in the preview):
- DEV: `[HM-EVENT]` + `[HM-ANALYTICS-PAYLOAD]` logs fire; no network POSTs (PROD-gated).
- Published build: Network tab shows `POST .../functions/v1/analytics-ingest` (status 204) for each of the 5 events; no console noise; no UI lag.

---

## Part 7 — Explicitly NOT doing

- ❌ No new events beyond the 5 locked names.
- ❌ No retries / queueing / batching.
- ❌ No reading from `launch_events` in the app.
- ❌ No dashboard, no aggregation views, no scoring impact.
- ❌ No changes to `useDailyOutcome`, `nnProgress`, evaluator, `safeStorage`, or any UI surface.
- ❌ No FEEDBACK schema beyond `{ date, helpful, note? }`.

---

## Files touched

| File | Change |
|---|---|
| `supabase/migrations/<new>.sql` | Create `launch_events` table + index + RLS enable |
| `supabase/functions/analytics-ingest/index.ts` | **NEW** — POST ingestion, service-role insert, 204 always |
| `src/lib/launchEvents.ts` | Add `'FEEDBACK'` to union, add `sendToAnalytics`, wire into `trackLaunchEvent` (PROD send + DEV payload log) |
| `src/hooks/useCustomActivities.ts` | Add `date` to NN_COMPLETED payload |
| `src/components/GamePlanCard.tsx` | Replace `nnTotal` with `date` in STANDARD_MET payload |
| `src/components/vault/VaultFocusQuizDialog.tsx` | Add `date` to NIGHT_CHECKIN_COMPLETED payload |
| `src/hooks/useDayState.ts` | Add `date` to DAY_SKIPPED payload |
| `src/components/vault/quiz/NightCheckInSuccess.tsx` | Emit `FEEDBACK` event from `FeedbackPrompt` submit handler |

---

## Acceptance criteria mapping

| Spec requirement | How it's met |
|---|---|
| All 4 (now 5) core events hit ingestion in PROD | `trackLaunchEvent` calls `sendToAnalytics` under `import.meta.env.PROD` |
| Payloads consistent + minimal | Every event sends flat `{ date, ...fields }`; vocabulary locked in TS union + edge validator |
| No duplicate events | `trackOnce` unchanged; FEEDBACK throttled by existing 3-day local gate |
| No UI lag | `sendBeacon` first; `fetch` is `keepalive`+non-awaited; never throws |
| No console noise in PROD | All logs gated behind `import.meta.env.DEV` |
| Endpoint handles load without blocking | Single insert, returns 204 immediately, no joins/derivation |
