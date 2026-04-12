

# Weekly Performance Snapshot for Baserunning IQ

## Summary
Add a "Your Last 7 Days" stats card below the DailyDecision section on the main page, using data already computed in `useBaserunningDaily` (accuracy, total, avgTime, streak). Add an auto-generated insight line based on accuracy + speed.

## New Component: `src/components/baserunning-iq/WeeklySnapshot.tsx`

Card with:
- Title: "Your Last 7 Days"
- 4-stat grid: Accuracy %, Total Decisions, Avg Response Time, Current Streak
- Insight line below stats — dynamically chosen from accuracy + avgTime thresholds:
  - accuracy >= 80 && avgTime < 5000ms: "You're reacting faster than most players — elite instincts forming"
  - accuracy >= 80: "Strong reads — now work on speeding up your decisions"
  - accuracy >= 50: "You're guessing — slow down and read the play earlier"
  - else: "Focus on the fundamentals — review lessons before your next session"
- Only renders when `stats.total > 0` (skip for brand-new users)

## Modified: `src/pages/BaserunningIQ.tsx`

- Import and render `<WeeklySnapshot>` below `<DailyDecision>`, passing `stats` and `streak` from `useBaserunningDaily`

## Files

| File | Action |
|------|--------|
| `src/components/baserunning-iq/WeeklySnapshot.tsx` | New |
| `src/pages/BaserunningIQ.tsx` | Add WeeklySnapshot below DailyDecision |

No database changes. All data already available from `useBaserunningDaily` hook's `stats` object and `streak`.

