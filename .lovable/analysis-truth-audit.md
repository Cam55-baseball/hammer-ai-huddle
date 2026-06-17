# Phase 1.75 — Analysis Truth Audit

Evidence-only. Every claim cites a file path and line range. No fixes, no copy changes, no proposals, no roadmap. Where a runtime claim cannot be made from code alone, it is marked **undetermined from code — runtime evidence needed**.

Scope: Baseball Hitting (BH). Pitching/throwing share the edge function but the report-card tile set audited here is BH.

---

## S1 — Report card phase percentages (1/2/3/4 circles)

**What renders.** Each phase orb shows: (a) a count badge with `p.count` (total tiles in that phase, line 92), and (b) a percentage label `${Math.round(p.passRate * 100)}%` or `"—"` when nothing was measured (`src/components/report-card/hammer/visuals/PhaseRail.tsx:63, 97-99`).

**Where the percentage comes from.** Built in `HammerReportCard.tsx:56-76`:
```
passRate = passed / measured   // where measured excludes status === "missing"
```
`passed` counts only tiles whose status is `"pass"` or `"elite"` (line 65). `"warn"` and `"fail"` count as not-passed. `"missing"` is excluded from the denominator entirely.

**What the number IS.**
- It is a **pass-rate of measured tiles in that phase**, expressed as a percent.
- It is NOT an athlete score, NOT a 0–100 quality score, NOT a confidence value, NOT a completion percentage, NOT a phase-quality composite.
- Example: P4 has 9 tiles. If 7 were measured and 5 were pass/elite, the orb shows `71%`.

**Max / min.** Max 100% (every measured tile pass/elite). Min 0% (no measured tile pass/elite). 100% IS achievable, including with some tiles missing — missing tiles are simply omitted from the denominator. There is no visible cue distinguishing "5/5 pass" from "5/9 pass with 4 missing" beyond the small count chip (which shows TOTAL not MEASURED).

**Color tiering.** `PhaseRail.tsx:46-60`: `passRate >= 0.85` → pass color; `>= 0.5` → warn; else fail; `measured === 0` → muted.

**Interpretability.** A user looking at "P4 — 71%" with no legend has no way to know it is a pass-rate over measured tiles only. The count badge shows the total count (e.g. "9") not the measured/passed split. The tile pass/elite definitions (and what counts as "measured") are not surfaced next to the orb.

**Tile-level numbers vs phase percent.** Individual tiles in `score_meter` mode render their own `score100` value (`ReportCardTile.tsx:81-85`) on a 0–100 scale. That number is a discrete per-tile score and is unrelated to the phase orb percent.

---

## S2 — Current metric inventory

Source of truth: `src/lib/reportCard/disciplines/bh.ts` (tile specs + compute) and `src/lib/reportCard/contracts/bh.contract.ts` (prompt + emitted fields).

All numeric/boolean metrics are produced by the Gemini 2.5 Flash AI model under a structured tool-call (`supabase/functions/analyze-video/index.ts:2012-2167`). The model returns a `metrics` object keyed by the contract field names; tile `compute` functions read those values via `readNumber` / `readBool` / `readScore100` in `src/lib/reportCard/metricReaders.ts`. There is no client-side or server-side geometric computation from landmarks — the "landmark" / "detector" / "metric_engine" versions in `biomechFingerprint.ts:10-13` are explicit stubs (`@0.0.0-stub`).

