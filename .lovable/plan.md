# Finish wiring the Hammer Report Card

Foundation (types, specs for BP/BH/Throwing, `ReportCardTile`, `TileExplainerSheet`, `HammerReportCard`) is already built. This plan finishes integration.

## 1. Per-analysis toggle
- Add `src/components/report-card/hammer/AnalysisToggle.tsx`: segmented pill `[Report Card] [Analysis]`, Report Card default, controlled prop.
- In `src/pages/AnalyzeVideo.tsx`, wrap the result view with the toggle:
  - **Report Card tab** → `<HammerReportCard spec={...} state={...} />` resolved from the active discipline (BP / BH / BB-throw / SB-throw / SB-pitch / SH).
  - **Analysis tab** → existing detailed analysis output, unchanged.
- Discipline → spec resolver in `src/lib/reportCard/index.ts` (map sport+phase to spec).

## 2. Tile data adapter
- Add `src/lib/reportCard/adapters/fromAnalysis.ts`: pure function turning the existing analysis result payload into `TileState[]` for the active spec. Missing metrics render as visible "missing" state on the tile (no fabrication).
- No changes to the analysis pipeline itself.

## 3. Demolition / cleanup
- Remove `PieV2FrameTagger` usage and the user-frame-input step from `AnalyzeVideo.tsx` (auto-detection only).
- Remove any remaining universal "Hammer Report Card" block and standalone Hitting Phase tile from `ProgressDashboard.tsx` and `CoachAthleteDetail.tsx`; the report card now only appears per-analysis.
- Delete dead imports/components flagged after the above.

## 4. QA pass
- BP analysis → 10 tiles, non-negotiables (#3, #6) show "NON-NEGOTIABLE" pill, red banner on FAIL.
- BH analysis → 4 tiles grouped by §5.1 phases.
- Throwing (BB+SB) → BP tiles minus Energy Angle / Lift & Thrust / Tempo.
- SB Pitching → same 10 BP tiles (windmill-specific deferred).
- SH → identical to BH.
- Tap any tile → explainer sheet with What+Why / How to improve / Trend / Encouragement.
- Toggle persists per-analysis view; default = Report Card.

## Out of scope
Top-line overall score ring, SB pitching windmill-specific tiles, BH Hip Load/Hand Load tiles, analysis pipeline changes.
