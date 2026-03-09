

# Fix Plan: Vault Scroll & Game Sessions in Players Club

## Issue 1: Vault 6-Week Performance Test Scroll Not Working

The `ScrollArea` at line 619 has `max-h-[400px]` set on the Root component via `className`, but Radix `ScrollArea` requires a **fixed height** on the root, not just `max-h`. The `Viewport` inside has `h-full w-full` but without a concrete height constraint on the root, the scroll never activates.

**Fix:** Replace the `ScrollArea` wrapper with a standard `div` that uses `max-h-[400px] overflow-y-auto` for native scrolling, OR add an explicit `h-[400px]` style approach. The simplest reliable fix is to wrap the content in a div with `max-h-[400px] overflow-y-auto` instead of `ScrollArea`, since `max-h` on Radix ScrollArea root doesn't constrain the viewport properly.

**File:** `src/components/vault/VaultPerformanceTestCard.tsx` (line 619)

## Issue 2: Completed Games Not Showing in Players Club

The `get-player-library` edge function only queries two sources:
1. `videos` table (tagged as `source: 'video'`)
2. `performance_sessions` table (tagged as `source: 'practice'`)

It never queries the `games` table, so completed games from the Game Hub are invisible in Players Club.

**Fix:** Add a third query in the edge function for the `games` table filtered by `status = 'completed'`, tag results as `source: 'game'`. Then update `PlayersClub.tsx` to:
- Add a `GameSession` interface
- Add `'game'` to the `sourceFilter` type and tab triggers
- Add a "Game Sessions" tab
- Render game cards showing team vs opponent, date, game type, score summary
- Add a `GameSessionDetailDialog` component for viewing full game details (lineup, plays, summary)

**Files to change:**
| File | Change |
|------|--------|
| `src/components/vault/VaultPerformanceTestCard.tsx` | Fix scroll — replace `ScrollArea` with native overflow div |
| `supabase/functions/get-player-library/index.ts` | Add `games` query for completed games |
| `src/pages/PlayersClub.tsx` | Add GameSession type, 'game' filter tab, game card rendering, game detail dialog state |
| `src/components/GameSessionDetailDialog.tsx` | **Create** — dialog showing game lineup, plays, summary, and video if present |

