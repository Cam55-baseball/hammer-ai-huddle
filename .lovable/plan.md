

# Optimize Session Configuration by Session Type

## Problem
The `SessionConfigPanel` shows the same rep source options and config fields regardless of session type. This creates illogical combinations — e.g., a **Lesson** in hitting shows "Game" as a rep source, or a **Game** session shows "Tee" and "Soft Toss." Each session type has a distinct real-world context that should constrain which options are presented.

## Logic Rules

The five session types each imply a specific training context:

| Session Type | Valid Hitting Sources | Valid Pitching Sources | Notes |
|---|---|---|---|
| **Solo Work** | Tee, Soft Toss, Machine BP | Flat Ground | No live pitcher, no game. No coach needed. |
| **Team Session** | Machine BP, Front Toss, Flip, Coach Pitch, Live BP, Regular BP | Bullpen, Flat Ground, Live BP | Organized practice — no tee (solo drill), no game. |
| **Lesson** | Tee, Soft Toss, Front Toss, Flip, Coach Pitch, Machine BP | Bullpen, Flat Ground | Instructional — no game, no live BP (not a scrimmage). |
| **Game** | Game (auto-selected, single option) | Game (auto-selected) | Only game reps. No practice sources. Season context locked to in-season. |
| **Live At-Bats** | Live BP, Regular BP | Live BP | Simulated game — only live sources. |

Additional per-session-type field rules:
- **Game**: Auto-set rep source to `game`, hide rep source selector entirely. Show `GameSessionFields` (opponent name/level). Hide velocity band (captured per-rep). Season locked to `in_season`.
- **Solo Work**: Hide coach selector (already done). Hide league level (solo drill, irrelevant).
- **Live At-Bats**: Hide season context (implied in-season or scrimmage). Auto-lock season to `in_season`.
- **Lesson / Team Session**: Show coach selector (already done). All other fields normal.

For **Throwing**, **Fielding**, **Catching**, **Baserunning** modules — same principle: filter out `game` source unless session type is `game`, and for `game` session type auto-select it.

## Changes

### `src/components/practice/RepSourceSelector.tsx`
- Accept new `sessionType` prop
- Add filtering function `filterSourcesBySessionType(groups, sessionType)` that removes inappropriate items based on the mapping above
- For `game` session type, return only the `game` source item (pre-selected)

### `src/components/practice/SessionConfigPanel.tsx`
- Pass `sessionType` to `RepSourceSelector`
- For `game` session type: auto-set `repSource` to `'game'`, lock season to `in_season`, integrate `GameSessionFields` for opponent info
- For `live_abs`: auto-lock season to `in_season`, hide season toggle
- For `solo_work`: hide league level selector
- Add `opponent_name` and `opponent_level` to `SessionConfig` interface
- Store opponent state, pass through on confirm

### `src/components/practice/SessionConfigPanel.tsx` (SessionConfig interface)
- Add optional `opponent_name?: string` and `opponent_level?: string` fields

