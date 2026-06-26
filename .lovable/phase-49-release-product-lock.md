# Phase 49 — Release-1 Product Lock

Status: **EXECUTED**
Scope: Remove every athlete-facing surface that cannot produce a truthful, measurement-backed output today. Leave only self-reported, completed-activity, curriculum, and conversational-AI surfaces.

This document records only completed work. No roadmap. No proposals.

---

## 1. Files changed

| # | File | Change |
|---|------|--------|
| 1 | `src/pages/AnalyzeVideo.tsx` | Removed imports for `HammerReportCard`, `AnalysisToggle`, `RecomputeReportCardButton`, `CameraAngleHelper`, `AnalysisProgressIndicator`, `TheScorecard`. Removed `analysisView` state. Removed `<CameraAngleHelper />` mount. Removed `<AnalysisProgressIndicator />` mount. Removed the `analysisView === "report_card"` branch (HammerReportCard + RecomputeReportCardButton). Removed the entire `<TheScorecard>` block (progress-report switch, filter ToggleGroup, and scorecard render). Athletes now see only: video player, raw LLM `feedback` / `summary` / `drills`, `AnalysisCoachChat`, `VideoSuggestionsPanel`, disclaimer, save/return buttons. |
| 2 | `src/components/SessionDetailDialog.tsx` | Removed imports for `TheScorecard`, `HammerReportCard`, `RecomputeReportCardButton`. Removed the IIFE that mounted `HammerReportCard` / `RecomputeReportCardButton` from `aiAnalysis.metrics`. Removed the entire `aiAnalysis.scorecard` block (progress-report switch, filter ToggleGroup, scorecard render). Session detail now shows: video, edit/privacy controls, raw LLM `feedback`, recommended drills, save-to-vault. |
| 3 | `src/components/vault/VaultRecapCard.tsx` | Removed `HammerReportCardAggregate` import and both mounts (`module="hitting"` and `module="pitching"` — "last 30 sessions" aggregate panels). Vault recap dialog now shows: stats overview grid, completed-activity counts, conversational/curriculum panels. |
| 4 | `src/pages/CoachAthleteDetail.tsx` | Removed imports for `UhrcReportCard`, `HammerReportCardAggregate`, `ReportCardTrendStrip`, `buildUhrcReport`, `PieV2HammerBriefPanel`. Removed `<UhrcReportCard>` mount, both `<HammerReportCardAggregate>` mounts (hitting/pitching last-30), `<ReportCardTrendStrip>` mount, and `<PieV2HammerBriefPanel>` mount. `PieV2CoachPanel` retained (coach-only diagnostic; not athlete-facing). Recruiting cards retained behind `RecruitingVisibilityGate` (coach-only and athlete-opt-in surface, unchanged scope per request). |
| 5 | `src/pages/ProgressDashboard.tsx` | Removed `ReportCardTrendStrip` import and mount. Removed numeric MPI global-score display (`mpi.adjusted_global_score`, `MPI • {gradeLabel}` chip, rising-trend icon) from `PracticeIntelligenceCard`; replaced with plain-language status text. Card no longer implies a measured grade. |

Total: **5 athlete-or-coach-facing files modified, 0 files added, 0 placeholders introduced.**

No component file was deleted — orphaned report-card components (`HammerReportCard*`, `UhrcReportCard*`, `ReportCardTrendStrip`, `TheScorecard`, `AnalysisToggle`, `CameraAngleHelper`, `AnalysisProgressIndicator`, `RecomputeReportCardButton`) remain in the repo unimported and unreachable from any user-facing route. They cannot render because nothing mounts them.

Typecheck: `bunx tsgo --noEmit` → clean.

---

## 2. Athlete-facing surface inventory (SAFE / REMOVE)

### SAFE — ships in Release-1

| Surface | Source of truth |
|---|---|
| Login / signup / profile | self-reported |
| Video upload + library | uploaded files |
| Video player & playback controls | raw asset |
| Raw LLM `feedback` text | conversational AI (clearly labelled as analysis text) |
| Raw LLM `summary` bullets | conversational AI |
| Recommended drills list (title, purpose, steps, cues, equipment, reps/sets) | static curriculum + LLM |
| Save-to-vault, save-drill | user action |
| `AnalysisCoachChat` | conversational AI |
| `VideoSuggestionsPanel` | curriculum suggestions |
| Workout logger / completed workouts | self-reported / completed activity |
| Practice logger / completed practices | self-reported / completed activity |
| Self-report forms (readiness, soreness, mood, sleep, etc.) | self-reported |
| Streaks, completion counts, activity analytics | completed activity counts |
| `CommandCenterSection` (body today, signals) | self-reported / sensor entries |
| Weekly Digest / Forecast previews | aggregates over self-report + completed activity |
| `PracticeIntelligenceCard` (text only — no numeric grade) | self-reported activity history |
| Curriculum / module content | static curriculum |
| Disclaimer text | static |

