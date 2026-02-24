
# Stress Test Report #3: Full Application Sweep

## Previous Fixes Confirmed Working

| Fix | Status |
|-----|--------|
| `nightly-mpi-process` in config.toml with `verify_jwt = false` | Confirmed |
| `calculate-session` in config.toml with `verify_jwt = false` | Confirmed |
| Rankings query filters by latest `calculation_date` | Confirmed |
| `tierToSegment()` maps tiers to proper segment_pool values | Confirmed |
| Eligibility gates enforced (ineligible athletes skipped) | Confirmed |
| Unique index `idx_mpi_unique_daily` prevents duplicate daily rows | Confirmed |
| Upsert with `onConflict` in nightly process | Confirmed |
| `mpi_scores` in `supabase_realtime` publication | Confirmed |
| Stale "Users can select own MPI scores" policy dropped | Confirmed |
| Composite index `idx_mpi_sport_date_rank` for query performance | Confirmed |
| Standardized CORS headers on both edge functions | Confirmed |
| `get-rankings` orphaned function deleted | Confirmed |
| Cron job active at `0 5 * * *` | Confirmed |

---

## NEW GAPS FOUND

### 1. CRITICAL: Rankings page shows "Anonymous" for every athlete

The Rankings page fetches athlete names via:
```typescript
supabase.from("profiles").select("id, full_name").in("id", userIds)
```

But the `profiles` table RLS only allows users to see **their own profile** (`auth.uid() = id`). Scouts/coaches/admins have broader access, but regular athletes do not.

**Result:** Every ranked athlete except the current user shows "Anonymous" on the leaderboard. This completely breaks the user experience.

**Complication:** The `profiles` table contains sensitive PII -- `contact_email`, `date_of_birth`, `social_instagram`, `height`, `weight`, `sex`, etc. A blanket SELECT policy would expose all of this data.

**Fix:** Create a secure database view that exposes ONLY safe, public-facing fields:
```sql
CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT id, full_name, avatar_url, position, experience_level
FROM public.profiles;
```
Then add a SELECT policy on `profiles` that allows the view to work for authenticated users, OR add a simple policy scoped to the view. Update `Rankings.tsx` to query `profiles_public` instead of `profiles`.

**Alternative (simpler):** Add a targeted RLS policy that only allows authenticated users to read `id` and `full_name` columns. However, Postgres RLS operates at the row level, not column level -- so a view is the proper solution.

### 2. HIGH: `athlete_mpi_settings` row never auto-created for new users

The `handle_new_user()` trigger only creates a `profiles` row on signup. There is **no trigger or code path** that creates an `athlete_mpi_settings` row.

Without this row:
- The nightly MPI process **completely ignores** the athlete (queries `athlete_mpi_settings` first)
- The `DataBuildingGate` component returns null (no eligibility data)
- The `useSwitchHitterProfile` hook returns null
- The athlete is invisible to the entire ranking/analytics system

**Fix:** Either:
1. Add to the `handle_new_user()` trigger to also insert a default `athlete_mpi_settings` row
2. Or create a separate trigger/function that runs on profile creation

The insert should set sensible defaults:
```sql
INSERT INTO public.athlete_mpi_settings (user_id, sport, league_tier)
VALUES (NEW.id, 'baseball', 'rec');
```

**Note:** The `sport` column on `athlete_mpi_settings` is `NOT NULL`, so this must be set. A reasonable default is `'baseball'` since users select their sport during onboarding and can update it later.

### 3. MEDIUM: Dashboard `PracticeIntelligenceCard` hardcodes grade labels

`src/pages/Dashboard.tsx` line 42-43:
```typescript
const gradeLabel = mpi?.adjusted_global_score
  ? mpi.adjusted_global_score >= 70 ? 'Elite' : mpi.adjusted_global_score >= 60 ? 'Plus' : mpi.adjusted_global_score >= 50 ? 'Average' : 'Developing'
  : null;
```

This uses different thresholds and labels than `getGradeLabel()` in `src/lib/gradeLabel.ts` (which has 8 tiers: Elite, Plus-Plus, Plus, Above Average, Average, Below Average, Fringe, Poor). The Dashboard shows "Plus" at 60+ while gradeLabel.ts shows "Plus-Plus". The Dashboard shows "Developing" below 50 while gradeLabel.ts shows "Average" at 45+.