| Tile (key) | Display Name | Definition (per contract prompt) | How measured today | Data source (field) | Confidence logic | Missing / failure conditions |
|---|---|---|---|---|---|---|
| `hip_load` | Hip Load Stability | Score 0–100 of stability of back-hip load through P2 (`bh.contract.ts:19-20`) | AI score | `hip_stability_score_100` (legacy fallback `hip_load_score_10` ×10, `bh.ts:31`) | Model-emitted `confidence` field, surfaced verbatim (`metricReaders.ts:17-21`) | Model emits `missing: true` with `missing_reason`, OR field absent → tile shows "missing" |
| `hand_load` | Hand Load | Score 0–100 bat/scap/knob load behind head after P1 stable (`bh.contract.ts:30-31`) | AI score | `hand_load_score_100` | Model-emitted | Same as above |
| `p2_timing` | P2 Timing → Knee Lift | TRUE if hand load finished by pitcher peak knee lift; early acceptable; FALSE only if still unfinished after peak (`bh.contract.ts:38-39`) | AI boolean | `p2_timing_pass` (`bh.ts:70`) | Model-emitted | Model instruction: missing with reason `'Pitcher knee lift not in frame'` |
| `eyes_tracking` | Eyes / Head Tracking | Score 0–100 head/eye steadiness (`bh.contract.ts:48-49`) | AI score | `eyes_track_score_100` | Model-emitted | — |
| `stride_direction` | Stride Direction | Signed degrees off square; pass if `|deg| ≤ 15` (`bh.contract.ts:59-60`; `bh.ts:112`) | AI number, client thresholds | `stride_dir_deg_off_square` | Model-emitted | Field absent / `missing:true` |
| `heel_plant` | Heel Plant / Landing | 0–100 landing quality (`bh.contract.ts:68-70`) | AI score | `heel_plant_score_100` | Model-emitted | — |
| `p3_timing` | P3 Timing → Release | Signed ms from pitcher release to front-foot-down; 0 = perfect (`bh.contract.ts:79-80`) | AI number, client scoring curve (`bh.ts:148-168`) | `p3_release_offset_ms` | Model-emitted | Model instruction: missing if release or full-foot-down not visible |
| `hands_outside_shoulders_at_landing` | Hands Outside Shoulders at Landing | TRUE if hands sit horizontally outside back-shoulder line at front-foot strike (`bh.contract.ts:87-88`) | AI boolean | `hands_outside_shoulders_at_landing_pass` | Model-emitted | Model instruction: missing if hands or back shoulder not visible |
| `sequencing` | Sequencing | TRUE if Load legs → Load hands → Pause → Stride → Pause → Contact order held (`bh.contract.ts:97-98`) | AI boolean | `sequencing_ok` | Model-emitted | — |
| `bat_path` | Bat Path In/Out of Zone | 0–100 entry/exit/on-plane window quality (`bh.contract.ts:107-108`) | AI score | `bat_path_score_100` | Model-emitted | — |
| `on_plane` | On-Plane % | % of swing arc on the incoming pitch plane (`bh.contract.ts:117-118`) | AI number | `on_plane_pct` | Model-emitted | — |
| `time_to_contact` | Time to Contact | ms from first forward bat movement to ball-barrel contact (`bh.contract.ts:127-128`) | AI estimate from frames | `time_to_contact_ms` | Model-emitted | — |
| `bat_speed_contact` | Bat Speed Through Contact | Estimated barrel speed AT contact in mph (`bh.contract.ts:137-138`) | AI estimate | `bat_speed_contact_mph` | Model-emitted | Model instruction: missing with reason `'Frame rate too low for bat speed estimate'` |
| `back_elbow_contact` | Connection & Barrel Delivery | 0–100 connection across P4 launch → barrel delivery → contact; blind-spot minimization (`bh.contract.ts:147-148`) | AI score | `connection_barrel_delivery_score_100` | Model-emitted | Model instruction: missing if launch / extension-start / barrel-delivery / contact not identifiable |
| `hitters_move` | Hitter's Move Quality | 0–100 hands-back/elbow-leads/no-cast/barrel-last (`bh.contract.ts:157-158`) | AI score | `hitters_move_score_100` | Model-emitted | — |
| `shoulder_plane_steadiness` | Shoulder Plane Steadiness | 0–100 steadiness of shoulder plane from rotation start to contact (`bh.contract.ts:167-168`) | AI score | `shoulder_plane_steadiness_score_100` | Model-emitted | — |
| `finish_balance` | Finish & Balance | 0–100 post-contact balance / no fall-off / two-hand finish (`bh.contract.ts:177-178`) | AI score | `finish_balance_score_100` | Model-emitted | — |
| `shoulder_to_shoulder_hold` | Shoulder-to-Shoulder Hold | % of landing→contact window where hand-to-back-shoulder distance ≥ 90% of D0 (`bh.contract.ts:187-188`), with auto-FAIL when `front_shoulder_leak_before_contact` is TRUE (`bh.ts:404-423`) | AI number + AI boolean override | `shoulder_to_shoulder_hold_pct_to_contact`, `_pass`, `front_shoulder_leak_before_contact`, `front_shoulder_leak_pct_of_window` | Model-emitted; `min` of confidences when combined (`bh.ts:414-417`) | Missing if pct + boolean both absent |

**Confidence semantics.** Every tile's "confidence" badge comes from a model-emitted number on the same metric object. Tile UI surfaces "Low model-stated measurement confidence (X%) — provisional. This is the model's self-reported confidence in the measurement, not a frame-coverage or pose-quality score." (`ReportCardTile.tsx:103-106`) — so the system is honest at the tooltip level that this is self-reported.

**Single-pass enforcement.** After the first AI tool-call response, any contract field still missing or flagged missing is overwritten to `{ missing: true, missing_reason: "single_pass_only", confidence: 0 }` (`analyze-video/index.ts:2253-2272`). There is no second-pass model escalation.

---

## S3 — Connection & Barrel Delivery vs (legacy) Connect & Move

The user mentions "Connect & Move" alongside "Barrel Delivery" as potentially overlapping. The current contract has only **one** tile in this area: `back_elbow_contact` → "Connection & Barrel Delivery" (`bh.ts:302-321`, `bh.contract.ts:140-149`).

