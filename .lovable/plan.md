

# Fix Single Player Game Scoring — Player vs Opponent Separation

## Root Cause Analysis

Three interconnected bugs in single player mode:

1. **"Playing against yourself"**: In `GameScoring.tsx` line 44, `startingPitcherName` looks up from the lineup — in single player mode the only lineup entry IS the user, so the pitcher becomes the user's own name. The scorebook then shows "Reagan Niederhaus vs Reagan Niederhaus."

2. **User appears in pitcher dropdown**: In `LiveScorebook.tsx` lines 137-140, `allPlayersForPitcher` is built from the lineup. In single player mode that's just the user. The pitcher selector (line 424-431) then shows only the user as an option.

3. **Opponent pitcher input does nothing visible**: The `AtBatPanel` opponent input (added previously) stores data in `situational_data` but never feeds back into the `pitcherName` displayed in the header or the `currentPitcher` state in `LiveScorebook`.

## Plan

### 1. Pass `gameMode` through to LiveScorebook

**File: `src/hooks/useGameScoring.ts`** — no change needed, `game_mode` already on `GameSetup`.

**File: `src/pages/GameScoring.tsx`** — pass `gameMode={gameData.game_mode}` and `playerPosition={gameData.lineup[0]?.position}` to `LiveScorebook`.

**File: `src/components/game-scoring/LiveScorebook.tsx`** — add `gameMode` and `playerPosition` to props interface.

### 2. Fix LiveScorebook for single player mode

**File: `src/components/game-scoring/LiveScorebook.tsx`**

When `gameMode === 'single_player'`:

- **Starting pitcher**: Initialize `currentPitcher` to `"Opponent Pitcher"` instead of the user's name (line 112).
- **Pitcher dropdown**: Replace the lineup-based dropdown with a text input so the user can type the opponent pitcher name directly. This replaces the `<Select>` at lines 424-431 with an `<Input>` when in single player mode.
- **Score header**: Already shows `{teamName} vs {opponentName}` — this is correct (team vs opponent team). No change needed.
- **AtBatPanel**: Pass `currentPitcher` as `pitcherName` — already happens. Once the pitcher input is a freeform text field, the AtBat header will correctly show "Reagan Niederhaus vs [opponent pitcher name]".

### 3. Remove redundant opponent input from AtBatPanel in single player mode

**File: `src/components/game-scoring/AtBatPanel.tsx`**

- The "Opponent Pitcher" / "Facing Hitter" input in AtBatPanel becomes redundant when the pitcher name is already set at the LiveScorebook level. Hide this input when the user's position is NOT 'P' (hitter mode) since the opponent pitcher is already captured by the sidebar input.
- For pitcher users (position = 'P'), the AtBatPanel shows "Facing Hitter" which should remain as-is since that's per-AB data.

### 4. Opponent memory integration with pitcher input

**File: `src/components/game-scoring/LiveScorebook.tsx`**

Add opponent pitcher autocomplete to the sidebar pitcher input (single player mode only):
- Fetch recent opponents from `game_opponents` table (type = 'pitcher')
- Show suggestions as the user types
- On game completion, upsert the pitcher name to `game_opponents`

### Files Modified

| File | Change |
|------|--------|
| `GameScoring.tsx` | Pass `gameMode` and `playerPosition` to LiveScorebook |
| `LiveScorebook.tsx` | Accept `gameMode`/`playerPosition` props; use text input for pitcher in single player mode; init pitcher to empty string; add opponent autocomplete |
| `AtBatPanel.tsx` | Hide opponent pitcher input when not needed (non-pitcher in single player mode since pitcher is set at scorebook level) |

No database changes required — `game_opponents` table already exists.