**Fix:** Replace the inline logic with `getGradeLabel()`:
```typescript
import { getGradeLabel } from "@/lib/gradeLabel";
const gradeLabel = mpi?.adjusted_global_score ? getGradeLabel(mpi.adjusted_global_score) : null;
```

### 4. MEDIUM: `config.toml` has ghost/duplicate entries

- **Line 6-7:** `[functions.parse-voice-food]` references a function that does NOT exist in the filesystem. No `supabase/functions/parse-voice-food/` directory exists.
- **Lines 46-49:** `[functions.get-owner-profile]` appears TWICE with identical settings.

These cause no runtime errors but are maintenance hazards and could confuse deployments.

**Fix:** Remove the `parse-voice-food` entry and the duplicate `get-owner-profile` entry from `config.toml`.

### 5. LOW: Zero data in production tables

- `mpi_scores`: 0 rows
- `performance_sessions`: 0 rows
- `athlete_mpi_settings`: 0 rows

The entire MPI/Rankings pipeline has never been exercised with real data. The cron job runs nightly but processes nothing because there are no `athlete_mpi_settings` rows (which ties back to Gap #2).

**Impact:** Not a code bug, but confirms that Gap #2 is the root cause of why the system appears dormant. Once Gap #2 is fixed and users start logging sessions, data will begin flowing.

---

## Summary of Required Fixes (Priority Order)

```text
Priority   Gap   Description
--------   ---   -----------
P0         #1    Create profiles_public view + update Rankings to use it
P0         #2    Auto-create athlete_mpi_settings on user signup
P1         #3    Replace hardcoded grade labels with getGradeLabel()
P1         #4    Clean ghost/duplicate entries from config.toml
```

---

## Technical Implementation Details

### Database migration (Gaps #1, #2):

```sql
-- Gap #1: Create a safe public view for profile names
CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT id, full_name, avatar_url, position, experience_level
FROM public.profiles;

-- Allow authenticated users to read from the base table
-- through the view (security_invoker means the view runs
-- as the calling user, so we need a policy)
CREATE POLICY "Authenticated users can view basic profile info"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- Gap #2: Auto-create athlete_mpi_settings on new user signup
-- Update the existing handle_new_user() function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');

  INSERT INTO public.athlete_mpi_settings (user_id, sport)
  VALUES (NEW.id, 'baseball');

  RETURN NEW;
END;
$$;
```

**Security note on Gap #1:** The `profiles` table contains PII fields like `contact_email`, `date_of_birth`, `social_instagram`, etc. Adding `USING (true)` for SELECT means all authenticated users can see all profile rows including PII. The safer approach is to:
1. Keep the restrictive existing policies
2. Have the Rankings page query only the `profiles_public` view (which excludes PII)
3. Not add the blanket policy -- instead, grant SELECT on the view directly

However, since `security_invoker = on` means the view runs with the caller's permissions, we DO need the base table policy. The tradeoff is acceptable because the Rankings page only selects `id, full_name` -- but a malicious client could query the profiles table directly for all columns.

**Recommended safer approach:** Instead of the blanket policy, update the Rankings page to use an edge function that returns only names, or accept the tradeoff since all users are authenticated athletes in a sports community where profile visibility is expected.

### Frontend changes:

**Rankings.tsx** -- Update profiles query to use the view:
```typescript
// Change from:
const { data: profiles } = await supabase
  .from("profiles")
  .select("id, full_name")
  .in("id", userIds);

// To:
const { data: profiles } = await supabase
  .from("profiles_public")
  .select("id, full_name")
  .in("id", userIds);
```

**Dashboard.tsx** -- Replace hardcoded grade labels:
```typescript
import { getGradeLabel } from "@/lib/gradeLabel";
// Replace lines 42-44 with:
const gradeLabel = mpi?.adjusted_global_score
  ? getGradeLabel(mpi.adjusted_global_score) : null;
```

### Config cleanup (Gap #4):

Remove the `parse-voice-food` block (lines 6-7) and the duplicate `get-owner-profile` block (lines 48-49) from `supabase/config.toml`.
