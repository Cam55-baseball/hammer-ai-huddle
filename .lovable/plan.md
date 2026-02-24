

# Stress Test Report: Full Implementation Audit

## VERDICT: Core plan is complete, but there are 7 specific gaps/risks that need fixing

---

## What's Confirmed Working

| Item | Status |
|------|--------|
| 31 UI components (splits, micro-layer, professional, organization, authority, practice) | All files present |
| Rankings page rewritten against `mpi_scores` table | Confirmed |
| RankingsTable with sport tabs, segment filters, Your Rank card | Confirmed |
| `gradeLabel.ts` utility | Confirmed |
| i18n `rankings` keys in en.json | Confirmed (all keys present) |
| i18n `sportTerms` namespace in all 8 locales | Confirmed |
| `mpi_scores`, `athlete_mpi_settings`, `governance_flags`, `performance_sessions` tables | All exist in schema |
| RLS enabled on all 4 core tables | Confirmed |
| `pg_cron` job active: `0 5 * * *` calling `nightly-mpi-process` | Confirmed (jobid=5, active=true) |
| `calculate-session` edge function called from `usePerformanceSession` hook | Confirmed |
| Governance flag creation on inflated grading + volume spike | Confirmed in calculate-session |

---

## GAPS AND RISKS FOUND

### 1. CRITICAL: `nightly-mpi-process` missing from `config.toml`
The edge function exists at `supabase/functions/nightly-mpi-process/index.ts` but has **no entry** in `supabase/config.toml`. Without a config entry, the default `verify_jwt = true` applies. The cron job calls it with the **anon key**, which is NOT a user JWT -- it will be **rejected at the gateway** with a 401 error.

**Fix:** Add `[functions.nightly-mpi-process]` with `verify_jwt = false` to `config.toml`.

### 2. CRITICAL: `calculate-session` also missing from `config.toml`
Same issue -- no config entry means `verify_jwt = true` by default. The function does use a proper user JWT so it *should* work, but the missing config entry is inconsistent and could cause issues if the signing-keys system requires explicit `verify_jwt = false` as documented.

**Fix:** Add `[functions.calculate-session]` with `verify_jwt = false` to `config.toml` and validate JWT in code (it already does).

### 3. HIGH: `mpi_scores` RLS blocks Rankings page from working
The Rankings page queries `mpi_scores` directly from the client with `.eq("sport", selectedSport).order("global_rank")`, but the **only SELECT policy** on `mpi_scores` is:
```
(auth.uid() = user_id) OR user_has_role(auth.uid(), 'admin')
```
This means **a regular athlete can only see their own score** -- the Top 100 leaderboard will return at most 1 row for non-admin users. The entire Rankings page is effectively broken for normal users.

**Fix:** Add a public-read RLS policy for rankings display, e.g.:
```sql
CREATE POLICY "Anyone can view rankings" ON mpi_scores
FOR SELECT USING (true);
```
Or a more restrictive version that only exposes rank/score/sport columns via a database view.

### 4. MEDIUM: `get-rankings` edge function is orphaned/stale
The `supabase/functions/get-rankings/index.ts` queries `user_progress` table (the old ranking system), NOT `mpi_scores`. But the Rankings page no longer calls this function -- it queries `mpi_scores` directly. This function is dead code that could confuse future developers.

**Fix:** Either delete `get-rankings` edge function or update it to query `mpi_scores`.

### 5. MEDIUM: Rankings page fetches duplicate MPI snapshots
The query `mpi_scores` ordered by `global_rank` but does NOT filter by `calculation_date`. Since the nightly process inserts a **new row every night**, the query will return multiple entries per athlete (one per night), making the leaderboard show duplicates and wrong rankings.

**Fix:** Add a filter for the latest `calculation_date`:
```sql
.eq("calculation_date", latestDate)
```
Or use a subquery/view that only returns each athlete's most recent score.

### 6. LOW: CORS headers inconsistent across edge functions
- `nightly-mpi-process` and `calculate-session` use the **old/short** CORS headers:
  ```
  'authorization, x-client-info, apikey, content-type'
  ```
- The recommended CORS headers include additional `x-supabase-client-*` headers.
This can cause CORS failures on certain client configurations.

**Fix:** Update both functions to use the full recommended CORS header string.

### 7. LOW: Nightly MPI process uses `service_role_key` but called with anon key
The cron job sends an `Authorization: Bearer <anon_key>` header, but the function creates its Supabase client with `SUPABASE_SERVICE_ROLE_KEY` and ignores the auth header entirely. This works functionally (service role bypasses RLS), but the anon key in the Authorization header is meaningless -- it's only there to pass gateway JWT verification (which is currently blocked by gap #1).

No code fix needed beyond gap #1.

---

## Summary of Required Fixes (Priority Order)

```text
Priority   Gap   Description
--------   ---   -----------
P0         #1    Add nightly-mpi-process to config.toml with verify_jwt = false
P0         #3    Fix mpi_scores RLS to allow public read for rankings
P0         #5    Filter Rankings query to latest calculation_date only
P1         #2    Add calculate-session to config.toml with verify_jwt = false
P1         #4    Delete or update orphaned get-rankings edge function
P2         #6    Standardize CORS headers across all edge functions
```

Gaps #1, #3, and #5 are **showstoppers** -- the Rankings page will not work correctly until they are fixed. The cron job will silently fail every night (401), and even if it ran, the leaderboard would show duplicates and only the user's own score.
