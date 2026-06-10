## Goal
Ship the remainder of the Hammer Report Card overhaul: get the `analyze-video` edge function deploying with the structured `metrics{}` block, wire the on-demand backfill, and surface the new visual card everywhere it belongs.

## 1. Deploy fix — `analyze-video`
- Replace the invalid Deno object-spread used to build the dynamic tool schema with an explicit `Object.fromEntries(contract.tiles.map(...))` builder.
- Validate the model response against the contract before persisting: drop unknown keys, coerce numbers, default `confidence` to `0.5`, force `missing:true` when value is null/NaN.
- Persist `metrics` to `ai_analysis.metrics` and also stamp `ai_analysis.contract_version` so the client knows which contract produced it.
- Redeploy and curl-test with one BP and one BH sample to confirm metrics come back populated.

## 2. Backfill — `recompute-report-card`
- New edge function: input `{ video_id }`. Loads the saved video + transcript/analysis text, re-runs the same structured-metrics extraction path used by `analyze-video` (shared helper in `_shared/extractMetrics.ts`), writes back to `ai_analysis.metrics` + `contract_version`.
- UI: "Recompute Report Card" button on
  - Saved video detail
  - Library video detail
  - CoachAthleteDetail session card
- Button calls `supabase.functions.invoke('recompute-report-card', { body: { video_id }})`, then invalidates the report-card query.

## 3. Cross-app surfaces
- **Library video detail**: render `HammerReportCard` when `ai_analysis.metrics` exists; otherwise show empty state with Recompute CTA.
- **CoachAthleteDetail**: same card per athlete session, read-only.
- **Progress Dashboard**: add `ReportCardTrendStrip` (small) using `useReportCardTrend` hook — last 5 grades as colored chips + sparkline of 0–100 score.
- **Monthly Report / Vault Recap**: aggregate block showing
  - Average grade
  - Non-negotiable pass rate %
  - Top 3 regressions (tiles whose pass-rate dropped most month-over-month)

## 4. Polish on the spectacle layer
- Add Framer Motion mount stagger (ribbon → rail → tiles) — currently only count-up animates.
- Add `prefers-reduced-motion` guard to disable foil sweep + tilt.
- Add share-card export (html-to-image) behind a "Share" button — 9:16 PNG.

## 5. Out of scope
- SB windmill / throwing / SH visual upgrades (BP + BH only this pass).
- Real-time tile updates during analysis.
- Any schema migration — `ai_analysis.metrics` JSON column already exists.

## Technical notes
```
src/
  components/report-card/hammer/
    HammerReportCard.tsx          (mount stagger, share button)
    visuals/ShareCardExport.tsx   (new)
  hooks/useReportCardTrend.ts     (new)
  components/progress/ReportCardTrendStrip.tsx (new)
  components/library/...          (Recompute button + card mount)
  pages/CoachAthleteDetail.tsx    (card mount)
  components/recap/ReportCardRecapBlock.tsx (new)
supabase/functions/
  _shared/extractMetrics.ts       (new — shared by analyze-video + recompute)
  _shared/reportCardContracts.ts  (exists)
  analyze-video/index.ts          (deploy fix + use extractMetrics)
  recompute-report-card/index.ts  (new)
```

## Questions before I build
1. **Recompute cost guard** — should I rate-limit recompute (e.g. 1/min/user, or only allow if `contract_version` is stale)? Or unlimited for now?
2. **Trend strip placement** — Progress Dashboard top (above existing tiles) or inside the existing "Recent Analyses" section?
3. **Share card** — include athlete name + date watermark, or keep it anonymous so they can share publicly without exposing identity?
