

# Auto-Populate Lineup from Linked Players & Drag-and-Drop Reordering

## Overview

Replace the manual text-entry lineup builder in GameSetupForm with a player search/select system that pulls from two sources: (1) coach's linked players via `scout_follows` and (2) organization roster via `organization_members`. Add drag-and-drop batting order reordering using the already-installed `@dnd-kit` library.

## Data Sources

Two queries will feed the player pool:

1. **Linked Players** — `scout_follows` where `scout_id = currentUser` and `status = 'accepted'`, joined with `profiles_public` for name/position/avatar
2. **Organization Roster** — `organization_members` where `organization_id` matches the coach's org (via `usePlayerOrganization`), joined with `profiles_public`

Results are merged and deduplicated by user ID, providing a unified player pool.

## Changes

### 1. New hook: `src/hooks/useCoachPlayerPool.ts`
- Fetches linked players from `scout_follows` (accepted, relationship_type = 'linked') + their profiles from `profiles_public`
- Fetches org members from `organization_members` (active) + their profiles from `profiles_public`
- Merges, deduplicates by player ID, returns `{ id, name, position, avatar_url, source: 'linked' | 'roster' | 'both' }[]`
- Uses `useAuth` for current user, `usePlayerOrganization` for org context
- Returns `{ players, isLoading }` via `useQuery`

### 2. New component: `src/components/game-scoring/PlayerSearchCombobox.tsx`
- Combobox using the existing `Command` component (cmdk-based) inside a `Popover`
- Shows searchable list of players from the pool, grouped by source ("Linked Players" / "Team Roster")
- Each item shows player name, position badge, and avatar
- On select, adds the player to the lineup
- Already-added players are shown as disabled/checked
- Fallback: "Add custom player" option at bottom for manual name entry (non-roster players)

### 3. Update: `src/components/game-scoring/GameSetupForm.tsx`
- Import `useCoachPlayerPool`, `PlayerSearchCombobox`, and `@dnd-kit` components
- Replace the plain `Input` for player name with `PlayerSearchCombobox`
- Add "Add from Roster" button that opens combobox to batch-add players
- Wrap lineup items in `DndContext` + `SortableContext` from `@dnd-kit/sortable`
- Each lineup row becomes a `SortableItem` with a drag handle (GripVertical icon)
- On drag end, reorder lineup and recalculate `batting_order` values
- Keep manual "Add Player" button for typing custom names (guests/opponents for intrasquad)
- Update `LineupPlayer` usage: when selected from pool, store `player_user_id` alongside `name`

### 4. Update: `src/hooks/useGameScoring.ts`
- Add optional `player_user_id?: string` to `LineupPlayer` interface to link lineup entries to real user accounts

## Component Structure

```text
GameSetupForm
├── Game Details Card (unchanged)
└── Starting Lineup Card
    ├── PlayerSearchCombobox (Add from roster)
    ├── DndContext + SortableContext
    │   └── SortableLineupRow[] (drag handle + name + position + remove)
    ├── "Add Custom Player" button
    └── Starting Pitcher Select
```

## Files Summary

| File | Action |
|------|--------|
| `src/hooks/useCoachPlayerPool.ts` | Create — fetch linked + org players |
| `src/components/game-scoring/PlayerSearchCombobox.tsx` | Create — searchable combobox |
| `src/components/game-scoring/GameSetupForm.tsx` | Update — integrate combobox + dnd-kit |
| `src/hooks/useGameScoring.ts` | Update — add `player_user_id` to `LineupPlayer` |

