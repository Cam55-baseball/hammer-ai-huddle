

# Game Scoring UX Overhaul — Opponent Linking, Defense Logging, Advanced Mode, UX Cleanup

## Problems Identified

1. **Opponent linking allows Hitter↔Hitter** — the `game_opponents` table has a freeform `opponent_type` field with no validation. Need to enforce proper matchup types: hitter↔pitcher, pitcher↔hitter, team↔team.

2. **No defense logging in standard mode** — Defensive play prompts (`SituationalPrompts`) only appear when `advancedMode === true` AND a pitch is in play. In standard mode, there's zero way to log defensive actions.

3. **Advanced toggle doesn't expose practice-level detail** — The "Advanced" switch only unlocks pitch type/velocity/location and situational prompts. It doesn't offer the same depth as practice session logging (swing decision, contact quality details, adjustment tags, goal of rep, etc.).

4. **"Most recent action" clutter** — After finalizing an at-bat, the scorebook immediately shows a new AtBatPanel for the next batter. There's no confirmation of what just happened. The pitch sequence badges from the previous AB aren't summarized anywhere visible. The UX feels like actions disappear.

5. **Single player still confusing** — Starting pitcher is set to empty string in single player mode, showing "Opponent Pitcher" as placeholder text. The opponent team name is entered at setup but the scoring UI doesn't clearly show "You vs [Opponent Team]" with the pitcher name prominently displayed.

## Plan

### 1. Fix Opponent Linking Types — DB + Code

**File: `src/components/game-scoring/AtBatPanel.tsx`**
- Remove `as any` casts on `game_opponents` queries (table now exists in types)
- Enforce `opponent_type` to only be `'pitcher'` or `'hitter'` based on context:
  - When user's position is a hitter (non-P): opponent_type = `'pitcher'`
  - When user's position is P: opponent_type = `'hitter'`
- Add `matchup_context` field to the upsert: `'game'`, `'intrasquad'`, `'practice'`

**DB Migration**: Add a check constraint or enum for `opponent_type` to prevent invalid values. Add `matchup_context` column.

```sql
ALTER TABLE public.game_opponents 
  ADD COLUMN matchup_context text DEFAULT 'game',
  ADD CONSTRAINT valid_opponent_type CHECK (opponent_type IN ('pitcher', 'hitter', 'team'));
```

### 2. Add Quick Defense Logging (Standard Mode)

**File: `src/components/game-scoring/AtBatPanel.tsx`**

Add a lightweight "Defense This Play" section that appears AFTER selecting an at-bat outcome (when `outcome` is set), visible in BOTH standard and advanced modes:

- **Standard mode**: Show only 3 quick fields:
  - "Made a defensive play?" (Yes/No toggle)
  - If Yes: Play result (Clean Play / Error / Assist)
  - Position involved (auto-populated from player's position)

- **Advanced mode**: Show the full `SituationalPrompts` as currently exists, but MOVE it to appear after the outcome is selected (not after the first pitch).

### 3. Add Practice-Level Detail Toggle (Elite Detail Mode)

**File: `src/components/game-scoring/AtBatPanel.tsx`**

When `advancedMode` is on, add an expandable "Elite Detail" section after the at-bat outcome that mirrors practice session fields:

- Swing Decision (Take / Protect / Swing to Drive / Emergency Hack)
- Contact Quality (already exists but make it visible in standard advanced)  
- Adjustment Tag (free text or preset: "Sat back", "Stayed inside", "Loaded later")
- Approach Notes (free text, 1-2 sentences)

These map to the same `situational_data` JSON field.

### 4. Clean Up "Last Action" Display

**File: `src/components/game-scoring/LiveScorebook.tsx`**

Add a "Last At-Bat" summary card between the game status bar and the active at-bat panel:

```
Last AB: Reagan Niederhaus — 1B (2 pitches)
vs John Smith | RBI: 1
```

- Shows after the first completed at-bat
- Displays: batter name, outcome badge, pitch count, pitcher name, RBI
- Auto-dismisses or collapses after 5 seconds (or stays as a small badge)
- Stored in local state as `lastCompletedAB`

### 5. Single Player UX Polish

**File: `src/components/game-scoring/LiveScorebook.tsx`**

- In single player mode, show a persistent header: `"{playerName} vs {opponentName}"`
- Make the "Opponent Pitcher" input more prominent — move it ABOVE the at-bat panel, with a label: "Who's pitching to you?"
- If no pitcher name entered, show a gentle nudge: "Enter the pitcher's name for scouting data"
- Auto-save pitcher name to `game_opponents` when switching innings or ending game

**File: `src/components/game-scoring/AtBatPanel.tsx`**
- In single player hitter mode, display `pitcherName` prominently in the header: "Your AB vs {pitcherName}"
- Hide the redundant opponent input entirely (already partially done but ensure it's clean)

### 6. Opponent Memory Improvements

**File: `src/components/game-scoring/LiveScorebook.tsx`**

- When user types in the pitcher input, filter suggestions in real-time
- Show opponent history stats inline if available: "Faced 3 times | .333 BA"
- Upsert to `game_opponents` on each at-bat completion (not just game end)

## Files Modified

| File | Change |
|------|--------|
| `AtBatPanel.tsx` | Quick defense section in standard mode, elite detail fields in advanced, remove `as any` casts, fix opponent_type enforcement |
| `LiveScorebook.tsx` | Last-AB summary card, single player UX polish, prominent pitcher input, auto-save opponents |
| `OpponentScoringPanel.tsx` | No changes needed |
| DB Migration | Add `matchup_context` column + `opponent_type` check constraint to `game_opponents` |

## UX Result

- Standard mode: tap pitch result → tap outcome → optional quick defense → finalize (3-4 taps)
- Advanced mode: full pitch data + elite detail + defense + catcher metrics
- Last action always visible as summary
- Single player clearly shows "You vs Opponent" with pitcher name prominent
- Opponent data properly typed (hitter↔pitcher only)

