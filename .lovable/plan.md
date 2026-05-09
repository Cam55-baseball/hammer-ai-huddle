# Phase I Final Merge Gate

Scope: stabilize and verify only. No new features, no unrelated refactors.

## Pre-audit findings (already inspected)

Spot-checked the "suspicious" patterns called out in the request against the current files. All cases below are **valid TypeScript** as written — they look malformed only when rendered without the `*` / underscore separators in chat:

| Reported pattern | Actual code | Verdict |
|---|---|---|
| `60 26` | `60 * 26` in `_shared/foundationThresholds.ts:11-15` | OK |
| `10 60_000` | `60_000` numeric separators (Inspector + Dashboard + alerts fn) | OK |
| `ageMin > maxAge ALERT...` | `ageMin > maxAge * ALERT.HEARTBEAT_MISSING_CRIT_RATIO` | OK |
| `Record = {}` | `Record<string, CronBeat \| undefined>` etc. | OK |
| `/ never block /` | normal `// comment` lines | need full re-grep to confirm |

So the audit needs a full sweep, not just these spot fixes.

## Step 1 — Full malformed-patch sweep

Grep across only the Phase H/I touched files:

```
src/lib/foundationThresholds.ts
src/lib/__tests__/foundation*.test.ts
src/pages/owner/FoundationHealthDashboard.tsx
src/pages/owner/FoundationTraceInspector.tsx
supabase/functions/_shared/foundationThresholds.ts
supabase/functions/_shared/notificationAdapters.ts
supabase/functions/foundation-health-alerts/index.ts
supabase/functions/foundation-alert-retention/index.ts
supabase/functions/foundations-replay/index.ts
```

Patterns scanned:
- `\b\d+\s+\d+\b` (missing operator between numbers)
- `>\s*=|<\s*=` with stray space, `&\s&`, `\|\s\|`
- `Record\s*=`, `Promise\s*=`, `<\s*>` empty generics
- Unbalanced JSX: `rg "<[A-Z]\w*[^/>]*$"` per file → manual eyeball
- Stray `/ ... /` where `// ...` intended
- `return new Response\("` followed by `}` mid-string
- Duplicate `import` lines per file (`rg "^import" | sort | uniq -d`)
- TS inference holes: run `tsc --noEmit` (harness already runs build)

Any hit → minimal in-place fix via `code--line_replace`. No reformatting.

## Step 2 — Verification commands

Run, in order, capturing pass/fail:

1. `bunx tsc --noEmit` — full TS check
2. Harness build (auto)
3. `bunx vitest run src/lib/__tests__/foundation*.test.ts` — Phase I suites
4. `supabase--test_edge_functions` for `foundation-health-alerts`, `foundation-alert-retention`, `foundations-replay`
5. `supabase--deploy_edge_functions` for the three above → confirms bundle compiles in edge runtime
6. Lint touched files only: `bunx eslint <file list above>`

## Step 3 — Production-safety re-check (read-only)

For each item, point to the line that proves it:

- Bounded queries: `.limit(...)` on every `.from(...).select` in dashboard / inspector / alerts fn
- Indexes back new queries: `supabase--read_query` on `pg_indexes` for `foundation_health_alerts` and `foundation_replay_outcomes`
- Retention guard: `.not('resolved_at','is',null).lt('resolved_at', cutoff)` in `foundation-alert-retention/index.ts`
- Replay outcome insert non-blocking: `try { … } catch { console.error }`, no `throw`, no `await` blocking response
- No duplicate open alerts: `uq_fha_open_key` partial unique index still present
- Notification dispatch non-blocking: wrapped in `Promise.allSettled` / try-catch, flag-gated
- Empty-dataset render: dashboard guards (`?? 0`, `(arr ?? []).map`) — eyeball
- Divide-by-zero in drift: `total === 0 ? 0 : mismatched/total`

Any gap → minimal fix.

## Step 4 — Live verification

Use `supabase--curl_edge_functions`:
- `POST /foundation-health-alerts` `{}` → expect `{ok:true, evaluated:[…]}`, no `replay_mismatch_high` fired on empty data
- `POST /foundation-alert-retention` `{}` → expect `{ok:true, deleted:0}` on a fresh env
- `supabase--read_query`: confirm a heartbeat row was written for each new cron function name
- Auto-resolve lifecycle: insert a synthetic alert via `supabase--insert`, run alerter, confirm `resolved_at` set when condition clears

## Step 5 — Output

Final report contains ONLY:
1. Exact fixes applied (file + line + before/after) — empty list if none
2. Remaining compile/runtime errors — empty list if none
3. Exact commands run + pass/fail
4. Final regression status (X/Y suites green)
5. Remaining risks (carry-overs from Phase H report only; no new ones)

## Out of scope

No feature work, no UX changes, no threshold tuning, no notification activation, no schema changes beyond what already shipped in Phase I migrations.
