

# Game Scoring — Standalone Elite Module

## Context

The existing `GameScorecard.tsx` component is a simple per-module (hitting/pitching/fielding) inning tracker embedded within PracticeHub. The user wants a **standalone, full-game scoring module** that tracks ALL positions simultaneously, supports multi-player lineups, generates analytics, and feeds all existing systems.

This is the largest feature requested to date. It requires new database tables, a new page, and 10+ new components.

---

## Architecture

### New Route & Page
- `/game-scoring` → `src/pages/GameScoring.tsx`
- Added to `App.tsx` routes and sidebar navigation
- Completely independent from Practice Hub

### Database: New Tables

**`games`** — Master game record
```sql
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sport TEXT NOT NULL DEFAULT 'baseball',
  team_name TEXT NOT NULL,
  opponent_name TEXT NOT NULL,
  game_type TEXT NOT NULL, -- league, tournament, scrimmage
  league_level TEXT NOT NULL,
  base_distance_ft NUMERIC NOT NULL,
  mound_distance_ft NUMERIC NOT NULL,
  game_date DATE NOT NULL DEFAULT CURRENT_DATE,
  venue TEXT,
  total_innings INTEGER NOT NULL DEFAULT 9,
  status TEXT NOT NULL DEFAULT 'in_progress', -- in_progress, completed
  lineup JSONB NOT NULL DEFAULT '[]',
  starting_pitcher_id TEXT,
  game_summary JSONB DEFAULT '{}',
  coach_insights JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own games" ON public.games FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

**`game_plays`** — Every pitch/play in the game
```sql
CREATE TABLE public.game_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  inning INTEGER NOT NULL,
  half TEXT NOT NULL DEFAULT 'top', -- top, bottom
  batter_order INTEGER,
  batter_name TEXT,
  pitcher_name TEXT,
  pitch_number INTEGER,
  -- Pitch data
  pitch_type TEXT,
  pitch_velocity_mph NUMERIC,
  velocity_band TEXT,
  pitch_location JSONB, -- {row, col}
  pitch_result TEXT NOT NULL, -- ball, called_strike, swinging_strike, foul, in_play_out, in_play_hit
  -- Batted ball
  exit_velocity_mph NUMERIC,
  launch_angle NUMERIC,
  spray_direction TEXT,
  contact_quality TEXT,
  batted_ball_type TEXT,
  -- At-bat outcome (set on final pitch)
  at_bat_outcome TEXT,
  rbi INTEGER DEFAULT 0,
  -- Situational data (JSONB for flexible advanced toggles)
  situational_data JSONB DEFAULT '{}',
  -- Defensive data
  defensive_data JSONB DEFAULT '{}',
  -- Catcher data
  catcher_data JSONB DEFAULT '{}',
  -- Baserunning data
  baserunning_data JSONB DEFAULT '{}',
  -- Video binding
  video_id TEXT,
  video_start_sec NUMERIC,
  video_end_sec NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.game_plays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own game plays" ON public.game_plays FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.games WHERE id = game_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.games WHERE id = game_id AND user_id = auth.uid()));