- Sole input field: `connection_barrel_delivery_score_100` (0–100).
- Prompt definition: connection + barrel delivery across P4 launch → barrel-delivery → contact window; explicitly tells the model "Do not use the old 'back elbow past belly button at contact' formula" (`bh.contract.ts:148`).
- There is **no separate `connect_and_move_*` field, no separate tile** in `bh.ts` or `bh.contract.ts`. `rg -n "connect_and_move|connect_move|connection_move"` over `src/` and `supabase/functions/` returns no matches.

**Conclusion:** As of this audit there is no duplication in code — the two labels collapse to a single tile/field. If "Connect & Move" was a label that appeared in past UI copy or in the bucket-A change log, it does not exist as a live metric today. **Undetermined from code:** whether older labels are still visible anywhere outside `bh.ts` (e.g. translation strings, screenshots) — `rg "Connect.*Move"` in `src/i18n/locales/en.json` would need a runtime check against the rendered UI to confirm zero stale references.

---

## S4 — Bat Path vs On-Plane %

Two distinct tiles, two distinct fields, but the prompt definitions overlap substantively.

| | `bat_path` (Bat Path In/Out of Zone) | `on_plane` (On-Plane %) |
|---|---|---|
| Field | `bat_path_score_100` | `on_plane_pct` |
| Units | 0–100 score | 0–100 percent |
| Prompt | "elite bat path: enters behind ball, exits in front, long on-plane window" (`bh.contract.ts:107-108`) | "Percentage of the swing arc that stays on the plane of the incoming pitch" (`bh.contract.ts:117-118`) |
| Tile compute | `scoreMeterState(value, conf, 65, 88)` (`bh.ts:224-228`) | `scoreMeterState(value, conf, 60, 85)` (`bh.ts:244-248`) |

**Shared signals.** The Bat Path prompt explicitly references "long on-plane window" as part of its scoring criterion — which is the same construct On-Plane % measures directly. Both are answered by the same AI model from the same frame set in the same tool-call, so they cannot be statistically independent.

**Difference in code.** Bat Path is a holistic 0–100 quality score that includes entry/exit AND on-plane window. On-Plane is the isolated % of arc on plane. The contract does not instruct the model to remove the on-plane component from Bat Path before scoring, so the two outputs are expected to correlate strongly.

**Pitch plane vs swing path.** On-Plane references "the plane of the incoming pitch" (contract line 118). Bat Path references the bat's behavior through the zone — "enters behind ball, exits in front" implies the swing path's relationship to ball trajectory but does not name the pitch plane explicitly. Neither field carries the actual pitch trajectory as an input.

**User distinguishability:** The two tile standards as currently shipped read as "Enters behind ball, exits in front, long on-plane window" vs "Percentage of the swing that stays on the pitch plane" (`bh.ts:215, 234`). A user without the prompt definitions in hand would reasonably read both as "is your swing on the right path." There is no copy that explains "Bat Path = composite quality, On-Plane = isolated %." See `.lovable/bat-path-vs-on-plane-definitions.md` for the proposed disambiguation memo (out of scope for this audit).

---

## S5 — Repeatedly-undetected metrics

For each listed metric, the path is: AI model → contract field → `readNumber`/`readBool` in tile compute → `missingState(...)` when the model returned `{ missing: true, ... }` or omitted the field.

There is no client-side detection logic, no pose-landmark gating, no frame-rate gate other than the upfront `PHASE1_MIN_FPS = 24` reject in the edge function (`analyze-video/index.ts:1749, 1776-1778`). All "missing" verdicts originate inside the AI model's response.

| Metric | Contract field | Model-instructed missing-reason | Required visible anchors (per prompt) | Failure category (from code) |
|---|---|---|---|---|
| P2 Timing → Knee Lift | `p2_timing_pass` | `'Pitcher knee lift not in frame'` (`bh.contract.ts:39`) | Visible pitcher peak knee lift | Camera/framing — pitcher must be in frame and peak knee lift must occur during sampled window |
| P3 Timing → Release | `p3_release_offset_ms` | "missing anchor" (release frame or full-foot-down frame) (`bh.contract.ts:80`) | Pitcher release frame AND hitter full-foot-down frame, both within sampled frames | Camera/framing + frame sampling (7 frames at fixed percentages or ±0.4s around landingTime) |
| Hands Outside Shoulders | `hands_outside_shoulders_at_landing_pass` | `'Hands or back shoulder not visible at landing'` (`bh.contract.ts:88`) | Hands AND back shoulder both visible at front-foot-strike frame | AI vision / occlusion / camera angle |
| Bat Speed | `bat_speed_contact_mph` | `'Frame rate too low for bat speed estimate'` (`bh.contract.ts:138`) | Sufficient temporal resolution to estimate barrel speed | Frame rate / motion blur — also exposes the audit-truth issue that there is NO calibration (S6) |
| Time to Contact | `time_to_contact_ms` | No explicit missing-reason string in prompt (model is told to "Estimate from the visible frames using the displayed frame rate context") (`bh.contract.ts:127-128`) | First-forward-bat-movement frame AND contact frame within sample | AI estimation; "missing" routed through the generic single-pass-only catch-all |

