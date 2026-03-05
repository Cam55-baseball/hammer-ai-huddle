

# Game Hub: Fielding/Relay Logging, Field Diagram & Single Player Mode

## Overview
Four additions to the Game Hub: (1) Relay play type for infielders/outfielders with contextual questions, (2) Wall play evaluation for outfielders, (3) Interactive field position diagram, (4) Single-player game mode.

## 1. Fielding Play Type Expansion — SituationalPrompts.tsx

Currently the "Defensive Play" card in `SituationalPrompts.tsx` shows generic grading (first step, route, transfer, throw accuracy). We need to expand it with position-aware play type options.

**Changes to `AtBatPanel.tsx`:**
- Add a `fielderPosition` prop (or let the user select it in the defensive section) so the situational prompts know if an infielder or outfielder is involved.
- Pass position context down to `SituationalPrompts`.

**Changes to `SituationalPrompts.tsx`:**
- Inside the "Defensive Play" card (shown when `isInPlay`), add:
  - **Play Type selector** with position-aware options:
    - Infield: `Ground Ball`, `Line Drive`, `Pop Up`, `Bunt`, `Relay`
    - Outfield: `Fly Ball`, `Line Drive`, `Ground Ball`, `Wall Play`, `Relay`
  - When **Relay** selected (infield): show "Got to correct lineup spot for relay?" → Yes / No
  - When **Relay** selected (outfield): show "Hit cutoff?" → Complete / Incomplete / Elite
  - When **Wall Play** selected (outfield): show "Played ball off of the wall?" → Poor / Well / Elite
- All values stored in the existing `defensive_data` JSON object on the play.

## 2. Play Event Field Diagram — New Component

**New file: `src/components/game-scoring/FieldPositionDiagram.tsx`**
- Render an SVG baseball/softball diamond with outfield arc, foul lines, infield dirt, bases, and warning track.
- Sport-aware: softball uses shorter distances visually.
- Two draggable dots:
  - **Red dot** = player starting position
  - **Green dot** = ball reception point
- Use native pointer events for drag (no extra library needed — `onPointerDown/Move/Up`).
- Outputs `{ playerPos: {x, y}, ballPos: {x, y} }` as normalized 0-1 coordinates.
- Responsive: scales to container width, works on mobile.
- Marked as **optional** — wrapped in a collapsible "Add Play Diagram" toggle.

**Integration in `SituationalPrompts.tsx`:**
- Add the diagram inside the Defensive Play card as an optional expandable section.
- Store coordinates in `defensive_data.field_diagram`.

## 3. Single Player Game Mode — GameSetupForm.tsx & GameScoring.tsx

**Changes to `GameSetupForm.tsx`:**
- After the existing game details card, add a **Game Mode** selector: `Team Game` | `Single Player Game`.
- When `Single Player Game` is selected:
  - Hide the full lineup builder (roster search, sortable list, starting pitcher).
  - Show a single player name + position input (auto-filled from logged-in user's profile if available).
  - Add a **Game Type** sub-selector: `Real Game` | `Practice Game`.
  - Keep opponent name, team name, league level, distances, venue, date.
- On submit, create a 1-player lineup automatically with `batting_order: 1`.

**Changes to `GameSetup` interface in `useGameScoring.ts`:**
- Add optional `game_mode?: 'team' | 'single_player'` field.
- Add optional `is_practice_game?: boolean` field.
- These get stored in the `games` table (already uses JSONB-flexible columns or we add them via migration).

**Changes to `LiveScorebook.tsx`:**
- In single-player mode, the scorebook grid shows just the one player row.
- At-bat panel cycles the same player each time (batter index always maps to index 0).
- All analytics (spray chart, heat map, player stats) work identically — they key off `batter_name` which still exists.

## 4. Database Migration

Add two columns to the `games` table:
```sql
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS game_mode text DEFAULT 'team';
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS is_practice_game boolean DEFAULT false;
```

## Files Changed
| File | Change |
|------|--------|
| `src/components/game-scoring/SituationalPrompts.tsx` | Add play type selector (relay, wall play) with position-aware conditional questions |
| `src/components/game-scoring/AtBatPanel.tsx` | Add fielder position selector, pass to SituationalPrompts |
| `src/components/game-scoring/FieldPositionDiagram.tsx` | **New** — Interactive SVG field with draggable dots |
| `src/components/game-scoring/GameSetupForm.tsx` | Add Team/Single Player mode toggle, conditional UI |
| `src/hooks/useGameScoring.ts` | Add `game_mode` and `is_practice_game` to GameSetup interface and insert |
| `src/components/game-scoring/LiveScorebook.tsx` | Handle single-player mode (1-player lineup cycling) |
| DB migration | Add `game_mode` and `is_practice_game` columns to `games` table |

