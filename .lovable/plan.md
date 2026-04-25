# Phase 11 Validation — Close-out Pass

**No code changes. No behavior changes.** Validation only.

## What's already verified (this session)

| Section | Result | Evidence |
|---|---|---|
| Part 1 — Endpoint validation | ✅ PASS | `STANDARD_MET` → 204 + CORS; `INVALID_EVENT` → 400, no insert |
| Part 2 — DB shape (STANDARD_MET only) | ✅ PASS | 0 null payloads, 0 missing `date`, JSON well-formed |
| Part 4 — Dev/Prod gating | ✅ PASS | `launchEvents.ts` DEV/PROD env gates correct |
| Part 5 — Dedupe | ✅ PASS | `trackOnce` in-memory Set + `safeStorage` lock |
| Part 6 — Failure resilience | ✅ PASS | All transport paths wrapped, empty `ANALYTICS_URL` early-returns |
| Part 8 — Edge function logs | ✅ PASS | Only `booted` log, no exceptions/spam |

## What this plan executes

### Step 1 — Bundle sanity (Part 7)

Run a production build and grep the output for any leaked dev-only strings:

```bash
npm run build
rg -l "HM-EVENT|HM-ANALYTICS-PAYLOAD" dist/
```

**Expected:** zero matches (Vite dead-code-eliminates `import.meta.env.DEV` branches in production builds).

**If matches found:** report the file paths. Do NOT modify any source — escalate to the user with the exact strings and locations.

### Step 2 — Outstanding manual coverage (user action required, not in this plan)

The published-app DB still lacks samples for `NN_COMPLETED`, `NIGHT_CHECKIN_COMPLETED`, `DAY_SKIPPED`, and `FEEDBACK`. To close Part 2 and Part 3 fully, **the user** must trigger those four events once each in the published app. Once done, re-running this query closes both sections:

```sql
select event, payload, created_at
from public.launch_events
where created_at > now() - interval '1 hour'
order by created_at desc;
```

Expected payload shapes:
- `NN_COMPLETED` → `{ date, templateId }`
- `NIGHT_CHECKIN_COMPLETED` → `{ date }`
- `DAY_SKIPPED` → `{ date }`
- `FEEDBACK` → `{ date, helpful, note? }`

This step is **out of scope** for this plan — it requires real user interaction in the live app.

## Files touched

**None.** This is a build-and-grep verification. No source modifications, no migrations, no edge function changes.

## Acceptance

- `npm run build` exits 0
- `rg -l "HM-EVENT|HM-ANALYTICS-PAYLOAD" dist/` returns no matches

If both pass, Phase 11 is fully validated except for the user-driven Part 3 coverage above.
