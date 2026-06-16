# Phase 0 Closeout — Completion Plan

Scope: finish G-1 (analyze-video integration), G-2 (Pass-2 retirement), G-3 (closeout evidence). No Phase 1 work.

## 1. Finish G-1 — Client upload wiring
- `src/pages/AnalyzeVideo.tsx` (and any sibling upload hook): compute `sha256HexOfBlob(file)` before upload; probe true FPS via `HTMLVideoElement` + `requestVideoFrameCallback` sampling; persist `sha256_hex`, `fps_true`, `duration_sec`, `width`, `height`, `orientation` on the `videos` row.
- Pass `video_sha256_hex` + `fps_true` into the `analyze-video` invocation payload so the edge function never has to re-hash.

## 2. Finish G-2 — Pass-2 retirement in recompute path
- `supabase/functions/recompute-report-card/index.ts`: strip any `pass2*` / `breadMissing` / `:pass2` branches; rewrite as a thin re-runner that loads the pinned `video_landmark_runs` row by `(video_id, landmark_model_version)` and re-derives events/metrics via the canonical engine. No model swapping.
- `src/components/report-card/hammer/RecomputeReportCardButton.tsx`: drop any UI affordance referencing Pass-2 retries.
- Dead-code sweep: remove legacy `replay_input_fingerprint = "input-only"` helpers and any orphaned Pass-2 utilities under `src/lib/biomech/` and `supabase/functions/_shared/`.

## 3. G-3 — Closeout evidence (the deliverable)
Post all five items in a single evidence reply:

1. **First real `video_analysis_runs` row** — `SELECT *` from the row produced by a live analyze-video call against a seeded test video.
2. **Outcome coverage** — four audit rows demonstrating `outcome IN ('ok','cache_hit','rejected','failed')` from forced scenarios (happy path, repeat upload, missing metadata, injected throw).
3. **Ripgrep proof** — `rg -n "pass2Model|pass2System|:pass2|pass-?2" supabase/functions/analyze-video supabase/functions/recompute-report-card src/` returning zero matches.
4. **Same-source-video twice → identical `cache_fingerprint_hex`** — two `video_analysis_runs` rows from two uploads of the same bytes, showing matching fingerprints and `cache_hit=true` on the second.
5. **Immutability negative test** — `UPDATE video_landmark_runs SET landmarks_sha256_hex='...' WHERE id='...'` failing with the `historical_landmark_immutable` trigger error; plus confirmation that `LANDMARK_MODEL_VERSION` bump creates a new row under `UNIQUE (video_id, landmark_model_version)`.

Also re-run `bunx tsx scripts/replay/verify-determinism.ts` and paste the exit-0 output, and run `bunx tsx scripts/lint-no-landmark-recency.ts` to prove no `.order('created_at')` lookups against landmark tables remain.

## 4. Request Phase 1 authorization
After evidence is posted and accepted, request explicit authorization to begin Phase 1 (WebCodecs deterministic frame extraction). No Phase 1 file is touched before that authorization.

## Technical notes
- Edge function changes auto-deploy; no manual deploy step.
- FPS probe must be deterministic — sample a fixed N=120 `requestVideoFrameCallback` ticks and report the median inter-frame delta inverted; fall back to `metadata.frameRate` only when the probe rejects (clip too short).
- `recordAnalysisRun` is already wired in `analyze-video`; the remaining work is ensuring the catch block and the early-rejection branch both call it exactly once.
- No schema changes anticipated; if FPS-probe fields are missing on `videos`, a single additive migration will be proposed inline before client wiring.

## Out of scope (explicitly deferred to Phase 1+)
- WebCodecs frame extractor, event detector implementation, metric engine, report-card determinism harness.
