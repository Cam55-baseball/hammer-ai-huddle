
# Phase 50 — Complete Release Verification Authority

This plan executes every automatable verification required to answer one question: *Can Hammers Modality be honestly released to athletes today?* No new architecture, no new measurement work, no new docs beyond the final verification report.

## Execution Sequence

### 1. Static Verification (no browser)
- `bunx tsgo --noEmit` — typecheck.
- `bunx vitest run --reporter=dot` — full unit/integration suite.
- Repository-wide `rg` sweeps for:
  - Athlete-facing claim strings: `report card`, `your tempo`, `your score`, `your grade`, `composite`, `ranking`, `trend`, `measured`, `MPI`, `/100`, letter grades in JSX.
  - Mount-point regressions: `HammerReportCard`, `UhrcReportCard`, `HammerReportCardAggregate`, `ReportCardTrendStrip`, `TheScorecard`, `RecomputeReportCardButton`, `AnalysisToggle`, `AnalysisProgressIndicator`, `CameraAngleHelper`, `PieV2CoachPanel` (athlete surfaces only).
  - Orphan routes: enumerate every `<Route>` in `src/App.tsx`, cross-check against `src/pages/`.
- Diff Phase-49 removal set vs. current tree to confirm no re-introductions.

### 2. Runtime Verification (Playwright, headless Chromium, viewport 1280×1800)
- Detect dev-server port; start if not running.
- Restore Supabase session from `LOVABLE_BROWSER_SUPABASE_*` env (status check first). If `signed_out`/`external_unmanaged`/`no_supabase`, document and walk public routes only.
- Crawl every athlete route discovered in step 1:
  `/`, `/athlete`, `/progress`, `/practice`, `/calendar`, `/daily-plan`, `/hammer`, `/analyze`, `/videos`, `/vault`, `/settings`, `/coach-share/*`, plus any report-card routes still registered.
- Per route capture: screenshot, console errors, failed network requests, visible/hidden/disabled components, empty/loading/error states, any misleading copy.

### 3. Video Execution
- Inventory `src/`, `public/`, `tests/`, `e2e/`, `supabase/` for `.mp4|.mov|.webm` fixtures.
- If a usable clip exists: drive `/analyze`, upload, run full analysis, screenshot every state (pre-upload, progress, results, drills, chat).
- If none exists: state that explicitly and produce a precise recording spec (sport, skill, angle, fps, duration, framing, lighting, file size, expected movement) sized so one clip satisfies the BP `tempo_sec` path end-to-end.

### 4. Defect Classification
Every observed issue tagged BLOCKER / HIGH / MEDIUM / LOW with: file, route, repro, athlete impact, release impact.

### 5. Final Report
Write `.lovable/phase-50-complete-release-verification.md` containing:
- Build/test results (raw exit codes + summaries).
- Per-route evidence table with screenshot paths under `/tmp/browser/phase-50/`.
- Claim-string violation table.
- Orphan/mount regression table.
- Video execution log or recording spec.
- Defect list.
- `REQUIRED HUMAN ACTIONS` section only for items proven non-automatable.
- Final determination: **YES — PUBLIC**, **YES — LIMITED BETA**, or **NO — BLOCKED**, justified solely by evidence captured in this phase.

## Non-Goals
- No code changes except fixing build/typecheck breakage that blocks verification itself.
- No new measurement engines, no new UI, no doctrine documents.
- No planning beyond the determination.

## Deliverable
A single doc — `.lovable/phase-50-complete-release-verification.md` — plus the screenshot/log artifacts it references, ending with one of the three allowed answers.