**Sample-set limits applicable to all of the above.** The client extracts at most 7 frames per video (`src/lib/biomech/frameExtractionDeterministic.ts:11-12`): either at fixed percentages `[0.10, 0.25, 0.40, 0.50, 0.60, 0.75, 0.90]` of clip duration, or at fixed offsets `[-0.4, -0.2, -0.1, 0, +0.1, +0.2, +0.3]` seconds around a user-marked landing time. If pitcher release, peak knee lift, contact, or full-foot-down do not happen to land within those 7 snapshots, the relevant model anchors are not visible and the metric must come back missing.

**Frequency of failure:** **Undetermined from code — runtime evidence needed.** The audit table `video_analysis_runs` and `videos.ai_analysis.metrics` would need to be queried to compute miss-rates per field.

**Classification per metric (code-only inference):**
- P2 timing miss → camera/framing + 7-frame sampling.
- P3 timing miss → camera/framing + 7-frame sampling + missing per-frame anchor detection (no detector, all model-judged).
- Hands-outside-shoulders miss → AI vision (occlusion / camera angle / pose ambiguity at landing frame).
- Bat speed miss → frame-rate + no calibration available (no bat length, no pixel/inch scale ever sent to model — see S6).
- Time-to-contact miss → AI estimation + 7-frame sampling (start-of-swing and contact frames must both be in sample; the prompt does not even pin down "first forward movement of the bat" with any landmark).

None of these failures route through a "missing implementation" path — the contracts exist and the model is instructed to emit them. The category is **AI/vision capability + sampling density**, not "missing implementation."

---

## S6 — Bat speed audit

**Formula.** None in code. There is no client-side or server-side computation of bat speed. The value comes verbatim from the AI model under the field `bat_speed_contact_mph` (`bh.contract.ts:131-138`).

**Units.** mph (per contract `unit: "mph"`, range `[30, 110]`).

**Inputs.** Whatever frames the model sees. No bat length, no pixel-per-inch calibration, no bat-detection landmark, no temporal stride pinning beyond the sampled frame timestamps, no athlete height context sent for scaling. `calibration_h_px` exists on the `videos` row and feeds the cache fingerprint (`biomechFingerprint.ts:65`) but is not sent into the prompt or used by any compute step — it is currently `0` for every video (`AnalyzeVideo.tsx:424-441` does not set it).

**Assumptions baked in.** That a vision model can convert pixel motion across at most 7 sampled frames (0.1s apart at the densest setting) into a calibrated mph number without knowing real-world scale.

**Direct or estimated.** Estimated, entirely by the model. There is no sensor data path, no Doppler input, no bat-tracking module.

**Calibration required.** Not collected, not sent, not used.

**Expected range.** Contract clamps the schema to `[30, 110]` mph but the tile thresholds are `≥65 mph` pass / `≥75 mph` elite (`bh.ts:281, 293-294`).

**Why users may see unbelievable numbers.** No calibration → mph is essentially the model's guess from pixel motion. Sampling at ±0.1s around landing means the contact event may be 30–80ms off the nearest sampled frame, and there is no inter-frame motion vector input.

**Known weaknesses.** Listed above. Additionally: a single low-fps phone clip will trigger the "Frame rate too low" missing-reason string and the value never appears.

---

## S7 — Time to Contact audit

**Formula.** None in code. Sole source is the AI field `time_to_contact_ms` (`bh.contract.ts:121-128`).

**Start-frame definition (per prompt).** "the moment the bat first starts moving forward" (`bh.contract.ts:127`). No landmark, no detector — model self-determines from the sampled frames.

**Contact-frame definition (per prompt).** "ball-barrel contact." Same — model self-determines.

**Inputs.** Same sampled-frame set as the rest of the model's tool-call. The prompt instructs the model to "Estimate from the visible frames using the displayed frame rate context"; the frame timestamps and `fps_true` are part of the wider prompt context but there is no explicit per-frame timestamp annotation in the multimodal payload.

**Units.** ms, schema-clamped `[80, 400]`, tile pass `≤175`, elite `≤150` (`bh.ts:254-268`).

**Direct or estimated.** Estimated by AI.

