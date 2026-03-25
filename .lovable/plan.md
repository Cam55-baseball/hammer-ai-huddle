

# Add Defensive Play Logger to Opponent's Half-Inning

## Overview
During the opponent's batting half, the coach currently only sees the `OpponentScoringPanel` with R/H/E/Outs steppers. There's no way to log fielding plays (e.g., ground ball fielded cleanly, throw accuracy, relay plays). This adds a collapsible defensive play logger inside the opponent panel so the coach can track their team's fielding performance play-by-play.

## Design
Reuse the existing `SituationalPrompts` defensive play grading patterns (play type, first step, route, transfer, throw accuracy, decision) but package them in a lightweight, repeatable "log a defensive play" flow embedded in `OpponentScoringPanel`. Each logged play is stored in a local list and passed up with the R/H/E/Outs data when the coach records and switches.

## Changes

| File | Change |
|------|--------|
| `src/components/game-scoring/DefensivePlayLog.tsx` | **New file.** A self-contained component that lets the coach log individual defensive plays during the opponent's half. Each play captures: play type (Ground Ball, Fly Ball, Line Drive, Pop Up, Bunt, Relay, Wall Play), fielder position, result (Clean/Error/Assist), first step reaction, throw accuracy, and an optional note. Plays are added to a list with a small "Add Play" form that resets after each entry. Shows a compact summary of logged plays. |
| `src/components/game-scoring/OpponentScoringPanel.tsx` | Import and render `DefensivePlayLog` below the R/H/E/Outs steppers inside a collapsible section. Collect defensive plays in state and pass them via the `onRecordAndSwitch` callback. Update the callback signature to include `defensivePlays`. |
| `src/components/game-scoring/LiveScorebook.tsx` | Update `handleOpponentRecordAndSwitch` to accept the new `defensivePlays` array. Store them with the game plays via `onPlayRecorded`, tagging each with `play_type: 'defensive'`, the current inning/half, and the fielding details in `composite_indexes`. |

### DefensivePlayLog Component Details
- Compact "Add Defensive Play" collapsible section with a shield icon
- Each play form: position dropdown (all 9 positions), play type toggle, result toggle (Clean/Error/Assist), first step (Poor/Avg/Elite), throw accuracy (Poor/Avg/Elite), optional one-line note
- "Log Play" button adds to local list, resets form
- Logged plays shown as compact chips/rows: "SS — Ground Ball — Clean ✓"
- Delete button on each logged play for corrections

### Data Flow
```text
DefensivePlayLog → OpponentScoringPanel → LiveScorebook → onPlayRecorded
```
Defensive plays are stored as game plays with `at_bat_outcome: null` and fielding details in `composite_indexes` JSONB, keeping the existing schema intact.

