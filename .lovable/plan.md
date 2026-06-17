# Phase 0 → Phase 1 Handoff Plan

Phase 0 (G-1, G-2, G-3) is implemented. This plan closes the loop by (a) posting the remaining Phase 0 evidence artifacts so the gate can be formally cleared, and (b) staging Phase 1 (WebCodecs deterministic frame extraction) — to be executed only after explicit Phase 1 authorization.

## A. Phase 0 Final Evidence Pack (no new code)

Produce a single evidence reply containing:

1. **First real `video_analysis_runs` row** — `SELECT *` from the latest live analyze-video invocation against a seeded test video.
2. **Outcome coverage matrix** — four rows, one per `outcome ∈ {ok, cache_hit, rejected, failed}`, each tied to the forcing scenario (happy path, repeat upload, missing metadata, injected throw).
3. **Ripgrep proof** — `rg -n "pass2Model|pass2System|:pass2|pass-?2|breadMissing" supabase/functions/analyze-video supabase/functions/recompute-report-card supabase/functions/_shared src/` → 0 matches.
4. **Fingerprint stability** — two `video_analysis_runs` rows from re-uploading identical bytes, showing matching `cache_fingerprint_hex` and `outcome='cache_hit'` on the second.
5. **Immutability negative test** — `UPDATE video_landmark_runs ...` failing with `historical_landmark_immutable`; plus a row pair under the same `video_id` but differing `landmark_model_version` proving the unique index permits version-bumped re-runs.
6. **Determinism + lint reruns** — `bunx tsx scripts/replay/verify-determinism.ts` (exit 0) and `bunx tsx scripts/lint-no-landmark-recency.ts` (clean).

No file edits are required for section A; it is a read-only evidence post executed via `supabase--read_query`, `code--exec` (rg + tsx), and `supabase--curl_edge_functions`.

## B. Phase 1 Staging — WebCodecs Deterministic Frame Extraction

Held until explicit Phase 1 authorization. When authorized:

1. **New module** `src/lib/biomech/extractFramesDeterministic.ts`
   - WebCodecs `VideoDecoder` + `MP4Box` (or `mp4-muxer` demux) to walk samples in decode order.
   - Pinned `frame_extractor_version` constant added to `src/lib/biomech/versions.ts`.
   - Deterministic frame selection: integer frame indices derived from `fps_true` and event-window seconds (no `currentTime` seeking, no rAF jitter).
   - Output: `Array<{ frameIndex, mediaTimeSec, bitmap: ImageBitmap }>` plus a `frames_sha256_hex` rolling hash over decoded RGBA bytes for replay certification.
   - Fallback path: if `VideoDecoder` is unavailable, throw `WEBCODECS_UNAVAILABLE` — no silent degradation to the legacy `HTMLVideoElement` seeker (per Eternal Laws / no hidden degradation).

2. **Retire `src/lib/frameExtraction.ts`**
   - Replace all call sites (currently only `AnalyzeVideo.tsx` / analyze-video client invoker) with the deterministic extractor.
   - Delete the file in the same change; add a `lint-no-legacy-frame-extraction.ts` guard.

3. **Fingerprint extension**
   - Add `frame_extractor_version` and `frames_sha256_hex` into `buildCacheFingerprint` inputs (additive, ordered append — preserves prior determinism of Phase 0 fixtures by keying new fields only when present, behind a `fingerprint_schema_version` bump recorded in `asb_engine_versions`).
   - Migration: additive columns on `video_analysis_runs` (`frame_extractor_version text`, `frames_sha256_hex text`) + index. No destructive change.

4. **Tests**
   - `src/lib/biomech/__tests__/extractFramesDeterministic.test.ts`: same input clip → identical `frames_sha256_hex` across 10 runs.
   - Extend `verify-determinism.ts` with the new fingerprint shape.

5. **Evidence for Phase 1 closeout** (mirrors Phase 0 G-3 format):
   - Determinism test output (10/10 identical hashes).
   - Two real uploads of the same bytes → identical `frames_sha256_hex` + `cache_fingerprint_hex`.
   - Ripgrep proof that `frameExtraction.ts` and its symbols are gone.
   - Audit rows showing the new extractor version pinned.

## C. Out of scope (deferred to Phase 2+)

- Event detector implementation.
- Metric engine recomputation.
- Report-card determinism harness.
- Landmark model version bump procedure (documented only).

## Sequencing

1. Post section A evidence pack now.
2. Wait for the user's explicit "Phase 1 authorized" message.
3. Execute section B in a single build pass, then post section B evidence.

No files are modified by this plan itself; section B file list above is the implementation contract for after authorization.