

# Elite Game Scoring Engine — Runs Tracking & Opponent Scoring

## Problem
The score never updates because `teamScore` is calculated from `rbi` field values, but:
1. **Runs ≠ RBI.** A solo HR is 1 run scored, but the user entered 0 RBI. The system has no concept of "runs scored" — only manually entered RBI.
2. **No opponent scoring.** The top-of-inning panel is a dead-end "Switch to Bottom" button with no way to record opponent runs.
3. **No inning-by-inning linescore.** Elite scorebooks show R/H/E per half-inning and a running linescore across the top.

## Solution — Auto-Calculated Run Scoring + Opponent Runs + Linescore

### 1. Auto-calculate runs scored from outcome + base state (`LiveScorebook.tsx`)

In `handleAtBatComplete`, **before** clearing runners, compute runs scored from the at-bat outcome and current base state:

```text
HR  → batter + all runners on base = 1 + count(runners)
3B  → runners on 2nd + 3rd score  
2B  → runner on 3rd scores; runner on 2nd scores
1B  → runner on 3rd scores
SF  → runner on 3rd scores (1 out added)
Walk/HBP with bases loaded → runner on 3rd scores
```

Store runs per half-inning in local state: `inningRuns: Record<string, number>` keyed by `"T1"`, `"B1"`, `"T2"`, etc. This becomes the source of truth for the score display, replacing the RBI-based calculation.

Also auto-populate the RBI field on the play data to match (so downstream analytics are correct).

### 2. Add opponent run tracking per inning (`LiveScorebook.tsx`)

Replace the empty "Top of inning" card with a simple **opponent runs input** — a number stepper for how many runs the opponent scored that half-inning. When the user clicks "Record & Switch to Bottom", store the opponent runs in `inningRuns["T{inning}"]`.

### 3. Add linescore bar above the scorebook grid (`LiveScorebook.tsx`)

Display a traditional linescore row:

```text
         1   2   3   4   5   6   7  |  R   H   E
Team     0   1   0   3   —   —   —  |  4   6   1
Opp      0   0   2   —   —   —   —  |  2   3   0
```

Pull team runs from `inningRuns["B{i}"]`, opponent from `inningRuns["T{i}"]`. Hits from `batterStats`. Errors from plays with `at_bat_outcome === 'error'`.

### 4. Update `useGameAnalytics.ts` — `teamScore`

Change `teamScore` to accept and use the `inningRuns` map passed as a parameter (or keep it local to LiveScorebook). The score display on the status bar reads from `inningRuns` totals instead of summing RBI.

### 5. Score display in status bar

Replace the current `{teamScore.myRuns} - {teamScore.oppRuns}` with values derived from the `inningRuns` state. Show team names (not just numbers).

## Files Changed
- **`src/components/game-scoring/LiveScorebook.tsx`** — Core changes: runs auto-calc, inningRuns state, opponent scoring UI, linescore display, status bar update
- **`src/hooks/useGameAnalytics.ts`** — Minor: keep teamScore but it becomes secondary to the live inningRuns tracking

## What Makes This Elite
- Runs are **auto-calculated** from game state — no manual entry errors
- Traditional **linescore** visible at all times
- **Opponent scoring** per half-inning (how real scorekeepers work)
- RBI auto-populated correctly on plays for analytics
- Score always in sync with what actually happened on the field

