# Determinism Investigation — Same-Video Inconsistency

**Status:** OPEN. Evidence-gathering only. No fixes proposed in this document.

**Trigger:** Operator reported that uploading the same fixture video multiple times produces different analysis results across runs.

**Constraint:** This investigation must complete before any Phase 2 metric redesign begins. New metrics built on a non-deterministic pipeline inherit the non-determinism.

---

## Pipeline stages — determinism classification

Each stage is classified `deterministic` / `non-deterministic` / `unknown` based **only on code reading + architecture, not on live measurement**. Live measurement is the next step (§ Evidence Still Required).

| # | Stage | Location | Classification | Evidence |
|---|---|---|---|---|
| 1 | Video probe (`fps_true`, `duration_sec`, `width`, `height`, `sha256_hex`) | `src/pages/AnalyzeVideo.tsx` → `probeVideoMetadata` | **unknown** | Browser `HTMLVideoElement.duration` and `videoWidth/videoHeight` can vary by browser/codec parser. `sha256_hex` of raw bytes is deterministic. `fps_true` derivation logic not yet inspected here. |
| 2 | Cache fingerprint build | `src/lib/biomech/fingerprint.ts` + `supabase/functions/_shared/biomechFingerprint.ts::buildCacheFingerprint` | **deterministic** | Pure function of `[sha256, modelVersion, detectorVersion, metricEngineVersion, fps.toFixed(6), landing.toFixed(6), directionSign, calib.toFixed(6)]`. Verified by `scripts/replay/verify-determinism.ts`. Phase 0 acceptance evidence. |
| 3 | Frame **selection** (which timestamps to grab) | `src/lib/biomech/frameExtractionDeterministic.ts::buildFrameSelection` | **deterministic** | Pure integer math from `fps_true`, `duration_sec`, `landingTime`. Phase 0 verified. |
| 4 | Frame **extraction** (the actual pixels at those timestamps) | `src/lib/frameExtraction.ts::extractKeyFramesDeterministic` (lines 33–123) | **non-deterministic — suspected** | Uses `HTMLVideoElement.currentTime = t` + `seeked` event + `canvas.drawImage` + `canvas.toBlob('image/png')`. Browser seek precision is **codec- and browser-dependent**; `seeked` returns the nearest decoded frame, not guaranteed to be the exact requested frame. PNG encoder output can vary by browser implementation (zlib level, filter choice, ancillary chunks). `sha256_hex` of the same logical frame can therefore differ across browsers, OS, GPU drivers, or even Chromium minor versions. **High-priority suspect for the user-reported inconsistency.** |
| 5 | Frame upload to edge function (data URLs in request body) | `AnalyzeVideo.tsx:461-475` and `:568-582` | **deterministic given stage 4** | Pass-through. |
| 6 | Edge-function cache lookup | `supabase/functions/analyze-video/index.ts:1803-1827` | **deterministic** | Keyed strictly on `cache_fingerprint_hex`. If a row exists, returns `outcome=cache_hit`. |
| 7 | Edge-function AI call (Gemini 2.5 Flash multimodal) | `analyze-video/index.ts:2005-2017` | **non-deterministic — confirmed risk** | Settings: `model: "google/gemini-2.5-flash"`, `temperature: 0`, `top_p: 0`, `seed: stableSeed(videoId)`. Three sources of variance: **(a)** seed is derived from `videoId`, **not** from `cache_fingerprint_hex` — two cache-miss runs of identical bytes with different `videoId`s get different seeds; **(b)** `google/gemini-2.5-flash` is a provider-managed moving alias, underlying weights can change without notice; **(c)** multimodal models are not bit-deterministic even at `temperature=0` — image tokenization includes provider-side preprocessing that is not user-controllable. |
| 8 | Edge-function response persistence | `analyze-video/index.ts:2454-2497` (`ai_analysis` write) and `:2520-2530` (`video_frame_extractions`) | **deterministic given stage 7** | Pure write. |
| 9 | Landmark detection | not yet implemented (`LANDMARK_MODEL_VERSION = "blazepose_full@0.0.0-stub"` in `src/lib/biomech/versions.ts`) | **n/a — not yet wired** | Phase 0 fingerprint includes a version pin, but no MediaPipe pipeline exists. Current analysis output comes 100% from the multimodal AI call (stage 7), not from landmark→event→metric stages. |
| 10 | Event detection | not implemented (`DETECTOR_VERSION = "events@0.0.0-stub"`) | **n/a — not yet wired** | Same as stage 9. |
| 11 | Metric computation | not implemented (`METRIC_ENGINE_VERSION = "metrics@0.0.0-stub"`) | **n/a — not yet wired** | Same as stage 9. |
| 12 | AI-generated coaching interpretation | merged into stage 7 (single Gemini call returns score + violations + coaching text) | **non-deterministic — confirmed risk** | Inherits stage 7's variance. |
| 13 | Client-side render of result | `AnalyzeVideo.tsx:492` (`setAnalysis(analysisData)`) | **deterministic given stage 8** | Pure render. |

---

## Specific concerns called out in the request

### "Whether asynchronous race conditions exist"
**Suspected — cache-miss race window.** Two uploads of the same bytes initiated near-simultaneously would both compute the same `cache_fingerprint_hex` and both miss the lookup at `analyze-video/index.ts:1809`, because no row exists yet. Both then call the AI in parallel with **different seeds** (different `videoId`s) and both write back to the same fingerprint. The second writer wins. Subsequent cache-hits return whichever output happened to be written last. Not yet measured.