```

---

## Component Architecture

### Page: `GameScoring.tsx`
Multi-step flow:
1. **Game Setup** — Team, opponent, game type, league level (auto-populates distances), date, venue, lineup builder, starting pitcher
2. **Live Scoring** — Traditional scorebook + advanced toggle
3. **Game Summary** — Stats, charts, insights

### Components to Create

| Component | Purpose |
|-----------|---------|
| `game-scoring/GameSetupForm.tsx` | Game creation form with all required fields, lineup builder |
| `game-scoring/LiveScorebook.tsx` | Main scorebook interface — inning grid, lineup, pitch-by-pitch |
| `game-scoring/PitchEntry.tsx` | Single pitch input: type, velocity, location, result |
| `game-scoring/AtBatPanel.tsx` | Full at-bat flow with pitch sequence and outcome |
| `game-scoring/SituationalPrompts.tsx` | Dynamic prompts: dirt ball read, steal, defensive plays, baserunning |
| `game-scoring/CatcherMetrics.tsx` | Pop time, exchange, framing, blocking inputs |
| `game-scoring/PitcherTracker.tsx` | Pitch count, velocity trends, percentages |
| `game-scoring/PlayerGameCard.tsx` | Per-player stat dashboard (AVG/OBP/SLG/OPS, spray chart) |
| `game-scoring/GameSummaryView.tsx` | Post-game analytics, heat maps, charts |
| `game-scoring/DiamondVisual.tsx` | Base runner diamond SVG |
| `game-scoring/SprayChart.tsx` | Batted ball spray chart visualization |
| `game-scoring/HeatMapGrid.tsx` | 5x5 pitch/contact heat map |

### Hooks to Create

| Hook | Purpose |
|------|---------|
| `useGameScoring.ts` | CRUD for games table, play insertion, stat calculations |
| `useGameAnalytics.ts` | Derived stats: AVG, OBP, SLG, OPS, WHIP, ERA, K%, BB%, spray data, heat maps |

---

## Key Implementation Details

### League Distance Auto-Configuration
Reuses existing `baseballLeagueDistances` and `softballLeagueDistances` data. Selection auto-populates `base_distance_ft` and `mound_distance_ft` with manual override capability. Analytics benchmarks (steal times, pop times, throw down expectations) scale based on distances.

### Traditional Scorebook Layout
- Horizontal scrollable inning columns (1-9+ for baseball, 1-7+ for softball)
- Vertical lineup rows (9 batters + substitutions)
- Each cell shows at-bat result with pitch count
- Diamond visual for base runners per at-bat
- Running stat line (AB/H/R/RBI/BB/K)

### Advanced Toggle System
Default = traditional quick-entry mode. Advanced toggle reveals:
- 5×5 pitch location grid per pitch
- Exact velocity input
- Batted ball data (EV, LA, spray, contact quality)
- Situational prompts (only when conditions are met)

### Situational Prompt Logic (Dynamic)
- **Dirt ball read**: Only when pitch result = ball AND runners on base
- **Steal attempt**: Only when runner advances without hit
- **Defensive play**: On every in-play result
- **Baserunning advancement**: When runners move on hits/outs

### Catcher Metrics
Pop time, exchange, framing, blocking — all optional unless advanced mode is on. Feed directly to player profile analytics.

### Pitcher Tracking
Auto-calculated from pitch-by-pitch data: pitch count, velocity avg/peak, first-pitch strike %, K%, BB%, zone %, chase rate. Shown in real-time sidebar panel.

### Player Profile Linking
Every play stores player names. On game completion, system creates `performance_sessions` entries per player with `session_type: 'game'` and `module` per tracked category, linking all data to existing analytics pipeline.

### Heat Maps & Charts
Built using the existing 5×5 grid data and recharts. Spray chart uses SVG field diagram. All generated from `game_plays` data on the summary view.

### Video Integration
Reuses existing `VideoRepMarker` system. Each pitch/play can be bound to video timestamps.

### Coach Stat Corrections
Games with `status: 'completed'` allow coaches (via `is_linked_coach` check) to edit play data within 48 hours.

### Baseball + Softball Compatibility
- Inning count defaults (9 vs 7)
- Pitch types from existing sport-specific data files
- Distance/mound from existing league distance data
- Terminology adapts via `useSportTerminology`

---

## Implementation Order

Due to the massive scope, implementation will be chunked:

**Chunk 1**: Database migration + `GameScoring.tsx` page + `GameSetupForm` + route
**Chunk 2**: `LiveScorebook` + `AtBatPanel` + `PitchEntry` + `DiamondVisual` + basic scoring flow
**Chunk 3**: `SituationalPrompts` + `CatcherMetrics` + `PitcherTracker` — advanced toggle layer
**Chunk 4**: `PlayerGameCard` + `GameSummaryView` + `SprayChart` + `HeatMapGrid` — analytics
**Chunk 5**: Profile linking, video integration, coach corrections

This plan will implement **all 5 chunks** in this pass.

