
# Phase 49 — Release-1 Product Lock (Plan)

Single implementation phase. Produces athlete-safe Release-1 by **deleting** every surface that displays a "measured" output the engines cannot honestly produce today, plus one document: `.lovable/phase-49-release-product-lock.md`.

No new components. No placeholders. No "coming soon." If a surface cannot tell the truth today, it is removed (component unmounted, route gated, import dropped).

---

## What gets removed (REMOVE class)

These render composites/pillars/wins/leaks/trends derived from LLM scoring or never-populated `video_metric_runs`. All are unmounted from athlete surfaces.

1. **Per-video Hammer Report Card** — `HammerReportCard` mount inside `src/pages/AnalyzeVideo.tsx` (line ~984), plus the `AnalysisToggle` that gates report-card vs detailed view, `RecomputeReportCardButton`, `CameraAngleHelper`, and `AnalysisProgressIndicator` (report-card progress). Analysis page keeps: video player, raw LLM `feedback`/`summary`/`drills` text, `AnalysisCoachChat`, `VideoSuggestionsPanel`, save-to-library, delete.
2. **Hitting report-card trend strip** — `<ReportCardTrendStrip module="hitting" />` mount in `src/pages/ProgressDashboard.tsx` (line 144).
3. **Athlete-side UHRC section** — file `src/components/report-card/UhrcAthleteSection.tsx` already unmounted from `AthleteCommand` and `ProgressDashboard`; delete the file and its stale comment lines so no future route can re-mount it.
4. **Coach-facing measured report cards (athletes view via shared links)** — unmount `<UhrcReportCard>` and both `<HammerReportCardAggregate>` blocks in `src/pages/CoachAthleteDetail.tsx` (lines 187, 210, 215). Coach still sees self-reported MPI, PIE V2 panels, recruiting card, notes.
5. **MPI Practice Intelligence card** numeric grade chip — keep card shell but remove the `mpi.adjusted_global_score` number + grade label in `PracticeIntelligenceCard` (`ProgressDashboard.tsx`). The chip implies a measured global grade. Replace inner body with "Log sessions to build practice history" copy (curriculum-truthful).
6. **Per-analysis report-card aggregate visuals** — `ShareCardExport`, `FoilGradeCard`, `ReportCardGradeRibbon`, `ReportCardTile`, `CategoryPanel`, `BhCategoryPanels`, `UhrcDetailedAnalysis`, `HammerReportCardAggregate`, `HammerReportCard` — delete the files (dead after #1/#3/#4) so nothing in the repo can import them back.
7. **Delta trend chart** — `src/components/analytics/DeltaTrendChart.tsx` plots player vs coach grade; self-reported, but labeled "Trend" alongside removed report-card surfaces. Audit usages with `rg`; if only mounted next to removed surfaces, delete. If used in coach-only console with self-reported inputs, keep (SAFE) and leave a note in the doc.

## What stays (SAFE class)

Self-reported / completed / static / conversational surfaces are untouched:

- `DailyOutcomeInlineBanner`, `DualStreakDisplay`, `ActivityAnalytics`, `LoadDashboard`, `NNSuggestionPanel`
- HIE cards on Progress: `PlayerSnapshotCard`, `WeaknessClusterCard`, `PrescriptiveActionsCard`, `ReadinessCard`, `ReadinessBreakdownCard`, `RiskAlertsCard`, `AskHammerPanel`, `SmartWeekPlan`, `ProofCard`, `ProProbabilityCard`, `HeatMapDashboard` — these consume self-reported wellness/load and curriculum logic, not measured biomechanics.
- `CommandCenterSection`, `HammerOnboardingChat`, `HammerDailyPlan`, `HammerChat`, `RecentEventsPreview` on `AthleteCommand`.
- Vault, curriculum, calendar, practice logging, video upload+raw-LLM coaching, video library.

## Coaching-statement audit

`HammerChat` / `AskHammerPanel` / `AnalysisCoachChat` system prompts: append a constitutional clause forbidding the model from quoting any numeric tempo/score/pillar/composite/grade and from claiming "your measured X is Y". Sweep `src/lib/prompts/**` (and any `aiPromptRules` files) for tokens `tempo_sec`, `composite`, `pillar`, `biggest_leak`, `biggest_win`, `measured`, `grade`, `score_100` inside instructions that produce athlete-visible copy; rewrite to reference only self-report, completed sessions, uploaded videos, curriculum.

## Crawl + verification

After the edits, run:

```bash
rg -n "HammerReportCard|UhrcReportCard|UhrcAthleteSection|HammerReportCardAggregate|ReportCardTrendStrip|ReportCardGradeRibbon|CategoryPanel|BhCategoryPanels|UhrcDetailedAnalysis|FoilGradeCard|ShareCardExport|RecomputeReportCardButton|CameraAngleHelper|AnalysisProgressIndicator" src
rg -n "measured (biomech|grade|score|ranking|trend)" src
rg -ni "your tempo|your composite|your pillar|your report card|biggest leak|biggest win" src
```

Each call must return zero athlete-visible hits. Build + tests must pass.

## Deliverable doc

`.lovable/phase-49-release-product-lock.md` contains, in order:

1. Files deleted (full list).
2. Files edited with line-level summary.
3. Routes / mounts removed (athlete + coach side).
4. SAFE inventory (athlete surfaces that remain, what they read from).
5. Coaching-prompt sweep result.
6. Crawl verification output (the three `rg` commands + their post-edit results).
7. **Final Determination: YES or NO** to "Can this application be honestly released to the public without misleading athletes?" — supported only by the work above.

No roadmap, no proposals, no future plans in the document.
