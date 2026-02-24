

# Stress Test Report #2: Post-Fix Audit

## Previous Fixes Confirmed Working

| Fix | Status |
|-----|--------|
| `nightly-mpi-process` in config.toml with `verify_jwt = false` | Confirmed (line 156-157) |
| `calculate-session` in config.toml with `verify_jwt = false` | Confirmed (line 159-160) |
| Rankings query filters by latest `calculation_date` | Confirmed (lines 38-53) |
| CORS headers standardized on both edge functions | Confirmed |
| `get-rankings` edge function deleted | Confirmed |
| New RLS policy "Authenticated users can view all rankings" | Confirmed (USING true) |
| Cron job active at `0 5 * * *` | Confirmed (jobid=5) |

---

## NEW GAPS FOUND

### 1. CRITICAL: Segment filter is completely broken

The `RankingsFilters` component lets users filter by "youth", "hs", "college", "pro" using:
```
.ilike("segment_pool", "%youth%")
```

But the nightly process **hardcodes** `segment_pool` to `"baseball_general"` or `"softball_general"` for every single athlete (line 180). The filter values "youth", "hs", "college", "pro" will **never match** -- every segment filter returns zero results except "all".

**Fix:** Map `league_tier` to a proper segment in the nightly process:
- rec, travel -> "youth"
- hs_jv, hs_varsity -> "hs"
- college_d3, college_d2, college_d1 -> "college"
- indie_pro, milb, mlb, ausl -> "pro"

Set `segment_pool` to e.g. `"baseball_youth"` or `"softball_college"` instead of `"_general"`.

### 2. HIGH: Realtime subscription will never fire

The Rankings page subscribes to realtime changes on `mpi_scores` (line 148-161), but `mpi_scores` is **NOT** added to the `supabase_realtime` publication. The channel subscribes but will never receive events.

**Fix:** Run:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.mpi_scores;
```

### 3. HIGH: No unique constraint prevents duplicate daily MPI rows

If the nightly cron runs twice on the same day (manual trigger, retry, etc.), it will insert **duplicate rows** for the same user+sport+date. There's no unique constraint on `(user_id, sport, calculation_date)`. This corrupts rankings with double-counted athletes.

**Fix:** Add a unique index:
```sql
CREATE UNIQUE INDEX idx_mpi_unique_daily
ON public.mpi_scores (user_id, sport, calculation_date);
```
And use `UPSERT` in the nightly process instead of plain `INSERT`.

### 4. MEDIUM: Stale "Users can select own MPI scores" policy still exists

The migration dropped and recreated the RLS policy, but there are now **two** SELECT policies on `mpi_scores`:
- "Authenticated users can view all rankings" (USING true) -- new
- "Users can select own MPI scores" (USING auth.uid()=user_id OR admin) -- old, never dropped

The old policy is dead weight since the new permissive one already grants access. It should be cleaned up to avoid confusion.

**Fix:** Drop the old policy:
```sql
DROP POLICY IF EXISTS "Users can select own MPI scores" ON public.mpi_scores;
```

### 5. MEDIUM: Nightly process ranks ALL athletes, ignoring eligibility gates

The process calculates `ranking_eligible` for each athlete (line 132) and stores it in `athlete_mpi_settings`, but then **ranks every athlete regardless** -- including those who fail the 60-session minimum, integrity threshold, or coach validation gates. This undermines the entire gate system.

**Fix:** After calculating gates, skip the athlete's score entry if `ranking_eligible` is false:
```typescript
if (!gatesUpdate.ranking_eligible) continue; // Skip ineligible athletes
```

### 6. LOW: Missing composite index for Rankings query performance

The Rankings page queries `WHERE sport = X AND calculation_date = Y ORDER BY global_rank`. The existing indexes are:
- `idx_mpi_sport_rank` = (sport, global_rank)
- `idx_mpi_user_date` = (user_id, calculation_date DESC)

Neither covers the actual query pattern. As data grows, this query will degrade.

**Fix:** Add a covering index:
```sql
CREATE INDEX idx_mpi_sport_date_rank
ON public.mpi_scores (sport, calculation_date, global_rank);
```

---

## Summary of Required Fixes (Priority Order)

```text
Priority   Gap   Description
--------   ---   -----------
P0         #1    Fix segment_pool mapping (broken filter = broken UI)
P0         #3    Add unique constraint + upsert to prevent duplicate daily rows
P1         #2    Enable realtime publication on mpi_scores
P1         #5    Skip ranking-ineligible athletes in nightly process
P2         #4    Drop stale RLS policy
P2         #6    Add composite index for query performance
```

## Technical Implementation

### Database migration (gaps #2, #3, #4, #6):
```sql
-- Drop stale policy
DROP POLICY IF EXISTS "Users can select own MPI scores" ON public.mpi_scores;

-- Prevent duplicate daily entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_mpi_unique_daily
ON public.mpi_scores (user_id, sport, calculation_date);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.mpi_scores;

-- Add performance index
CREATE INDEX IF NOT EXISTS idx_mpi_sport_date_rank
ON public.mpi_scores (sport, calculation_date, global_rank);
```

### Edge function update -- `nightly-mpi-process/index.ts` (gaps #1, #3, #5):

1. Add tier-to-segment mapping function:
```typescript
function tierToSegment(tier: string): string {
  if (['rec', 'travel'].includes(tier)) return 'youth';
  if (['hs_jv', 'hs_varsity'].includes(tier)) return 'hs';
  if (['college_d3', 'college_d2', 'college_d1'].includes(tier)) return 'college';
  if (['indie_pro', 'milb', 'mlb', 'ausl'].includes(tier)) return 'pro';
  return 'general';
}
```

2. Store segment per athlete alongside their score, then use `${sport}_${segment}` as `segment_pool`.

3. After calculating eligibility gates, skip ineligible athletes from the ranking pool.

4. Change `.insert()` to `.upsert()` with `onConflict: 'user_id,sport,calculation_date'` to prevent duplicates on re-runs.

