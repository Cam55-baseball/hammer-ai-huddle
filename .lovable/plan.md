

# Add Out Tracking to Opponent Scoring Panel

## Problem
When the user's team is the **away** team, they bat in the top half. During the bottom half (opponent batting), the `OpponentScoringPanel` only allows recording R/H/E and immediately switching — there's no way to track outs. The coach needs to record 3 outs before advancing to the next inning's top half.

## Solution
Add an **outs stepper** (0–3) to `OpponentScoringPanel`. The "Record & Switch" button only becomes enabled once 3 outs are reached, or the coach can override with a manual switch. This mirrors how a real scorebook works — you track outs during the opponent's half before flipping.

## Changes

| File | Change |
|------|--------|
| `src/components/game-scoring/OpponentScoringPanel.tsx` | Add an `outs` stepper (0–3, capped at 3). Show out dots visually. Pass outs count back via `onRecordAndSwitch`. Update button label to show outs progress. Allow recording at any time but highlight when 3 outs reached. |
| `src/components/game-scoring/LiveScorebook.tsx` | Update `handleOpponentRecordAndSwitch` signature to accept `outs` parameter. After recording, advance inning correctly (bottom ends → next inning top). Reset opponent panel state on half change. |

### OpponentScoringPanel Updates
- Add `outs` state (0–3) with stepper, styled prominently
- Visual out indicator dots (filled/empty circles)
- Button text: "Record & Switch" when outs = 3, otherwise "Record & Switch (X outs)"
- Reset runs/hits/errors/outs when panel mounts for a new inning

### LiveScorebook Updates  
- `handleOpponentRecordAndSwitch` receives outs count
- When opponent half ends (bottom for away team), advance to next inning top half correctly

