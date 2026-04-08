

# Upgrade Game Session Detail Dialog — Rich Analytics View

## Problem

When viewing a completed game in Players Club, the `GameSessionDetailDialog` shows:
- A basic score card (if `team_runs` exists in `game_summary`)
- Raw JSON dump for everything else
- A flat lineup list

Meanwhile, the live `GameSummaryView` (shown at end of game scoring) has rich batter cards, pitcher stats, spray charts, heat maps, and pitch usage charts — but none of that data is saved or re-rendered in the Players Club view.

## Solution

Two changes:

### 1. Save rich analytics into `game_summary` at game completion

Currently `completeGame` saves only `{ completed_at: "..." }`. Change `handleComplete` in `GameScoring.tsx` to compute full analytics (batter stats, pitcher stats, team score, spray data, pitch usage) and persist them into `game_summary` so historical games have all the data needed for rendering.

### 2. Rebuild `GameSessionDetailDialog` with rich display

Replace the raw JSON fallback with a proper tabbed summary (matching the live `GameSummaryView` style):

- **Score card** — large team vs opponent score display with W/L badge
- **Batters tab** — per-player stat cards (AVG/OBP/SLG/OPS, PA/H/RBI/K%/BB%, spray chart)
- **Pitchers tab** — pitch count, strike %, velocity, pitch type breakdown
- **Charts tab** — spray chart, pitch usage bar chart
- **Lineup tab** — batting order with positions (existing, cleaned up)

For games that were completed before this change (no rich data in `game_summary`), fetch `game_plays` from the database and compute analytics on the fly.

## Technical Details

### File: `src/pages/GameScoring.tsx`
- In `handleComplete`, compute analytics from plays using the same logic as `useGameAnalytics`, then pass the serialized batter/pitcher/score data into `completeGame(gameId, { ...richSummary })`.

### File: `src/components/GameSessionDetailDialog.tsx`
- Complete rewrite. Accept `session` prop as before.
- If `game_summary` contains rich data (`batterStats`, `pitcherStats`, `teamScore`), render directly.
- If not, fetch `game_plays` for that `session.id` from the database, run through `useGameAnalytics`, and render.
- Use `Tabs` with Batters/Pitchers/Charts tabs.
- Reuse `PlayerGameCard`, `PitcherTracker`, `SprayChart` components (already built for `GameSummaryView`).
- Keep the meta section (sport badge, date, venue, innings) at top.

### File: `src/hooks/useGamePlays.ts` (new)
- Simple hook: given a `gameId`, fetches all `game_plays` rows ordered by `created_at`.
- Used as fallback when `game_summary` lacks rich data.

## Files Summary

| File | Action |
|------|--------|
| `src/pages/GameScoring.tsx` | Save rich analytics into `game_summary` on completion |
| `src/components/GameSessionDetailDialog.tsx` | Full rewrite with tabbed batter/pitcher/chart display |
| `src/hooks/useGamePlays.ts` | New — fetch historical game plays for fallback rendering |