**Known weaknesses.**
- 7-frame sample at fixed percentages or ±100ms around landing can easily place "start of swing" and "contact" between frames; the model is asked to interpolate without any motion-vector input.
- The "start of bat forward movement" anchor is purely visual and subject to model interpretation of motion-blurred bat frames.
- No sensor input.
- For shorter swings (sub-150ms) the temporal sampling spacing is on the order of the entire quantity being measured.

**Why users may see unbelievable values.** Same as S6 — there is no ground-truth temporal anchor; the value is a vision-model estimate from sparse frames.

---

## S8 — Failed analysis investigation

**Upload path (`AnalyzeVideo.tsx:307-509`).** Order: probe metadata → extract frames → upload video to storage → generate+upload thumbnail → insert `videos` row with `status: "uploading"` → invoke `analyze-video`. Throw points:

| Path | Behavior on failure | User signal |
|---|---|---|
| `probeVideoMetadata` throws | Toast `videoAnalysis.probeFailed`; `setUploading(false)`; return (`AnalyzeVideo.tsx:318-323`) | Toast only; no `videos` row created |
| `extractKeyFramesDeterministic` throws or returns `<3` frames | Toast `videoAnalysis.frameExtractionFailed`; return (`AnalyzeVideo.tsx:365-371`) | Toast only |
| Storage `upload` error | Caught in outer try, toast + `setAnalysisError`; `videos` row may not exist yet (`AnalyzeVideo.tsx:381-385, 500-504`) | Toast |
| `generateVideoThumbnail` throws | Caught locally; honest toast `videoAnalysis.thumbnailFailed`; **analysis proceeds without thumbnail** (`AnalyzeVideo.tsx:407-421`) | Toast |
| `videos` insert error | Outer catch, toast (`AnalyzeVideo.tsx:444, 500-504`) | Toast |
| `supabase.functions.invoke("analyze-video")` returns `analysisError` | Toast variant by `429` / `402` / generic; `setAnalysisError` set; `setAnalyzing(false)` (`AnalyzeVideo.tsx:481-494`) | Toast + error block |
| Edge function returns success but with degraded payload | Whatever the function returned is written to UI state via `setAnalysis(analysisData)` (`AnalyzeVideo.tsx:496`) | No client-side check that `analysisData.metrics` is non-empty or that `summary.length > 0` |

**Edge function failure-to-status mapping (`analyze-video/index.ts`).**
- Phase 0/1 rejections (missing sha, missing probe, low fps, low resolution, bad duration, excessive dropped frames) write an audit row with `outcome: "rejected"` and return 422 without touching `videos.status`, which remains whatever it was at insert (typically `"uploading"`) (`index.ts:1710-1791`).
- AI gateway non-OK responses: `videos.status` is set to `"failed"` with `ai_analysis = { error }`, then the function throws to the outer catch which writes a `failed` audit row (`index.ts:2180-2207`, `2600-2622`).
- Success path: `videos.status = "completed"`, full `ai_analysis` written (`index.ts:2463-2472`), then audit row with `outcome: "ok"` (`index.ts:2493-2509`).

**Can "complete" coexist with empty content?** Yes. The success path runs even if `toolCalls` is empty/malformed — the `try/catch` around `JSON.parse(toolCalls[0]...)` (`index.ts:2238-2408`) only logs `"Error parsing tool call arguments"` and continues; defaults are `efficiency_score = 75`, `feedback = "No analysis available"`, `summary = []`, `metrics = null`. Then at line 2419-2423 the empty summary is synthesized via `makeBeginnerBullets(feedback, positives)`. The video is still marked `completed` and written. **An analysis with all-default content and `metrics: null` can be presented to the user as a successful run.**

**Race conditions.**
- `videos.status` flips: `"uploading"` (insert) → `"processing"` (edge function `index.ts:1847`) → `"completed"` or `"failed"`. There is no atomicity around the cache pre-check + processing flip; two concurrent invocations on the same `videoId` could both miss the cache and both call the model.
- The cache check requires both an `outcome: "ok"` audit row AND `videos.status === "completed"` AND `videos.ai_analysis !== null` (`index.ts:1816`). If any one is out of sync, the path falls through to a fresh model call.

**Retry path vs initial path (`AnalyzeVideo.tsx:handleRetryAnalysis` at 511-619).**
- Same probe and same deterministic frame extraction logic as initial.
- **Does NOT re-upload the video** (uses `currentVideoId`).
- **Does NOT touch the `videos` row** before calling the edge function — initial path sets `status: "uploading"`, retry leaves whatever the prior status was. The edge function's `status === "processing"` flip on cache miss will overwrite it.
- Otherwise identical edge-function call.

**Honest surfacing.** Failures inside the edge function persist `videos.ai_analysis = { error: { code, message } }` (`index.ts:2180-2186`) but the client toast layer at `AnalyzeVideo.tsx:481-494` only inspects `analysisError`/`analysisData.status` for the 429/402/generic branch — it does not inspect whether `analysisData.metrics === null` or whether `summary` is empty. There is no UI surface that says "analysis returned no metrics."

