

# Daily Baserunning Decision System

## Summary
Add a daily challenge system to Baserunning IQ: 1–3 random scenarios per day, streak tracking, 7-day performance stats, and no-repeat logic within 7 days.

## 1. Database

### New table: `baserunning_daily_attempts`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default gen_random_uuid() |
| user_id | uuid NOT NULL | |
| scenario_id | uuid FK → baserunning_scenarios | ON DELETE CASCADE |
| correct | boolean NOT NULL | |
| response_time_ms | int NOT NULL | |
| created_at | timestamptz default now() | |

**RLS:** SELECT/INSERT for `auth.uid() = user_id`

**Index:** `(user_id, created_at DESC)` for streak/history queries

## 2. New Hook: `useBaserunningDaily.ts`

Handles all daily decision logic:
- **Fetch today's scenarios**: Query `baserunning_scenarios` filtered by sport, excluding scenario IDs the user attempted in the last 7 days, random order, limit 3
- **Submit attempt**: Insert into `baserunning_daily_attempts` with correctness + response time
- **Streak calculation**: Count consecutive days (backwards from today) where user has ≥1 attempt. Break = streak resets to 0
- **Last 7 days stats**: Accuracy % and avg response time from attempts in past 7 days
- **Today completed**: Check if user already has attempts today (skip challenge if so)

## 3. New Component: `DailyDecision.tsx`

Placed at TOP of `/baserunning-iq` page (above lesson list, only when no active lesson):

**Layout:**
- Header: "Today's Decision" with flame/streak icon
- Stats bar: Current streak | 7-day accuracy | Avg response time
- If not completed today: scenario card with timed answer buttons + instant feedback
- If completed today: summary card showing today's results with "Come back tomorrow"

**Interaction:**
- Timer starts when scenario appears (tracks response_time_ms)
- User selects answer → immediate feedback (correct/incorrect + explanation)
- After all scenarios done → save attempts, update streak display
- Uses existing `ScenarioBlock`-style answer UI for consistency

## 4. Page Integration

In `BaserunningIQ.tsx`, import and render `<DailyDecision />` above the lesson list when no active lesson is selected. Pass `sport` prop.

## 5. Files

| File | Action |
|------|--------|
| `supabase/migrations/` | New migration: table + RLS + index |
| `src/hooks/useBaserunningDaily.ts` | New: daily logic hook |
| `src/components/baserunning-iq/DailyDecision.tsx` | New: daily challenge UI |
| `src/pages/BaserunningIQ.tsx` | Edit: add DailyDecision above lessons |

## 6. No-Repeat Logic (SQL in hook)

```sql
-- Scenarios NOT attempted in last 7 days, filtered by sport
SELECT * FROM baserunning_scenarios
WHERE (sport = $sport OR sport = 'both')
  AND id NOT IN (
    SELECT scenario_id FROM baserunning_daily_attempts
    WHERE user_id = $uid AND created_at > now() - interval '7 days'
  )
ORDER BY random() LIMIT 3
```

Implemented via Supabase JS with `.not('id', 'in', recentIds)`.

## 7. Streak Calculation

Client-side: fetch all attempt dates for user, group by date, count consecutive days backwards from today. Cached via React Query with 5-min stale time.

