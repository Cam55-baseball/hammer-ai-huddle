# Finish Report Card v2 Rollout

Wrap the remaining integration tasks from the prior turn so the new BH doctrine, /100 meters, and pitching/throwing extraction fix are end-to-end.

## 1. Mirror BH contract on the server
File: `supabase/functions/_shared/reportCardContracts.ts` (or equivalent shared spec consumed by `analyze-video`)
- Add every new BH metric key from `src/lib/reportCard/contracts/bh.contract.ts` (P1 stability, P2 knee-lift timing ±150ms, P3 release timing ±120ms, on_plane_pct, time_to_contact_ms, bat_speed_through_contact_mph, back_elbow_at_contact_deg, eyes_head_tracking_score_100, finish_balance_score_100, plus the re-thresholded existing 8).
- Keep legacy `_score` (0–10) keys readable so old records still render; new extractions emit `_100` keys.
- Preserve unit, range, and worked-example prompt text per metric.

## 2. Strengthen metrics prompt + two-pass extraction
File: `supabase/functions/analyze-video/index.ts`
- `buildMetricsPromptBlock`: per-metric worked example (input frame description → expected value + confidence + missing_reason rules). Explicit "if you cannot see X, return missing — never guess".
- Two-pass: after pass 1, count missing keys. If `missing / total > 0.4` AND discipline ∈ {bp, throwing, bh}, run a second targeted pass that lists only the missing keys with a "look again specifically for these landmarks" preface. Merge: pass-2 values override only where pass-1 was missing.
- Pitching/throwing-specific: add landmark hints (rubber, plant foot, glove side, release frame, front-foot strike frame) and a stride/height calibration note (use full-body visible frames).

## 3. Auto-recompute on save + camera-angle helper
File: `src/pages/AnalyzeVideo.tsx`
- After analysis save (or after first render where `metrics` is empty/sparse), auto-invoke `recompute-report-card` once. Guard with a session-scoped flag so it doesn't loop.
- Camera-angle helper: small inline card above the upload control, discipline-aware (pitching → side-on, full body in frame, capture from leg lift through release; hitting → open-side or catcher-cam, full body, capture from load through finish; throwing → side-on, full body, capture from gather through release). Pure presentation.

## 4. recompute-report-card alignment
File: `supabase/functions/recompute-report-card/index.ts`
- Use the updated shared contract.
- Allow the two-pass path when invoked.
- Lineage-preserving: only writes `ai_analysis.metrics` (never feedback / scorecard / efficiency_score).

## 5. Verification
- Spot-check tile compute fallback: legacy `*_score` (0–10) records still produce a meter via `readScore100` fallback in `metricReaders.ts`.
- Confirm `ProgressDashboard` trend strip + `SessionDetailDialog` already consume the discipline ribbon (done in prior turn) — no further edits expected.
- No DB migrations. No edits to `client.ts` / `types.ts` / `.env` / `supabase/config.toml`.

## Out of scope
- Blast/Zepp sensor ingestion.
- Softball windmill-specific tiles.
- New scorecard formulas.
- Any backend schema changes.