---

## S9 — Same-video nondeterminism investigation (highest priority)

**Cache key (`supabase/functions/_shared/biomechFingerprint.ts:53-67`).** Derived from: `videoSha256Hex`, three stub engine versions, `fpsTrue.toFixed(6)`, `landingTimeSec.toFixed(6)`, `directionSign`, `calibrationHpx.toFixed(6)`. Prompt text, model id, athlete context are explicitly excluded by design.

**Cache hit path (`analyze-video/index.ts:1805-1844`).** Looks up a prior `video_analysis_runs` row with the same `cache_fingerprint_hex` AND `outcome: "ok"`. If found and `videos.ai_analysis` is non-null and `videos.status === "completed"`, returns the cached `ai_analysis` verbatim. **Deterministic.**

**Cache miss path.** Calls AI gateway with `model: "google/gemini-2.5-flash"`, `temperature: 0`, `top_p: 0`, `seed: stableSeed(videoId)` (`index.ts:2012-2016`). Same `videoId` → same seed.

**Sources of nondeterminism, ranked by likelihood:**

1. **Vendor-side model nondeterminism (highest).** `temperature: 0` + `top_p: 0` + fixed `seed` is best-effort, NOT a guarantee. Gemini 2.5 Flash via the Lovable AI gateway is not contractually deterministic; backend model versioning, sampler implementation, and batching can change output across runs even with identical inputs. **Undetermined from code** — requires running the same payload back-to-back and diffing the tool-call arguments.
2. **`fps_true` probe drift on the client.** `probeVideoMetadata.ts:48-93` measures inter-frame deltas from `requestVideoFrameCallback` and snaps to a standard rate "when within 0.5 fps" of `[23.976, 24, 25, 29.97, 30, 50, 59.94, 60, 120]`. Anything outside that window is rounded to 3 decimals. On a slow device, fewer samples can drift the median; same bytes, different devices → potentially different `fps_true`. Different `fps_true` → different cache fingerprint → cache miss → fresh model call.
3. **`landingTime` user input.** If the user marks a different landing time on different uploads of the same video, both the cache fingerprint (`landingTimeSec.toFixed(6)`) and the extracted frame set differ. The same video uploaded twice with `null` landing vs with a user-marked landing will produce two different runs.
4. **Prompt assembly is `videoId`-dependent in the seed.** `seed: stableSeed(videoId)` (`index.ts:2016, 48-56`). Same video uploaded as a new row gets a NEW `videoId` UUID, so the seed changes, AND the cache key remains the same on the bytes-level (sha256 is identical) but the cache lookup keys on `video_id` (`index.ts:1810`), so a brand-new upload row will never hit a prior run's cache.
5. **Cache lookup is per-`video_id`, not per-fingerprint.** `index.ts:1807-1814`: `.eq("video_id", videoId).eq("cache_fingerprint_hex", cacheFingerprintHex)`. So re-uploading the exact same bytes as a new row in `videos` will always re-run the model regardless of fingerprint identity.
6. **Frame extraction is deterministic** assuming identical PNG encoding. `frameExtractionDeterministic.ts` uses integer-index math and `currentTime = index / fps_true`. Hash is taken on PNG bytes (`frameExtraction.ts:101`). PNG encoding via `canvas.toBlob(..., "image/png")` is implementation-defined per browser — **byte-identical PNGs are not guaranteed across browsers/runtime versions**. Same bytes on Chrome vs Safari can yield different PNG bytes → different per-frame `sha256_hex` (but this does NOT change the cache fingerprint, which uses video-bytes sha not frame sha; it would only show up as differing rows in `video_frame_extractions`).
7. **Retry path divergence.** S8 noted that `handleRetryAnalysis` does not re-upload but does re-probe and re-extract — if `fps_true` rounding lands on a different value during the retry probe, the cache fingerprint differs from the original, forcing a fresh model call.
8. **Desktop vs mobile probe variability.** `requestVideoFrameCallback` is available in Chrome/Edge/recent Safari and Firefox 132+; on older Firefox the probe falls back to `FALLBACK_FPS = 30` (`probeVideoMetadata.ts:31-34`). Desktop Firefox without rVFC vs mobile Chrome with rVFC → different `fps_true` → different cache fingerprint.
9. **Score caps inject re-run-stable adjustments.** Score caps (`index.ts:2294-2374`) are deterministic given identical model output. Not a source of nondeterminism on their own.
10. **Engine version pin.** `ENGINE_VERSION = "asb-1.0.0"` is a constant (`supabase/functions/_shared/asbEmit.ts:4`). Stable across runs until edited.

