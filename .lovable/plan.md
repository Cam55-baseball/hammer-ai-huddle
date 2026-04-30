## Goal

Players Club becomes a **video-only** library. Practice sessions belong in **Practice History / Calendar review**. Game sessions belong in the **Game Hub**. Existing practice/game cards already in users' Players Club views are grandfathered in (still visible) so nothing disappears retroactively.

## Behavior summary

| Item type | New home | Shows in Players Club? |
|---|---|---|
| Standalone video upload (saved to library) | Players Club | Yes |
| Practice session WITH attached video | Practice History + Players Club (as the video) | Video card only |
| Practice session WITHOUT video | Practice History / Calendar review | No |
| Game WITH attached video | Game Hub + Players Club (as the video) | Video card only |
| Game WITHOUT video | Game Hub | No |
| Pre-existing practice/game cards already visible in Players Club | Grandfathered | Yes (legacy flag) |

## Database changes

1. **Link videos to their source session/game**
   - Add to `public.videos`:
     - `practice_session_id uuid NULL REFERENCES performance_sessions(id) ON DELETE SET NULL`
     - `game_id uuid NULL REFERENCES games(id) ON DELETE SET NULL`
   - Indexes on both new columns.
   - RLS unchanged (still owner-scoped).

2. **Grandfather flag for legacy Club entries**
   - Add `legacy_in_players_club boolean NOT NULL DEFAULT false` to `performance_sessions` and `games`.
   - One-time backfill: set `true` for every existing row created **before the migration timestamp**, owned by users who have ever opened Players Club. Safe default: backfill `true` for all existing rows so nothing visually disappears. New rows default to `false`.

## Edge function: `get-player-library`

Rewrite the response to be video-centric:

- Return `videos` exactly as today (already filtered by `saved_to_library = true`).
- Return `practices` only where `legacy_in_players_club = true`.
- Return `games` only where `legacy_in_players_club = true`.
- Continue scout/owner authorization checks unchanged.

Going forward no new practice or game ever enters this list — only standalone or session-linked videos.

## Upload / save flows that must populate the new link columns

When a video is uploaded or saved to library from inside one of these flows, set `practice_session_id` or `game_id`:

- `src/components/RealTimePlayback.tsx` (`handleSaveToLibrary`) — pass current session/game id when present.
- `src/pages/AnalyzeVideo.tsx` (`SaveToLibraryDialog`) — accept and forward `practiceSessionId` / `gameId` props from the calling context.
- `src/components/SaveToLibraryDialog.tsx` — accept optional `practiceSessionId` and `gameId` and include them in the insert payload.
- Any game-hub video capture path (e.g. game playback recording) — same treatment.

This gives us a real "this video came from this session/game" relationship without depending on date matching.

## UI: Players Club (`src/pages/PlayersClub.tsx`)

- Header copy reframed to "Video Library" wording (keep route `/players-club`).
- Source filter `practice` and `game` tabs are still available **only if the user has any legacy practice/game items** — otherwise hide them.
- Practice and game cards that do appear get a small "Legacy" badge and a tooltip: *"Practices and games now live in Practice History and Game Hub."*
- Video cards that have a `practice_session_id` or `game_id` get a "From practice" / "From game" chip that deep-links to the source.

## UI: where things live now

- **Practices**: existing Practice History view at `/practice` (and Calendar review surfaces) — already loads from `performance_sessions`. No code change needed beyond confirming the user can see all their practices there.
- **Games**: existing Game Hub at `/games` — already loads from `games`. No code change needed beyond confirming history view shows completed games.
- Add quick links in Players Club empty state: "Looking for practices? Go to Practice History →" and "Looking for games? Go to Game Hub →".

## Scout / owner viewing other players

Same rules apply when `playerId` is provided: only saved videos + legacy practice/game items are returned, gated by accepted scout follow.

## Out of scope (will not change)

- Vault, dashboard cards, training blocks, nutrition logs — unaffected. The instruction is specific to the Players Club library surface.
- Existing `saved_to_library` semantics on the `videos` table.

## Files to edit

- `supabase/migrations/<new>.sql` — schema + backfill described above
- `supabase/functions/get-player-library/index.ts` — new filter rules
- `src/pages/PlayersClub.tsx` — copy, badges, empty-state links, conditional tabs
- `src/components/SaveToLibraryDialog.tsx` — accept and persist session/game link
- `src/pages/AnalyzeVideo.tsx` — forward session/game context to dialog
- `src/components/RealTimePlayback.tsx` — forward session/game context to dialog
- Any other call site of `SaveToLibraryDialog` discovered during implementation

## Open question I'll confirm during build

If a brand-new video is saved that *isn't* tied to a session, it still belongs in Players Club (standalone video upload). Confirmed by your earlier answers — keeping that behavior.
