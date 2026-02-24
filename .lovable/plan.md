

# Analytics, Heat Map Components + ProgressDashboard Buildout

This batch creates 14 new components and fully wires them into a production-ready ProgressDashboard page.

---

## New Components (14 files)

All components go in `src/components/analytics/` (new directory).

### 1. MPIScoreCard
Displays the MPI score with a grade label (20-80 scale mapped to descriptive text like "Average", "Plus", "Elite"), trend arrow, exact percentile, and rank (#X of Y). Uses `useMPIScores` hook.

### 2. ProProbabilityCard
Shows Pro Probability as a large percentage with a progress bar. Includes the ProProbabilityCap badge inline when `pro_probability_capped` is true.

### 3. ProProbabilityCap
Small badge component rendering "Pre-MLB" or "Pre-AUSL" text in a styled chip. Used inside ProProbabilityCard.

### 4. HoFCountdown
Displays "MLB Seasons: X / HoF in Y Seasons" countdown using `useHoFEligibility`. Hidden entirely when Pro Probability is below 100%. Shows a trophy icon when HoF is activated.

### 5. MLBSeasonCounter
Simple counter showing MLB and AUSL seasons completed as a stat line. Used inside HoFCountdown and Profile page.

### 6. RankMovementBadge
Trend arrow badge (Rising/Stable/Dropping) with the 30-day delta value. Color-coded green/gray/red. Uses `trend_direction` and `trend_delta_30d` from MPI scores.

### 7. DataBuildingGate
Conditional wrapper that checks MPI eligibility gates (60+ sessions, 80+ integrity, 40%+ coach validation, 14+ day span). If gates are NOT met, shows a "Data Building Phase" card with progress indicators for each gate. If met, renders children.

### 8. DeltaTrendChart
Line chart (using recharts) plotting player_grade vs coach_grade over time, with a delta area fill. Uses `useDeltaAnalytics` hook. Shows the last 50 sessions.

### 9. AIPromptCard
Dismissable card displaying AI development suggestions from `useAIPrompts`. Shows a lightbulb icon, one prompt at a time with next/previous navigation. Hidden when no prompts exist.

### 10. RoadmapBlockedBadge
Small inline badge showing "Blocked: [reason]" in amber/warning style. Used inside roadmap milestone rows when status is "blocked".

### 11. IntegrityScoreBar
Horizontal progress bar showing integrity score (0-100). Color transitions: red below 50, amber 50-79, green 80+. Shows exact numeric value.

### Heat Map Components (3 files in `src/components/heatmaps/`)

### 12. HeatMapGrid
Reusable grid visualization component. Takes `gridSize` (rows x cols), `gridData` (cell values), `colorScale` (3-color gradient), and `blindZones` array. Renders a CSS grid with cells colored by interpolating the color scale based on value intensity. Blind zone cells get a dashed border overlay. Includes hover tooltip showing exact value per cell.

### 13. HeatMapFilterBar
Filter controls row with:
- Time window selector (7d / 30d / season / career) as toggle group
- Context filter (All / Practice / Game) as toggle group
- Split key dropdown (All, vs LHP, vs RHP, etc.)

Uses the constants from `heatMapConfig.ts`. Calls back with selected filters.

### 14. HeatMapDashboard
Full heat map view showing all 8 heat map types in a responsive grid. Uses `useHeatMaps` hook with filters from HeatMapFilterBar. Each heat map type rendered as a Card containing a HeatMapGrid. Shows "No data yet" placeholder for map types without snapshots.

---

## ProgressDashboard Page Rebuild

The existing skeleton page at `src/pages/ProgressDashboard.tsx` will be completely rebuilt to include:

```text
+--------------------------------------------------+
| Progress Dashboard                                |
| Your MPI score, rankings, and development roadmap |
+--------------------------------------------------+
|                                                    |
| [DataBuildingGate wraps everything below]          |
|                                                    |
| Row 1: Three cards side by side                    |
| +----------------+ +----------------+ +---------+ |
| | MPIScoreCard   | | ProProbability | | Rank    | |
| | (score + trend)| | Card           | | Movement| |
| +----------------+ +----------------+ +---------+ |
|                                                    |
| Row 2: HoFCountdown (if eligible) + Integrity Bar |
| +---------------------------+ +------------------+ |
| | HoFCountdown              | | IntegrityScoreBar| |
| +---------------------------+ +------------------+ |
|                                                    |
| Row 3: AI Prompt Card (if prompts exist)           |
| +------------------------------------------------+ |
| | AIPromptCard                                    | |
| +------------------------------------------------+ |
|                                                    |
| Row 4: Delta Trend Chart                           |
| +------------------------------------------------+ |
| | DeltaTrendChart (player vs coach over time)     | |
| +------------------------------------------------+ |
|                                                    |
| Row 5: Development Roadmap                         |
| +------------------------------------------------+ |
| | Milestones list with progress bars              | |
| | Each milestone shows status + RoadmapBlocked    | |
| +------------------------------------------------+ |
|                                                    |
| Row 6: Heat Maps                                   |
| +------------------------------------------------+ |
| | HeatMapFilterBar                                | |
| | HeatMapDashboard (8 map types grid)             | |
| +------------------------------------------------+ |
+--------------------------------------------------+
```

The page uses `useMPIScores`, `useHoFEligibility`, `useAIPrompts`, `useDeltaAnalytics`, `useRoadmapProgress`, and `useHeatMaps` -- all hooks already exist.

---

## Technical Details

### File Structure
```text
src/components/analytics/
  MPIScoreCard.tsx
  ProProbabilityCard.tsx
  ProProbabilityCap.tsx
  HoFCountdown.tsx
  MLBSeasonCounter.tsx
  RankMovementBadge.tsx
  DataBuildingGate.tsx
  DeltaTrendChart.tsx
  AIPromptCard.tsx
  RoadmapBlockedBadge.tsx
  IntegrityScoreBar.tsx

src/components/heatmaps/
  HeatMapGrid.tsx
  HeatMapFilterBar.tsx
  HeatMapDashboard.tsx

src/pages/ProgressDashboard.tsx (rewrite)
```

### Dependencies Used
- `recharts` (already installed) for DeltaTrendChart
- `@radix-ui/react-progress` (already installed) for IntegrityScoreBar
- `@radix-ui/react-toggle-group` (already installed) for HeatMapFilterBar
- `lucide-react` icons throughout
- All existing hooks from Phase 4

### Color Interpolation for HeatMapGrid
A utility function interpolates between the 3-stop color scale based on normalized cell value (0-1). Blind zones (below threshold) receive a distinct dashed border treatment rather than color removal.

### DataBuildingGate Logic
Reads from `athlete_mpi_settings` via a new inline query checking `games_minimum_met`, `integrity_threshold_met`, `coach_validation_met`, `data_span_met`, and `ranking_eligible`. When any gate is unmet, the gate UI shows which requirements are satisfied vs pending.

### No Database Changes
All data comes from existing tables and hooks. No migrations needed.