**Cache-hit path is deterministic. Cache-miss path is NOT — it is deterministic-best-effort, gated entirely on Gemini behaving identically under temperature=0/top_p=0/fixed seed, which is not contractually guaranteed.**

**Desktop vs mobile.** Captured in #8 above. Additionally: PNG encoding bytes differ across browsers (#6) but do not propagate to the cache key — they only show up in the audit table.

**Retry vs initial.** Captured in #7. The big retry-side gap is that the retry path can land on a different fingerprint than the initial run, defeating the cache and re-incurring vendor nondeterminism.

---

## S10 — Desktop failure investigation

**Upload entry path.** `AnalyzeVideo.tsx:285-305` accepts any `file.type.startsWith("video/")` ≤ 50 MB. No UA-gating.

**Probe path on desktop.**
- `probeVideoMetadata.ts:97-118` creates a `<video>` element, sets `preload: "auto"`, `muted: true`, `playsInline: true`, then awaits `loadedmetadata`. Desktop Safari is the main risk here — autoplay-muted is usually permitted, but if the user has disabled autoplay entirely the `video.play()` call inside `probeFps` (`probeVideoMetadata.ts:67-69`) returns a rejected promise that is silently caught; the probe then falls back to whatever was sampled before the timeout (`PROBE_TIMEOUT_MS = 8_000`) or `FALLBACK_FPS = 30`.
- `requestVideoFrameCallback` is feature-detected (`probeVideoMetadata.ts:36-38`); when absent it short-circuits to `FALLBACK_FPS = 30`. This affects Firefox < 132 on desktop.

**Frame extraction path on desktop (`src/lib/frameExtraction.ts:45-124`).**
- Creates a `<video>` element with `crossOrigin: "anonymous"` and waits for `loadedmetadata`. Then for each selected frame: `video.currentTime = sel.timestamp_seconds` and waits for `seeked` with an 8-second timeout per frame.
- Renders to a `<canvas>` via `ctx.drawImage(video, 0, 0, ...)` and encodes via `canvas.toBlob(resolve, "image/png")`.
- If `<3` frames return successfully, the upload path throws `"Could not extract enough frames for accurate analysis"`.

**Known desktop blockers (code-evidenced):**
- **Codec support.** Desktop Safari does not decode VP9/AV1 in `<video>` for many container/profile combinations. A WebM/VP9 file from Android Chrome opened on desktop Safari will fail at `loadedmetadata` with an `error` event, surfacing as `videoAnalysis.probeFailed`.
- **`crossOrigin: "anonymous"` is set on `<video>` but the source is a local `URL.createObjectURL` blob URL**, which is unaffected. No CORS issue from local upload.
- **`canvas.toBlob` returning `null`** silently drops the frame (`frameExtraction.ts:102` `if (!blob || blob.size === 0) continue;`). If many frames drop, the upload throws "Could not extract enough frames." This can happen on Safari with very large videos due to canvas memory pressure.
- **Seek-timeout 8s per frame.** A long high-bitrate video on a slow desktop can exceed 8s for `seeked` on the first cold seek; that frame is dropped, may cascade into the `<3 frames` throw.
- **`requestVideoFrameCallback` absent on older Firefox.** Probe falls back to 30 fps. If the true fps is 60 (modern phone), the cache fingerprint is "wrong-fps" relative to a mobile-uploaded run of the same file; not a desktop failure per se, but a determinism risk.

**Most likely root cause for "won't analyze on desktop"** (code inference, not runtime confirmation): codec/container incompatibility at the `<video>` element level — either the probe's `loadedmetadata` error path or the extractor's seek/draw path failing on a non-decodable file. **Undetermined from code:** specific browser version and source file format combinations actually being submitted. Console logs from a reproducing session would resolve this in one read.

---

## S11 — Trust score

Brutal classification per metric. Justification cites S2–S10.

