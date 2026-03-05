

# Remove "Game" Session Type from Practice Hub

## Rationale

The Game Scoring module already exists at `/game-scoring` with its own setup form, live scorebook, play-by-play tracking, and game summary. Having "Game" as a practice session type creates architectural overlap and flow confusion. Game tracking belongs exclusively in Game Hub.

## Changes

### 1. `src/components/practice/SessionTypeSelector.tsx`
- Remove `{ id: 'game', ... }` from `sessionTypes` array
- Remove `Gamepad2` icon import

### 2. `src/components/practice/SchedulePracticeDialog.tsx`
- Remove `{ value: 'game', label: 'Game' }` from `SESSION_TYPES`
- Remove all `sessionType === 'game'` conditional blocks (opponent fields, team name auto-populate)
- Remove `GameSessionFields` import
- Remove `opponentName`, `opponentLevel`, `teamName` state variables and their usage in `handleSubmit`

### 3. `src/pages/PracticeHub.tsx`
- Change `isGameType` from `sessionType === 'game' || sessionType === 'live_abs'` to just `sessionType === 'live_abs'`
- Remove `GameSessionFields` import (opponent fields only needed for game type)
- Remove opponent name/level validation gate for game type in `handleSave`
- Remove opponent name/level from save payload (Live ABs are practice reps, not formal games)
- Remove `GameScorecard` import and its conditional rendering block (Live ABs use RepScorer, not GameScorecard)

### 4. `src/components/practice/RepSourceSelector.tsx`
- Remove `game: ['game']` from `VALID_HITTING_SOURCES`, `VALID_PITCHING_SOURCES`, `VALID_THROWING_SOURCES`
- Remove `'game'` from `REQUIRES_THROWER_HAND` and `REQUIRES_PITCH_TYPE` arrays
- Update `filterFlatSources` to remove game-type filtering logic

### 5. `src/components/practice/SessionConfigPanel.tsx`
- Remove `isGame` / `sessionType === 'game'` conditional rendering for `GameSessionFields`
- Remove related import

### 6. `src/components/coach/CoachScheduleDialog.tsx`
- Remove `game` from session type options
- Remove `GameSessionFields` import and conditional block

### 7. Game Hub Enhancement (Game Scoring module)
- **`src/components/game-scoring/GameSetupForm.tsx`**: Add a "Game Type" selector with options:
  - **Regular Season** (default)
  - **Intrasquad**
  - **Scrimmage**
  - **Showcase/Tournament**
- Store as `game_type` field on the game record
- Pass through to `useGameScoring.createGame()`

### Files Summary

| File | Action |
|------|--------|
| `SessionTypeSelector.tsx` | Remove `game` entry |
| `SchedulePracticeDialog.tsx` | Remove `game` type + opponent fields |
| `PracticeHub.tsx` | Remove game-specific logic, keep Live ABs as practice |
| `RepSourceSelector.tsx` | Remove `game` source maps |
| `SessionConfigPanel.tsx` | Remove game conditional |
| `CoachScheduleDialog.tsx` | Remove game option + fields |
| `GameSetupForm.tsx` | Add game type selector (Intrasquad/Scrimmage) |

