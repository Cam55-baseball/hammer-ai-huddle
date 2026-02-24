

# Build All Remaining Components -- Full Implementation Plan

This plan covers the **~35 remaining items**: Split components, Micro Layer inputs, Professional Status components, Organization components, Authority components, QuickAddSession, page modifications, i18n, and the cron job.

---

## Batch 1: Split Components (8 files)

All go in `src/components/splits/` (new directory).

### SplitToggle
Toggle group showing available split keys (Overall, vs LHP, vs RHP, etc.) filtered by sport and data density level. Uses `splitDefinitions.ts` and `useDataDensityLevel`. Calls back with selected split key.

### BattingSideSelector
Two-button toggle (Left / Right) for selecting which batting side to log. Used in session entry for switch hitters. Stores value as `L` or `R`.

### ThrowingHandSelector
Two-button toggle (Left / Right) for throwing hand. Used in session entry. Stores value as `L` or `R`.

### SoftballPitcherStyleTag
Four-chip selector for softball pitcher styles: Riseball, Dropball, Speed, Spin. Only visible when sport is softball and data density is Level 4. Maps to `pitcher_style_tag` field.

### SplitAnalyticsView
Full-width card displaying composite indexes broken down by split key. Shows a table with split label, composite score, and session count. Uses `useSplitAnalytics` hook.

### SplitComparisonCard
Side-by-side comparison of two selected splits showing key metrics (composite, volume, execution average). Highlights which split is stronger.

### SplitStatLine
Single-row inline stat display: "vs LHP: .320 / 65 comp / 12 sessions". Compact format for use inside Profile and dashboard cards.

### GameAtBatLogger
Specialized input for logging individual game at-bats/plate appearances with pitch-by-pitch data. Includes count tracker, result selector, and optional micro layer fields. Saves as reps within a game session's drill blocks.

---

## Batch 2: Micro Layer Components (10 files)

All go in `src/components/micro-layer/` (new directory). These are Level 3-4 data density inputs.

### MicroLayerInput
Container component that renders the appropriate micro-layer fields based on session type (hitting vs pitching vs fielding) and data density level. Orchestrates the sub-components below. Uses `useMicroLayerInput` hook.

### DataDensityGate
Conditional wrapper (similar to DataBuildingGate) that checks `useDataDensityLevel`. If user's subscription tier doesn't meet the required level, shows an upgrade prompt. If met, renders children.

### PitchLocationGrid
Interactive 3x3 grid for tagging pitch location. Tappable cells with visual highlight on selection. Returns `{ row, col }`.

### SwingDecisionTag
Two-button toggle: Correct / Incorrect. Color-coded green/red.

### ContactQualitySelector
Five-option selector: Miss, Foul, Weak, Hard, Barrel. Styled as tappable chips with icons.

### ExitDirectionSelector
Four-option selector: Pull, Middle, Oppo, Slap Side (softball). "Slap Side" only visible for softball.

### SituationTagSelector
Compound input: Runner position dropdown (None, 1st, 1st+2nd, Bases Loaded, etc.) and outs counter (0-2).

### CountSelector
Two-digit input for balls (0-3) and strikes (0-2). Stepper buttons or tap-to-increment.

### FieldingMicroInput
Fielding-specific micro inputs: play type (ground ball, fly ball, line drive, bunt), result (clean, error, assist), and throw accuracy rating.

### PitchingMicroInput
Pitching-specific micro inputs: pitch type dropdown (from sport-specific pitch types), velocity band, spin rate input, and command zone (3x3 grid reusing PitchLocationGrid).

---

## Batch 3: Professional Status Components (4 files)

All go in `src/components/professional/` (new directory).

### VerifiedStatSubmission
Form card for submitting verified stat profile links (Baseball Savant, NCAA, etc.). Fields: sport, league, team name (optional), profile URL. Uses `useVerifiedStats` hook's `submitProfile` mutation. Shows existing submissions with status badges.

### VerifiedStatBadge
Small inline badge showing verification status: Pending (amber), Verified (green checkmark), Rejected (red X). Used next to stat profile entries.

### ContractStatusCard
Card displaying professional contract status, current league, current team, and season counts. Editable form using `useProfessionalStatus` hook. Shows MLB/AUSL season counters.

### SportBadge
Styled badge chip showing the user's sport (Baseball or Softball) with sport-specific icon and color theming.

---

## Batch 4: Organization Components (5 files)

All go in `src/components/organization/` (new directory).

### OrganizationRegistration
Registration form for creating a new organization: name, type (Team/Facility/Academy), sport, location. Uses `useOrganization` hook's `createOrg` mutation.

### OrganizationMemberList
Table/list of organization members showing name, role (Owner/Manager/Coach/Player), join date, and active status. Includes invite button and role change dropdown for org owners.

### TeamComplianceCard
Card showing team-wide compliance metrics: average integrity score, coach validation percentage, active member count, flagged members count. Aggregated from org member data.

### TeamHeatMapOverlay
Aggregated heat map view showing team-wide patterns. Uses HeatMapGrid component with averaged grid data across all org members. Useful for coaches to identify team-level strengths/weaknesses.