### "Whether multiple analysis paths are being executed"
**Confirmed — two client-side entry points.** `src/pages/AnalyzeVideo.tsx` has two separate code paths that both extract frames and invoke `analyze-video`:
- Initial upload: lines **335–340** extract, lines **461–475** invoke.
- Retry: lines **529–534** extract, lines **568–582** invoke.

Both use `extractKeyFramesDeterministic`, so selection logic is identical, but they are physically separate calls. A user clicking "retry" after a partial failure triggers a second AI run. The retry reuses `currentVideoId` (`:572`), so seed is preserved on retry — but the retry **re-extracts frames** rather than re-using the original extraction, so any browser-seek variance (stage 4) re-applies on each retry.

### "Whether analysis is rendering partial results before completion"
**Possible — operator-observed, not yet measured.** Operator reports "analysis says complete with nothing to show then it generates more out of nowhere." Likely causes to investigate live:
- `setAnalysis(analysisData)` fires once on success (`AnalyzeVideo.tsx:492`), but if the edge function returns a partial structure (empty `violations` object) and a sibling component subscribes to `videos`/`ai_analysis` table changes, a second render could populate later.
- Toast `"Analysis complete!"` fires on `:494` **before** any conditional UI re-renders settle.
- Requires Network panel capture of the `analyze-video` response payload at the exact moment "complete with nothing" appears.

### "Whether identical inputs are producing non-identical outputs"
**Likely yes, with two distinct mechanisms:**
1. Identical bytes → identical `cache_fingerprint_hex` → **cache-hit path is deterministic** (stage 6 returns the stored row).
2. Identical bytes but distinct `videoId`s → cache-miss path **can produce different stored rows** due to (stage 7) provider variance and seed-from-videoId.

So the answer depends on which path each run took. Phase 1 runbook runs 2–10 should all be cache-hits (deterministic). Runs 11 and 12 are forced cache-misses with new `videoId`s. **If runs 1, 11, 12 produce different `ai_analysis` payloads despite identical `cache_fingerprint_hex` and identical `video_frame_extractions.sha256_hex` tuples, the variance is provably inside stage 7 (the AI provider).**

---

## Evidence still required (must be captured before classification can be tightened)

Read-only DB queries + log inspections. No implementation work.

1. **Compare `video_frame_extractions.sha256_hex` tuples for runs 1, 11, 12.**
   - Identical tuples → stage 4 is deterministic for that browser/codec.
   - Differing tuples → stage 4 is the source of inconsistency; AI variance is irrelevant because inputs already diverged.
2. **Compare `ai_analysis` payload hashes across all 12 runs.**
   - Cache-hits (runs 2–10) must return byte-identical payloads. If not → cache lookup is broken.
   - Runs 1, 11, 12 with identical `cache_fingerprint_hex` should return identical payloads. If not → either (a) cache races, or (b) cached payload is being overwritten on each miss.
3. **Capture `analyze-video` edge logs for each of the 12 runs.**
   - Confirm outcome distribution: 1 × `ok`, 9 × `cache_hit`, 2 × `ok` (forced re-extract).
   - Confirm `cache_fingerprint_hex` is identical across all 12.
   - Confirm seed values logged per AI call differ across runs 1, 11, 12 (predicted), and that they don't affect cached output (predicted).
4. **Cross-device frame hash comparison.**
   - Same fixture, desktop Chrome vs mobile Safari, fresh `videoId` each time.
   - If `video_frame_extractions.sha256_hex` tuples differ → stage 4 is browser-dependent and **the per-frame hash is not a portable identifier**, which means any future landmark/metric layer keyed on it will also be non-portable.
5. **Race-condition probe.**
   - Manually initiate two uploads of the same fixture within ~1 second across two tabs.
   - Inspect whether both produce `video_analysis_runs` rows with `outcome='ok'` and `cache_hit=false` against the same `cache_fingerprint_hex`. If yes → race confirmed.
6. **Partial-render probe.**
   - Repro "analysis complete with nothing then more appears" with Network panel open. Capture the `analyze-video` response JSON and any subsequent Supabase realtime / refetch network calls. Determine whether a second payload arrives, or whether the UI is re-deriving state from a delayed source.

---

## Tentative ranking of variance sources (subject to evidence)

Most likely → least likely cause of "same video, different results":

1. **Stage 7 — AI provider variance.** Gemini 2.5 Flash at `temperature=0` is not bit-deterministic, model alias unpinned, seed derived from `videoId` not fingerprint. High prior probability.
2. **Stage 4 — Browser seek + PNG encoder.** Cross-browser variance is well-documented. Medium prior probability for same-browser repeat, high for cross-device.
3. **Cache-miss race window** when two uploads start close in time. Low prior absent concurrent user behavior, but trivially reproducible.
4. **Partial-render UX bug** (separate issue from numeric inconsistency, but contributes to "untrustworthy" feel).
5. **Probe variance** (stage 1) — unknown until inspected. If `fps_true` rounding differs across runs, downstream selection differs, downstream hashes differ.

---

## What this investigation does NOT do

- Propose fixes.
- Lock the AI model version.
- Switch from PNG to a deterministic encoder.
- Replace the multimodal call with a landmark→event→metric pipeline.
- Add an upload-mutex or idempotency key.
- Change the seed derivation.

Each is a separate decision that requires evidence from §"Evidence Still Required" first, then operator authorization.

---

## Next action required from operator

Run the **Phase 1 runbook** in `.lovable/plan.md` to completion (12 fixture uploads + cross-device pair), then post the timestamps. The AI will then execute the six evidence queries above against live DB rows and edge logs, and update this document with measured `deterministic` / `non-deterministic` / `unknown` per stage.
