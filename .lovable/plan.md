# Hammer Report Card — Full Integration Plan

## Why "Not detected yet" is rendering today
`analyze-video` returns narrative scoring only. The BP/BH specs read numeric keys (`energy_angle_deg`, `tempo_sec`, `premature_shoulder_open_deg`, `glove_drift_outside_frame_in`, `head_vertical_movement_pct`, `bat_path_score_10`, etc.) that don't exist on the analysis payload — so every tile falls through to missingness. Fix is to make the same AI call also emit a strict `metrics{}` block with confidences.

## Scope (confirmed)

- **Metric source:** extend `analyze-video` to ALSO return a structured `metrics{}` block in one call.
- **Missing-metric policy:** hybrid — soft signals always return `{value, confidence}`; only un-measurable cases (occlusion, wrong angle) return missing with a reason.
- **Formula depth:** codify everything now — full thresholds, X/10 sub-scores, non-negotiables, phase grouping.
- **BH tiles:** expand to 8, mapped to existing P1–P4 doctrine (`hittingPhases.ts`).
- **Top-line:** Letter grade A–F above the tiles.
- **Backfill:** on-demand per video via a "Recompute Report Card" button.
- **Integration surfaces:** Library/Saved-video detail, Coach view, Progress Dashboard trend tiles, Monthly/Vault recap aggregates.

---

## 1. Discipline metric contracts (`src/lib/reportCard/contracts/`)

One file per discipline declaring the exact metric keys, units, thresholds, weights, and non-negotiables. Single source of truth shared by both the AI prompt (server) and the tile compute (client).

- `bp.contract.ts` — 10 BP tiles (Energy Angle, Hip/Shoulder Sep [NN], Tempo, Stride Length, Head Stability [NN], Glove Control, Head at Release, Shoulder Tilt, Lift & Thrust, plus consistency 1–10 score for stride).
- `bh.contract.ts` — 8 BH tiles grouped P1–P4 (P1 Hip Load [NN], P2 Hand Load, P3 Stride Direction + Heel Plant/Landing, P4 Sequencing + Bat Path + Back Elbow + Hitter's Move Quality [NN]). NN caps from `hittingPhases.ts` (P1=80, P4=50).
- `throwing.contract.ts` — BP minus Energy Angle, Tempo, Lift & Thrust.
- `sb-pitching.contract.ts` — same as BP for now (windmill deferred, marked in spec).
- `sh.contract.ts` — same as BH.

Each contract exports: `metricKeys[]` (with `{key, unit, range, threshold, weight, nonNegotiable, confidenceRequired}`) and a `gradeFromTiles(tilesWithState[])` function returning A–F using passed-count, NN-fail caps, and missingness penalty.

## 2. AI metric extraction in `analyze-video`

Extend the existing single edge-function call:
- Build the structured-output schema dynamically from the active discipline's contract (`buildMetricsSchema(contract)`).
- Use AI SDK `Output.object` so the model returns both the existing narrative AND a `metrics: { [key]: { value, confidence: 0–1, missing?: true, missing_reason?: string } }` object in one call.
- Keep prompt prose, just append "Also return a strict `metrics` object per schema. Set `missing: true` with reason when occlusion/angle prevents measurement. Confidence reflects measurement quality, not how good the athlete is."
- Persist on the saved analysis row (existing analysis JSON gets a new `metrics` field — additive, no schema migration).

## 3. Wire metrics into tile compute

- Update `AnalysisLike` in `src/lib/reportCard/types.ts` to type `metrics?: Record<string, { value: number|boolean; confidence: number; missing?: boolean; missing_reason?: string }>`.
- Update each tile's `compute()` to read `{value, confidence}` and emit `TileState` with a `confidence` field. Low confidence (<0.5) renders an amber dot + tooltip; missing renders the existing "Not detected — <reason>" state.
- Add `score10` derivation per tile from raw value + threshold band (already partially there).

## 4. Top-line grade

- New `<ReportCardGradeRibbon />` above tiles: big letter A–F, "X of Y measured" missingness chip, "1 non-negotiable failed" red sub-chip when applicable.
- Computed from `contract.gradeFromTiles(tiles)`.

## 5. Cross-app integration

- **AnalyzeVideo (already wired):** verify report card now renders real values after AI changes.
- **Library / saved-video detail (`AthleteVideoLibrary`, `CoachAthleteDetail`):** render `<HammerReportCard analysis={savedAnalysis} />` in a tab next to the existing narrative. Add a "Recompute Report Card" button that re-invokes `analyze-video` on stored frames for backfill of old analyses.
- **Progress Dashboard / Athlete Command:** add a `<ReportCardTrendStrip />` showing per-metric pass-rate trend (last 5 sessions) for the athlete's primary discipline, pulled from a new `useReportCardTrend(athleteId, discipline)` hook.
- **Coach view:** mirror the athlete report card with an extra "Coach notes" textarea persisted per-tile.
- **Monthly report / vault recap edge functions:** include aggregated `nonNegotiablePassRate`, `tilesRegressed[]`, `topImprovement` derived from the same contracts so prose and report card never disagree.

## 6. Backfill path

- New small edge fn `recompute-report-card`: takes `videoId`, re-extracts frames (or uses stored frame URLs if present), calls metrics-only pass, patches the saved analysis row's `metrics` field. Triggered by the "Recompute" button on Library/Coach views.

## 7. Cleanup

- Remove vestigial `UhrcAthleteSection` / `UhrcReportCard` / `UhrcDetailedAnalysis` files now superseded by HammerReportCard (only after verifying no live imports).
- Delete the obsolete `src/lib/reportCard/v1/hittingV1Schema.ts` if not referenced after migration.

## Out of scope (deferred)
- SB windmill-specific pitching tiles (placeholder slot left in contract).
- ML-driven per-frame pose estimation (still using AI vision on extracted frames).
- Real-time tile updates during streaming analysis.

## Technical details

```text
analyze-video (edge)
  └─ generateText({ model, output: Output.object({ narrative, metrics }) })
        ↑ schema built from disciplineContract.metricKeys
  → returns { ...existingFields, metrics: {...} }

client AnalyzeVideo
  → analysis prop now carries metrics
  → <HammerReportCard /> tiles read analysis.metrics[key]
  → <ReportCardGradeRibbon /> computes grade from contract
```

Files touched (created/edited):
- `src/lib/reportCard/contracts/{bp,bh,throwing,sb-pitching,sh}.contract.ts` (new)
- `src/lib/reportCard/disciplines/{bp,bh,throwing}.ts` (rewire to contracts)
- `src/lib/reportCard/types.ts` (add confidence + grade types)
- `src/components/report-card/hammer/{ReportCardGradeRibbon,ReportCardTrendStrip,CoachTileNotes}.tsx` (new)
- `src/components/report-card/hammer/{HammerReportCard,ReportCardTile}.tsx` (grade + confidence UI)
- `supabase/functions/analyze-video/index.ts` (add structured `metrics` output)
- `supabase/functions/recompute-report-card/index.ts` (new, backfill)
- `supabase/functions/_shared/reportCardContracts.ts` (server mirror used to build Output schema)
- `src/pages/{AthleteVideoLibrary,CoachAthleteDetail,ProgressDashboard,AthleteCommand}.tsx` (surface card/trend)
- `supabase/functions/{generate-monthly-report,generate-vault-recap}/*` (consume aggregates)

## Validation
After build I'll: (1) run a real analysis and confirm every tile shows a value or a missing-reason — never blank; (2) verify the letter grade matches the tiles; (3) confirm Library "Recompute" backfills an old analysis; (4) check trend strip renders across ≥2 sessions.