### OrganizationDashboard (Page)
New page at `src/pages/OrganizationDashboard.tsx` (route: `/organization`). Full org owner view with tabs: Overview (TeamComplianceCard), Members (OrganizationMemberList), Heat Maps (TeamHeatMapOverlay), and Settings (OrganizationRegistration for editing).

---

## Batch 5: Authority Components (4 files)

All go in `src/components/authority/` (new directory).

### CoachOverridePanel
Panel for coaches to submit grade overrides on athlete sessions. Shows session details, current player grade, and a form to enter coach grade (20-80 scale) with notes. Uses a mutation to insert into `coach_grade_overrides`.

### ScoutEvaluationForm
Form for scouts to submit evaluations: select athlete, select tool grades (hitting, pitching, fielding, running, arm), overall grade, projection notes. Inserts into `scout_evaluations`.

### GovernanceFlagCard
Card displaying a governance flag: flag type, severity, affected user, description, and resolution status. Includes action buttons for admin to resolve/dismiss.

### ArbitrationPanel
Admin panel for reviewing disputed grades/flags. Shows delta between player and coach grades, flag history, and action buttons (Uphold, Dismiss, Adjust). Updates governance flags and optionally adjusts scores.

---

## Batch 6: QuickAddSession Component

`src/components/practice/QuickAddSession.tsx` -- A streamlined 3-tap session entry: (1) select session type, (2) select primary drill, (3) rate execution. Auto-fills intent as "general" and skips optional fields. Saves via `calculate-session` edge function. Appears as a floating action button on PracticeHub.

---

## Batch 7: Page Modifications (4 files)

### Rankings.tsx -- Full Rebuild
Replace the current video-based ranking system with MPI-based global leaderboard:
- Remove all video analysis references and the edge function call to `get-rankings`
- Query `mpi_scores` directly for ranked athletes
- Display: Rank (#X), Name, MPI Score, Grade Label, Percentile, Trend Arrow, Sport Badge
- Sport-separated pools (Baseball tab / Softball tab)
- Segment filter dropdown (Youth, HS, College, Pro)
- Top 100 leaderboard with current user highlighted
- "Your Rank" card pinned at top showing user's own position

### Dashboard.tsx -- Add Practice Intelligence Card
Add a new card in the dashboard grid:
- MPI score summary (score + grade label) from `useMPIScores`
- Session streak count (consecutive days with sessions)
- Quick link to PracticeHub and ProgressDashboard
- One AI development prompt from `useAIPrompts` (if available)

### Profile.tsx -- Add Practice Intelligence Sections
Add collapsible sections below existing profile content:
- Professional Status section (ContractStatusCard)
- Verified Stats section (VerifiedStatSubmission + list with VerifiedStatBadge)
- Sport Badge display
- Split stat lines (top 3 splits using SplitStatLine)
- Organization membership display (if member of any org)

### AdminDashboard.tsx -- Add Governance Tabs
Add new tabs to the existing tab structure:
- Governance tab: List of GovernanceFlagCards with filters (active/resolved/all)
- Verified Stats tab: Pending verification requests with approve/reject actions
- Organizations tab: List of registered orgs with verification toggle
- Audit Export tab: Button to export ranking data as CSV

---

## Batch 8: i18n -- sportTerms Namespace (8 locale files)

Add `sportTerms` translation keys to all 8 locale files under `src/locales/`:
- Languages: en, es, fr, de, ja, zh, nl, ko
- Categories: pitchTypes, sessionTypes, metrics, drillNames, outcomeHitting, outcomePitching, splitLabels, heatMapLabels, roadmapMilestones, aiPromptTemplates
- Each category has baseball and softball variants
- English is the primary source; other languages get translated equivalents

---

## Batch 9: Cron Job Migration

Create a database migration that sets up `pg_cron` to call the `nightly-mpi-process` edge function at 05:00 UTC daily. The migration will:
- Enable the `pg_cron` extension (if not already)
- Schedule a cron job that calls the edge function URL via `pg_net`
- Include the service role key for authentication

---

## Technical Details

### File Structure Summary
```text
src/components/splits/          (8 new files)
src/components/micro-layer/     (10 new files)
src/components/professional/    (4 new files)
src/components/organization/    (4 new files)
src/components/authority/       (4 new files)
src/components/practice/        (1 new file: QuickAddSession)
src/pages/OrganizationDashboard.tsx  (1 new page)
src/pages/Rankings.tsx          (rewrite)
src/pages/Dashboard.tsx         (modify)
src/pages/Profile.tsx           (modify)
src/pages/AdminDashboard.tsx    (modify)
src/locales/*/sportTerms.json   (8 new files)
supabase migration              (1 cron job)
```

### Dependencies
All dependencies are already installed. No new packages needed.

### Recommended Execution Order
1. Batches 1-2 (Splits + Micro Layer) -- independent UI components
2. Batch 3 (Professional Status) -- independent UI components
3. Batch 6 (QuickAddSession) -- enhances PracticeHub
4. Batch 4-5 (Organization + Authority) -- includes new page + route
5. Batch 7 (Page Modifications) -- depends on components from batches 1-3
6. Batch 8 (i18n) -- can be done anytime
7. Batch 9 (Cron Job) -- infrastructure, no UI dependency

### No New Database Tables
All components use existing tables and hooks. The only migration is for the pg_cron schedule.