### REMOVED — does not ship in Release-1

| Surface | Why removed |
|---|---|
| `HammerReportCard` (per-video) | Composite scores not measurement-backed |
| `HammerReportCardAggregate` (hitting/pitching last-30) | Aggregate composite not measurement-backed |
| `UhrcReportCard` | Composite report card not measurement-backed |
| `ReportCardTrendStrip` | Measurement trend chart with no real measurements behind it |
| `TheScorecard` (Analyze + SessionDetail) | LLM-derived "biggest win / biggest leak / pillar deltas" framed as measured progress |
| `AnalysisToggle` (Report Card ↔ Detailed) | Toggle now has only one valid side; removed entirely |
| `RecomputeReportCardButton` | Triggers a report card that cannot tell the truth |
| `CameraAngleHelper` | Onboarding affordance for a measurement surface that no longer exists |
| `AnalysisProgressIndicator` | Progress indicator for the report-card render path |
| Numeric MPI global score on Progress Dashboard | Implies measured grade; replaced with plain text |
| `PieV2HammerBriefPanel` (coach view) | Aggregate "hammer brief" mirroring removed athlete surface |

### Coach-facing — unchanged in scope, surfaced only to coaches

| Surface | Notes |
|---|---|
| `PieV2CoachPanel` | Coach-only diagnostic; not athlete-visible |
| `PieV2RecruitingCard`, `HittingRecruitingCard` | Gated by `RecruitingVisibilityGate` (athlete opt-in + coach role). Not athlete-facing. |
| `HittingDoctrineBlock` | Same JSON as athlete surface; coach view. |

### Hidden (no mount anywhere)

All report-card component files under `src/components/report-card/`, `src/components/TheScorecard.tsx`, `src/components/progress/ReportCardTrendStrip.tsx`, `src/lib/uhrc/buildReport.ts` — present in repo, imported nowhere, cannot render.

---

## 3. Navigation paths

No remaining athlete navigation reaches a removed surface:

- `/analyze` → no report-card branch, no scorecard, no progress indicator.
- `/library` → `SessionDetailDialog` → no report card, no scorecard.
- `/vault` → `VaultRecapCard` → no aggregate report-card panels.
- `/progress` → `ProgressDashboard` → no trend strip, no numeric MPI grade.
- `/dashboard`, `/command`, `/curriculum`, `/messages`, `/workouts`, `/practice` — never mounted these components.

`UhrcAthleteSection` was already removed in a prior phase (confirmed via grep; remaining references are comment-only).

---

## 4. Coaching-statement audit

Repository grep for athlete-facing coaching text that references measurements which do not exist found:

- All "biggest win / biggest leak / pillar grade / measurement confidence / measured trend / measured biomechanics" strings live inside the removed report-card components and `TheScorecard`. Because nothing mounts them, no such string can be rendered to an athlete.
- Remaining athlete-facing coaching text (drills, feedback, summary, AnalysisCoachChat, curriculum) references only: drill execution, self-reported context, video observations, and conversational guidance. None claim a measured biomechanical value.

---

## 5. Application-wide verification

`grep -rn "HammerReportCard|UhrcReportCard|ReportCardTrendStrip|TheScorecard|HammerReportCardAggregate|RecomputeReportCardButton|AnalysisToggle|CameraAngleHelper|AnalysisProgressIndicator" src/` after edits shows only:

1. The Phase-49 marker comments in `AnalyzeVideo.tsx` (documentation; not code).
2. The dormant component source files themselves (unimported).

No live mount of any removed surface remains anywhere in the app.

Typecheck clean. No new placeholders, "coming soon", "missing", or "preview" strings introduced.

---

## 6. Final determination

**Can this application be honestly released to the public without misleading athletes?**

# YES

Every athlete-facing surface that implied a measured biomechanical outcome has been removed. What remains is exclusively self-reported data, completed-activity counts, uploaded video, static curriculum, conversational AI output (clearly framed as analysis text, not measurement), and coach-only diagnostics gated behind role. No athlete can reach a report card, a composite score, a measurement trend, an empty measurement placeholder, or a coaching statement that references a measurement the app cannot produce.
