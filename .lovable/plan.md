# Fix Players Club showing no videos

## What's wrong

Players Club loads everything through one backend function. That function still asks for an old `games` table that no longer exists (games were moved to the Game Hub's own table). The database rejects the request, the function throws, and it returns an error instead of the athlete's saved videos — so the page shows "No sessions found" plus the "Edge Function returned a non-2xx status code" toast.

Confirmed from the function logs:
`Could not find the table 'public.games' in the schema cache — Perhaps you meant 'public.gp_games'`

The saved videos themselves are fine; they are simply never delivered because the games step fails first.

## The fix

1. Point the legacy games lookup at the current games table (`gp_games`) and request only the fields that table actually has (opponent, game type, date, venue, status, sport, summary). The old columns `team_name`, `league_level`, `total_innings`, `lineup`, `game_mode`, `is_practice_game`, `legacy_in_players_club` no longer exist and are dropped.
2. Make the practices and games lookups non-fatal: if either one errors, log it and return an empty list for that section instead of failing the whole request. Videos are the primary content and must always come back.
3. Keep the videos lookup as the only hard failure path.
4. Adjust the Players Club card mapping so a game item reads from the current field names (`opponent_team` instead of `opponent_name`, etc.) and still renders correctly.

## Technical notes

- File: `supabase/functions/get-player-library/index.ts` — replace `.from('games')` with `.from('gp_games')`, update the select list, remove the `legacy_in_players_club` filter for games, and wrap practices/games in soft-fail handling.
- Client side: check the Players Club list/grid components for `opponent_name` / `team_name` usage and map to the current columns.
- Verify after deploy by calling the function and confirming a 200 with the videos array populated.
