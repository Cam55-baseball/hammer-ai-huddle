

## Move Load Dashboard, Analytics, Practice Intelligence (MPI), and Streaks to Progress Dashboard

### Changes

**1. `src/pages/MyCustomActivities.tsx` — remove two tabs**
- Delete `load-dashboard` tab entry (line 95) and its `<TabsContent value="load-dashboard">` (lines 214–216).
- Delete `analytics` tab entry (line 100) and its `<TabsContent value="analytics">` (lines 236–238).
- Remove now-unused imports: `LoadDashboard`, `ActivityAnalytics`, `BarChart3`, `Activity`.

**2. `src/pages/Dashboard.tsx` — remove three blocks**
- Delete `<PracticeIntelligenceCard />` render (line 499) and the `PracticeIntelligenceCard` function definition (lines 41–82).
- Delete `<DualStreakDisplay />` render (line 502).
- Remove now-unused imports: `useMPIScores`, `useAIPrompts`, `DualStreakDisplay`, `getGradeLabel`, `Activity`, `Lightbulb`, `TrendingUp`.

**3. `src/pages/ProgressDashboard.tsx` — add the four moved sections at the top of the dashboard content (above `DataBuildingGate` so they always show, regardless of HIE access)**
- Add a new top section that renders, in order:
  1. `PracticeIntelligenceCard` — recreate the same component locally inside `ProgressDashboard.tsx` (uses `useMPIScores` + `useAIPrompts`, navigates to `/progress` "Progress" button replaced with no button since user is already on Progress; keep MPI summary and prompt). 
  2. `<DualStreakDisplay />` — Performance + Discipline streak cards.
  3. `<ActivityAnalytics selectedSport={selectedSport} />` — pass sport from `localStorage.getItem('selectedSport')`.
  4. `<LoadDashboard />` — 7-day load overview.
- Add required imports: `DualStreakDisplay`, `ActivityAnalytics`, `LoadDashboard`, `useMPIScores`, `useAIPrompts`, `getGradeLabel`, `Activity`, `Lightbulb`, `TrendingUp`, `Card`, `Button`.

### Out of scope
- Sidebar entries unchanged.
- HIE-gated content (PlayerSnapshotCard, etc.) untouched and still behind `DataBuildingGate` + `hasAdvancedAccess`.
- No changes to data hooks or business logic.

### Verification
- `/dashboard`: no Practice Intelligence card, no Performance/Discipline streak row.
- `/my-activities`: no "Load Dashboard" or "Analytics" tabs.
- `/progress`: now shows MPI card, dual streaks, Activity Analytics, and Load Dashboard at the top, then the existing HIE sections below.

