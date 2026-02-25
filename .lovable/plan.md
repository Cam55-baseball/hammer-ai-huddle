

# Stress Test Report #4: Extreme Full-App Audit

## All Previous Fixes Verified Working

| Fix | Status |
|-----|--------|
| `nightly-mpi-process` in config.toml `verify_jwt = false` | Confirmed (line 150-151) |
| `calculate-session` in config.toml `verify_jwt = false` | Confirmed (line 153-154) |
| Rankings query filters by latest `calculation_date` | Confirmed (lines 38-53) |
| `tierToSegment()` maps tiers to proper segment_pool values | Confirmed (lines 9-15) |
| Eligibility gates enforced (ineligible athletes skipped) | Confirmed (line 134) |
| Unique index `idx_mpi_unique_daily` on (user_id, sport, calculation_date) | Confirmed |
| Upsert with `onConflict` in nightly process | Confirmed (line 201) |
| `mpi_scores` in `supabase_realtime` publication | Confirmed |
| Composite index `idx_mpi_sport_date_rank` | Confirmed |
| `profiles_public` view with `security_invoker = on` | Confirmed |
| Rankings fetches names from `profiles_public` | Confirmed (line 86) |
| `handle_new_user()` creates `athlete_mpi_settings` row | Confirmed |
| Dashboard uses `getGradeLabel()` | Confirmed (line 44) |
| Cron job active at `0 5 * * *` | Confirmed (jobid 5) |
| `on_auth_user_created` trigger on `auth.users` | Confirmed |
| MPI weight formula sums to 1.0 (0.25+0.15+0.2+0.2+0.2) | Confirmed |

---

## NEW GAPS FOUND

### 1. CRITICAL (Security): `profiles` table PII fully exposed to all authenticated users

The migration added `"Authenticated users can view basic profile info" USING (true)` as a SELECT policy on the **base `profiles` table**. This means any authenticated user can query the base table directly and read ALL 50 columns, including:

- `contact_email`, `date_of_birth`, `sex`
- `height`, `weight`, `height_inches`
- `social_instagram`, `social_twitter`, `social_tiktok`, `social_facebook`
- `state`, `team_affiliation`, `graduation_year`
- `is_professional`, `is_free_agent`, `mlb_affiliate`

The `profiles_public` view only exposes 5 safe columns, but the blanket base-table policy makes the view's protection meaningless -- a malicious user can bypass it entirely by querying `profiles` directly.

**Fix:** Replace the blanket `USING (true)` policy with a narrowly-scoped RLS that only allows users to read their own row, while using a `SECURITY DEFINER` function-based approach for the public view. The cleanest solution:

1. Drop the blanket policy: `DROP POLICY "Authenticated users can view basic profile info" ON public.profiles;`
2. Recreate `profiles_public` as a `SECURITY DEFINER` view (not `security_invoker`), or create a `SECURITY DEFINER` function that returns the limited columns
3. Grant `SELECT` on the view to `authenticated` role directly

**Alternatively** (simpler, still secure): Change the view to NOT use `security_invoker` (remove the option), which makes it run as the view owner (postgres/superuser), bypassing RLS on the base table. Then the base table's restrictive policies remain intact.

```sql
-- Drop the dangerous blanket policy
DROP POLICY "Authenticated users can view basic profile info" ON public.profiles;

-- Recreate view WITHOUT security_invoker (runs as definer/owner, bypasses RLS)
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public AS
SELECT id, full_name, avatar_url, position, experience_level
FROM public.profiles;

-- Grant access to authenticated users on the view
GRANT SELECT ON public.profiles_public TO authenticated;
```

This way the base `profiles` table retains its restrictive RLS (own row + admin/owner/scout policies) while the view safely exposes only 5 columns.

### 2. HIGH: 7 edge functions exist in filesystem but missing from config.toml

These functions have code in `supabase/functions/` but no entry in `config.toml`:

| Function | Status |
|----------|--------|
| `approve-scout-application` | Missing from config |
| `delete-library-session` | Missing from config |
| `download-session-video` | Missing from config |
| `get-player-library` | Missing from config |
| `migrate-to-tiers` | Missing from config |
| `unfollow-player` | Missing from config |
| `update-library-session` | Missing from config |

All of these are called from the frontend with user JWTs. Per the signing-keys system, the default `verify_jwt = true` is deprecated and may cause auth failures. Each should have `verify_jwt = false` with in-code JWT validation.

**Fix:** Add all 7 to `config.toml` with appropriate `verify_jwt` settings. Functions that validate JWT in code should use `verify_jwt = false`. The `migrate-to-tiers` function (one-time migration utility) should also be set to `false` or removed if no longer needed.

### 3. HIGH: `governance_flags` has no INSERT policy for authenticated users

The `calculate-session` edge function inserts governance flags using the **service role key**, which bypasses RLS. This works. However, there is no INSERT policy for regular authenticated users on `governance_flags` -- only:
- `Admins can manage all flags` (ALL for admins)
- `Users can select own flags` (SELECT only)

If any future code path tries to insert flags from the client side (not through the edge function), it will silently fail. This is currently safe because the only insert path uses service role, but it's fragile.

