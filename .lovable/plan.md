

# Add Player Substitution Mid-Game in Live Scorebook

## Overview

Add a substitution system to the LiveScorebook that lets coaches swap players in/out during a game. A substituted player's row stays in the scorebook (showing their stats up to the sub), and the replacement takes their batting order spot going forward.

## Design

- Each lineup slot tracks a history of players (original + substitutes) so the scorebook can display both the original and the sub in the correct batting order position
- A "Substitute" button on each player row opens a dialog to pick a replacement from the bench (players from the coach's player pool not currently in the active lineup, plus manual entry)
- Substituted players are visually distinguished (dimmed/strikethrough) and the new player appears below them in the same batting order slot
- The `currentBatterIndex` logic uses the **active lineup** (latest player in each slot) to determine who bats next

## Changes

### 1. New component: `src/components/game-scoring/SubstitutionDialog.tsx`
- Dialog with player search (reuses `useCoachPlayerPool`) + manual name entry
- Shows bench players (pool players not in active lineup)
- On confirm, returns the replacement player info + position
- Records the inning/half of substitution

### 2. Update: `src/components/game-scoring/LiveScorebook.tsx`
- Add `activeLineup` state: `LineupPlayer[]` initialized from `lineup` prop — mutable version that tracks current players in each batting order slot
- Add `substitutions` state: array of `{ slot: number, outPlayer: LineupPlayer, inPlayer: LineupPlayer, inning: number, half: string }`
- Add a substitute button (icon) on each player row in the scorebook table
- On substitution: update `activeLineup[slot]` to the new player, push to `substitutions` array
- Scorebook grid renders both the subbed-out player (dimmed, with stats up to that point) and the sub (active) in the same slot
- `currentBatter` uses `activeLineup` instead of `lineup`
- Pitcher selector also includes substituted-in players
- Pass `activeLineup` to `AtBatPanel` for batter name

### 3. Update: `src/hooks/useGameScoring.ts`
- Add optional `substituted_at_inning?: number` and `replaced_by?: string` to `LineupPlayer` for tracking

## Scorebook Display

```text
Batting Order | Batter          | Pos | 1  | 2  | 3  | ...
1             | John (subbed)   | SS  | 1B | GO |    |
              | → Mike          | SS  |    |    | 2B |
2             | Sarah           | CF  | K  | BB | HR |
```

Subbed-out players show a dimmed row with their pre-sub results. The replacement appears indented below in the same slot.

## Files

| File | Action |
|------|--------|
| `src/components/game-scoring/SubstitutionDialog.tsx` | Create — dialog to pick replacement player |
| `src/components/game-scoring/LiveScorebook.tsx` | Update — activeLineup state, sub button, dual-row rendering |
| `src/hooks/useGameScoring.ts` | Update — add substitution fields to LineupPlayer |