| Metric | Trust | Why |
|---|---|---|
| Hip Load Stability | EXPERIMENTAL | AI 0–100 score with no calibration anchor; relies entirely on vision model's interpretation of "drift" over 7 frames. Subject to vendor nondeterminism (S9 #1). |
| Hand Load | EXPERIMENTAL | Same. |
| P2 Timing → Knee Lift | PARTIALLY TRUSTWORTHY | Boolean answer with a clear single-anchor question (peak knee lift). Definition is now tight (early acceptable, late only fail). Failure mode is honestly surfaced as "Pitcher knee lift not in frame." But still single-source AI judgment. |
| Eyes / Head Tracking | EXPERIMENTAL | AI 0–100; head-position estimation from 7 widely-spaced frames is inherently lossy. |
| Stride Direction | PARTIALLY TRUSTWORTHY | One number (degrees off square), clear threshold; but no landmark detector, model self-estimates angle from a frame. |
| Heel Plant / Landing | EXPERIMENTAL | Multi-criteria 0–100 score with subjective components ("core tensioned"). |
| P3 Timing → Release | NOT READY FOR USERS | Requires both pitcher release AND hitter full-foot-down to land in the 7-frame sample (S5). Even when both visible, ms-level precision from sparse frames is overreach. Newly graded but still single-source AI estimation. |
| Hands Outside Shoulders | PARTIALLY TRUSTWORTHY | Binary spatial question at a single frame, clear missing path. Vulnerable to camera angle (front-on vs side); AI vision will be unreliable on borderline cases. |
| Sequencing | EXPERIMENTAL | Pass/fail of a 6-step kinetic chain order judged from 7 frames with no per-segment timing data. Marked non-negotiable, which is a strong claim for a soft-vision metric. |
| Bat Path | EXPERIMENTAL | Composite quality score; overlaps with On-Plane (S4). |
| On-Plane % | EXPERIMENTAL | Same — overlaps with Bat Path, no actual pitch trajectory input. |
| Time to Contact | NOT READY FOR USERS | No calibration, no temporal anchor closer than ~100ms between samples for a sub-200ms quantity (S7). Schema-clamped range hides absurdity. |
| Bat Speed Through Contact | NOT READY FOR USERS | No calibration, no bat-length input, no pixel-scale (S6). mph is functionally a guess. |
| Connection & Barrel Delivery | EXPERIMENTAL | New window-based formula; requires the model to identify launch, extension-start, barrel-delivery, contact within 7 frames. Missing rate likely high until measured. |
| Hitter's Move Quality | EXPERIMENTAL | Non-negotiable but soft-vision composite; same single-source risk as Sequencing. |
| Shoulder Plane Steadiness | EXPERIMENTAL | Angle-stability across rotation window; 7-frame sampling is borderline for sub-frame angular tracking. |
| Finish & Balance | PARTIALLY TRUSTWORTHY | Post-contact pose is easier vision territory; methodology memo notes it's under review. |
| Shoulder-to-Shoulder Hold | PARTIALLY TRUSTWORTHY | Clear operational definition (D0 measurement at landing, ≥0.90 × D0 across window), well-defined auto-FAIL trigger. Still single-source AI numeric, no landmark detector backing the distances. |

---

## Final deliverable — A/B/C/D buckets

### A. Metrics safe for production today
None unconditionally. The strongest candidates (PARTIALLY TRUSTWORTHY in S11) — **P2 Timing → Knee Lift, Stride Direction, Hands Outside Shoulders, Finish & Balance, Shoulder-to-Shoulder Hold** — are usable today only because they are binary/clear-threshold questions with honest missing paths; even these depend on the AI model not silently drifting (S9 #1). No metric in this system is independently verifiable against ground truth in code.

### B. Metrics requiring redesign
- **Bat Speed Through Contact** — needs calibration anchor (bat length, athlete height, pixel/inch scale) before the mph number can mean anything.
- **Time to Contact** — needs denser temporal sampling or a swing-start/contact detector; current 7-frame sampling cannot resolve sub-200ms with ms precision.
- **P3 Timing → Release** — needs per-frame release / foot-down detection rather than ms-estimation from sparse frames.
- **Bat Path vs On-Plane %** — needs contractual disambiguation (the prompts overlap; see `.lovable/bat-path-vs-on-plane-definitions.md`).

### C. Metrics requiring investigation
- **All EXPERIMENTAL composite scores** (Hip Load, Hand Load, Eyes, Heel Plant, Sequencing, Bat Path, On-Plane, Connection & Barrel Delivery, Hitter's Move, Shoulder Plane Steadiness): the same-video determinism question (S9 #1) must be answered with empirical replays before these are trusted, because they aggregate many sub-judgments where vendor drift compounds.
- **Vendor determinism** (S9 #1) overall: run the same payload N times against the AI gateway and diff `tool_calls[0].function.arguments` byte-for-byte.
- **Desktop failure root cause** (S10): one reproducing console log will resolve which of codec / probe / seek-timeout is biting.
- **Missingness rates per field** (S5): a `select count(*) where metrics->>'<field>'::jsonb ? 'missing'` over `videos.ai_analysis` will give frequency-of-failure evidence.

### D. Metrics that should be hidden until trustworthy
- **Bat Speed Through Contact** — until S6 calibration is in place, the number misleads users.
- **Time to Contact** — until S7 sampling/detection is addressed, the number misleads users.
- **Connection & Barrel Delivery** — newly-formulated window metric without any in-code evidence that the model can reliably identify all four required anchors (launch, extension-start, barrel-delivery, contact) within the 7-frame sample. Worth gating behind an explicit "experimental" label or hiding until missingness rate is known.

---

End of audit. No fixes, no copy changes, no implementation. Next decision is yours.
