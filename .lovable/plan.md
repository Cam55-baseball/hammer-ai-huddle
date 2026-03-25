

# Save Stats for All Players (Including Unlinked)

## Problem
The `syncGameToPlayerStats` function currently skips unlinked players (those without a `player_user_id`) unless they happen to be the first player in the lineup. This means most roster players' game stats are silently lost.

## Solution
For unlinked players, store their stats under the **coach's user_id** with a `player_name` reference inside `composite_indexes`. This way:
- Linked players get stats saved to their own account (existing behavior)
- Unlinked players get stats saved under the coach's account with a name tag so the data isn't lost and can be attributed later if the player links

## Changes

### `src/hooks/useGameScoring.ts`

Remove the `continue` guard that skips unlinked players. Instead:

**For batting stats (line 251-273):**
- If `matchingPlayer.player_user_id` exists → save under that user (existing)
- Otherwise → save under `user.id` (coach) with `player_name: batterName` and `is_unlinked_player: true` in `composite_indexes`

**For pitching stats (line 276-296):**
- Same logic: linked players save to their account, unlinked save under coach with name reference

The `composite_indexes` object will include:
```json
{
  "game_id": "...",
  "player_name": "John Smith",
  "is_unlinked_player": true,
  "hits": 2,
  ...
}
```

This requires no database changes — `composite_indexes` is already a JSONB column.

| File | Change |
|------|--------|
| `src/hooks/useGameScoring.ts` | Remove skip-guard for unlinked players; store stats under coach with player name reference |

