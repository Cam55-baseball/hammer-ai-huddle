

# Elite Analytics UI + Video Rep Analysis + Competition Tiers + Game Logging Rebuild

## 1. Hide Competition Weight Multipliers from UI

**File: `src/components/game-scoring/GameSetupForm.tsx` (line 328)**
Remove the `<span>` showing `{l.competition_weight_multiplier}x` from competition level buttons. Users see only the label (e.g. "D1", "Cape Cod League").

**File: `src/data/competitionWeighting.ts` (line 79)**
Rename the Summer Ball category label from `'Summer Ball'` to `'College Summer Ball'`.

Also hide the multiplier shown in the summer league classification toast (lines 194, 204).

## 2. Add Competition Tiers (Baseball Only)

**File: `src/data/baseball/competitionLevels.ts`**
- Rename `summer_generic` label from `'Summer League'` to `'College Summer Ball'`
- Add two new entries after it:
  - `{ key: 'cape_cod', label: 'Cape Cod League', category: 'summer', competition_weight_multiplier: 1.15, league_difficulty_index: 0.92, pre_collegiate: false }`
  - `{ key: 'collegiate_olympic', label: 'Collegiate Olympic', category: 'summer', competition_weight_multiplier: 1.20, league_difficulty_index: 0.94, pre_collegiate: false }`

## 3. Single Player Game Logging — Auto-Populate Name

**File: `src/components/game-scoring/GameSetupForm.tsx`**

- Fetch the user's `full_name` from `profiles` table using `useAuth()` user ID on mount
- Auto-populate `singlePlayerName` with that value
- Replace the "Player Name" input (lines 414-417) with a read-only display: `"Logging Game For: {name}"`
- Remove `singlePlayerName.trim()` from `isValid` check (line 184) — it's auto-populated, always valid
- Keep Position selector as-is

## 4. Opponent Pitcher/Hitter Tracking in AtBatPanel

**New DB table: `game_opponents`**

```sql
CREATE TABLE public.game_opponents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_name text NOT NULL,
  opponent_type text NOT NULL DEFAULT 'pitcher',
  last_faced_at timestamptz DEFAULT now(),
  times_faced int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.game_opponents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own opponents" ON public.game_opponents
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE UNIQUE INDEX idx_game_opponents_unique ON public.game_opponents(user_id, opponent_name, opponent_type);
```

**File: `src/components/game-scoring/AtBatPanel.tsx`**

Add an "Opponent Pitcher" (or "Facing Hitter" for pitcher position) input at the top of the panel:
- Input with autocomplete from `game_opponents` table (recent opponents)
- On at-bat finalization, upsert opponent name to `game_opponents`
- Store `opponent_pitcher_name` / `opponent_hitter_name` in the play data

## 5. Video Rep Analysis — Tabbed Interface in SessionVideoUploader

**File: `src/components/practice/SessionVideoUploader.tsx`**

Replace the current rep tagging panel (lines 177-209) with a tabbed interface using Radix Tabs:

```
Tag reps to this video
  Rep #1 [✓]  Rep #2 [ ]  Rep #3 [✓]

[Tags | Notes | Analyze]
```

- **Tags tab**: existing checkbox rep tagging (current behavior)
- **Notes tab**: small textarea for rep-level notes (stored on video metadata)
- **Analyze tab**: analysis type selector based on module:
  - `hitting` → "Analyze Hitting Mechanics"
  - `pitching` → "Analyze Pitching Mechanics"
  - `fielding`/`catching` → "Analyze Throw Mechanics"
  - `throwing` → "Analyze Throwing Mechanics"
  - Button launches existing `RepVideoAnalysis` dialog

Replace the tiny microscope icon (line 196-203) with this integrated tab approach. The Analyze button label will be "Analyze Mechanics" or "Analyze This Rep" for clarity.

## 6. Fix Horizontal Scroll on Custom Activity Cards

**File: `src/components/folders/FolderItemPerformanceLogger.tsx`**

The `flexible` mode (lines 126-194) renders 6+ inputs in a single non-wrapping flex row. Fix by wrapping into a two-row grid:

```
Row 1: [Set#] [Wt] [unit] [Reps]
Row 2: [Time] min [Dist] [Steps] [delete]
```

Change the parent `div` from `flex items-center gap-1.5` to `grid grid-cols-1 gap-1` with two inner rows, each using `flex flex-wrap`. Add `min-w-0` to prevent overflow.

## Files Summary

| File | Change |
|------|--------|
| `GameSetupForm.tsx` | Hide multiplier display, auto-populate player name, show "Logging For: You" |
| `baseball/competitionLevels.ts` | Rename summer_generic, add Cape Cod + Collegiate Olympic |
| `competitionWeighting.ts` | Rename Summer Ball category label |
| `AtBatPanel.tsx` | Add opponent name input with autocomplete |
| `SessionVideoUploader.tsx` | Tabbed rep interface (Tags/Notes/Analyze) |
| `FolderItemPerformanceLogger.tsx` | Two-row grid layout to fix horizontal scroll |

### New DB Migration
- `game_opponents` table with RLS