**Fix (Low priority):** Add an INSERT policy:
```sql
CREATE POLICY "System can insert flags for users"
ON public.governance_flags FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
```

### 4. MEDIUM: `OwnerDashboard` queries `profiles` directly -- will now expose all PII

`OwnerDashboard.tsx` line 88:
```typescript
supabase.from("profiles").select("id, full_name, created_at")
```

This query goes through the blanket `USING (true)` policy. Once we fix Gap #1 by removing that policy, the Owner Dashboard will break -- it will only return the owner's own profile row.

**Fix:** The Owner Dashboard should use the admin/owner-specific policies that already exist. Since the owner already has `"Owners can view all profiles" USING (has_role(auth.uid(), 'owner'))`, this query will continue to work for owners after the blanket policy is removed. No code change needed -- just verify the owner-specific policies remain.

### 5. MEDIUM: Nightly MPI process has O(N) database calls per athlete (performance risk)

For each athlete, the nightly process makes:
- 1 query for sessions (per athlete)
- 1 query for governance flags (per athlete)
- 1 update for eligibility gates (per athlete)
- 1 query for previous MPI score (per ranked athlete)
- 1 upsert for new MPI score (per ranked athlete)

With 1,000 athletes, that is 5,000+ database calls in a single edge function invocation. Edge functions have a 150-second timeout. At ~50ms per call, 5,000 calls = 250 seconds, which exceeds the timeout.

**Fix (Future optimization):** This is not broken today (0 athletes), but will become a problem at scale. Solutions include:
- Batch queries using `.in('user_id', userIds)` instead of per-athlete loops
- Move the entire calculation into a Postgres function (single transaction)
- Split into batches of 100 athletes per invocation

No immediate code change required, but flag for when the user base grows past ~500 athletes.

### 6. LOW: Stale `user_progress` table still queried on Dashboard

`Dashboard.tsx` line 224-226:
```typescript
const progressResponse = await supabase
  .from("user_progress")
  .select("*")
  .eq("user_id", user!.id);
```

The `user_progress` table is the **old** ranking/progress system. The new system uses `mpi_scores` and `performance_sessions`. The Dashboard still queries this legacy table for module progress display (efficiency scores). This isn't broken -- the table still exists and has data -- but it creates confusion about which system is authoritative.

**Impact:** Low. The Dashboard uses this for per-module efficiency scores (hitting %, pitching %), which are separate from the MPI system. No fix needed unless unifying these systems.

---

## Summary of Required Fixes (Priority Order)

```text
Priority   Gap   Description
--------   ---   -----------
P0         #1    Remove blanket profiles RLS policy + fix profiles_public view
P1         #2    Add 7 missing edge functions to config.toml
P2         #3    Add governance_flags INSERT policy for resilience
P2         #4    Verify OwnerDashboard works after profiles fix (no code change)
P3         #5    Flag nightly MPI scaling concern (no immediate fix)
P3         #6    Document user_progress as legacy system
```

---

## Technical Implementation

### Database Migration (Gap #1 -- P0 Critical Security Fix):

```sql
-- 1. Drop the dangerous blanket SELECT policy that exposes all PII
DROP POLICY IF EXISTS "Authenticated users can view basic profile info" ON public.profiles;

-- 2. Recreate profiles_public WITHOUT security_invoker
--    This makes the view run as the owner (superuser), bypassing base table RLS
--    while only exposing the 5 safe columns
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public AS
SELECT id, full_name, avatar_url, position, experience_level
FROM public.profiles;

-- 3. Grant authenticated users SELECT on the view only
GRANT SELECT ON public.profiles_public TO authenticated;

-- 4. Add governance_flags INSERT policy (Gap #3)
CREATE POLICY "Users can insert own governance flags"
ON public.governance_flags FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
```

**Security verification after migration:**
- Regular user queries `profiles` directly -> gets only own row (existing `"Users can view their own profile"` policy)
- Regular user queries `profiles_public` -> gets all rows but ONLY id, full_name, avatar_url, position, experience_level
- Owner queries `profiles` -> gets all rows (existing `"Owners can view all profiles"` policy)
- Admin queries `profiles` -> gets all rows (existing `"Admins can view all profiles"` policy)

### Config.toml Update (Gap #2):

Add these entries:
```toml
[functions.approve-scout-application]
verify_jwt = false

[functions.delete-library-session]
verify_jwt = false

[functions.download-session-video]
verify_jwt = false

[functions.get-player-library]
verify_jwt = false

[functions.migrate-to-tiers]
verify_jwt = false

[functions.unfollow-player]
verify_jwt = false

[functions.update-library-session]
verify_jwt = false
```

### No Frontend Changes Required

All existing frontend queries will continue to work:
- `Rankings.tsx` queries `profiles_public` (view) -- still works via GRANT
- `OwnerDashboard.tsx` queries `profiles` -- still works via owner RLS policy
- `DashboardLayout.tsx` queries own profile -- still works via own-row policy
- `TutorialModal.tsx` updates own profile -- still works via own-row update policy

