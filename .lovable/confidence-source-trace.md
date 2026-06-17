# Confidence % — Source Trace

Status: **read-only trace. No formula changes. Label change shipped (see `bucket-a-changes.md §6`).**

## What the number on a report-card tile actually is

The per-tile confidence value displayed (currently surfaced only as a small warn dot when < 0.5) comes from:

1. The multimodal model emits, for each measurement field (e.g. `back_elbow_past_bb_deg`, `on_plane_pct`, `bat_path_score_100`), an object of shape `{ value: number, confidence: number }`.
2. `src/lib/reportCard/metricReaders.ts` reads that object and returns `confidence` straight through to the tile state.
3. `src/components/report-card/hammer/ReportCardTile.tsx` (line ~103) shows the warn dot only when `state.confidence < 0.5`.
4. The aggregate `confidence_summary_jsonb` column on `video_analysis_runs` (see `supabase/migrations/20260615141906_*.sql:188` and `supabase/functions/_shared/recordAnalysisRun.ts:22`) is a JSON map of per-field confidences persisted from the same model output.

## What the number IS

- The **model's self-reported confidence** that its own measurement of that field is correct.
- A number in `[0, 1]` (or `null`/missing).

## What the number IS NOT

- **NOT** a frame-coverage signal. It does not represent "how many frames had clean pose data."
- **NOT** a pose-quality / landmark-visibility signal.
- **NOT** a deterministic function of the source video. The same video re-analyzed can return a different confidence value (this is one of the things the determinism investigation will measure).
- **NOT** calibrated against ground truth. The model is rating its own answer.

## Honest label shipped

The tile tooltip now reads:
> *"Low model-stated measurement confidence (X%) — provisional. This is the model's self-reported confidence in the measurement, not a frame-coverage or pose-quality score."*

No invented number. Threshold (< 0.5 triggers the warn dot) unchanged.

## Flagged for determinism evidence package

Because the per-tile confidence comes from the model and not from a deterministic computation over pose data, the confidence value itself is a **candidate non-deterministic field**. The Phase 1 evidence package should diff `confidence_summary_jsonb` across repeated uploads of the same video and report:

- Are confidence numbers byte-identical across runs of identical bytes?
- If not, by how much do they vary?
- Does the warn-dot threshold (< 0.5) flip across runs for any field?

This is logged as an evidence-collection requirement, not a defect claim.
