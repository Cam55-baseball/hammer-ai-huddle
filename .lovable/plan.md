

# Connect Season Phase to Practice Sessions & Activities

## Current State
- **Calendar**: Saves `season_status` to `athlete_mpi_settings` via `useSeasonStatus` hook
- **Practice Hub**: Has its own `SeasonContextToggle` in `SessionConfigPanel` that independently defaults to `'in_season'`
- **Other flows** (PickoffTrainer, etc.): Hardcode `season_context: 'in_season'`

These are completely disconnected — the Calendar setting has no effect on sessions.

## Changes

### 1. `src/hooks/useSessionDefaults.ts`
Import `useSeasonStatus` and use the saved `season_status` as the default for `season_context` instead of hardcoding `'in_season'`.

### 2. `src/components/practice/SessionConfigPanel.tsx`
- Import `useSeasonStatus`
- Initialize the `seasonContext` state from the saved value instead of `defaults.season_context ?? 'in_season'`
- The `SeasonContextToggle` remains visible so users can override per-session, but the default now matches their Calendar selection

### 3. `src/pages/PickoffTrainer.tsx`
- Import `useSeasonStatus`
- Use `seasonStatus` instead of hardcoded `'in_season'` when creating sessions

### 4. Value mapping
The Calendar uses `'in_season' | 'preseason' | 'post_season'` while `SessionConfigPanel` uses `'in_season' | 'off_season' | 'preseason'`. Map `'post_season'` → `'off_season'` for session context compatibility, or update the `SeasonContextToggle` to support `'post_season'` as a valid value.

## Files

| File | Change |
|------|--------|
| `src/hooks/useSessionDefaults.ts` | Read saved season phase as default |
| `src/components/practice/SessionConfigPanel.tsx` | Initialize from saved season phase |
| `src/pages/PickoffTrainer.tsx` | Use saved season phase instead of hardcoded value |
| `src/components/practice/SeasonContextToggle.tsx` | Add `post_season` option to match Calendar values |

