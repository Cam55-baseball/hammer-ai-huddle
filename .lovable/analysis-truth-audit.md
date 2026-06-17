# Phase 1.75 — Analysis Truth Audit

Evidence-only. Every claim cites `path:line-range` from the current codebase or is marked `undetermined from code — evidence needed`. No proposals, no roadmap, no fixes.

---

## S1 — Phase percentages (what the orb number actually is)

- The phase-rail orb percent is built by the parent and passed in as `passRate` (0..1). `src/components/report-card/hammer/visuals/PhaseRail.tsx:6-15` (`PhaseNode` interface — comment: "pass rate among MEASURED tiles") and rendered at `src/components/report-card/hammer/visuals/PhaseRail.tsx:84` (`pctLabel = noData ? "—" : ${Math.round(p.passRate * 100)}%`).
- `passRate` is computed in `HammerReportCard.tsx`:
  - `src/components/report-card/hammer/HammerReportCard.tsx:58-76` — per phase, accumulates `total += 1`; if `t.state.status !== "missing"` then `measured += 1`; if status is `"pass"` or `"elite"` then `passed += 1`. Final: `passRate: v.measured > 0 ? v.passed / v.measured : 0`.
- Therefore the orb number is **(pass + elite) / (pass + elite + warn + fail)**, with `missing` tiles excluded from both numerator and denominator. `warn` and `fail` lower it equally; `elite` and `pass` raise it equally.
- The number is NOT a quality average. `gradeFromTiles` (which IS a weighted score: pass=100, warn=70, fail=0) lives at `src/lib/reportCard/grade.ts:30-41` but is not what the orb shows. The orb path never calls `gradeFromTiles`.
- 100% is reachable only when every measured tile in that phase has status `pass` or `elite` (per the boolean test at `HammerReportCard.tsx:65`). When `measured === 0`, the rail renders `"—"` not `0%` (`PhaseRail.tsx:34,69,84`).
- Whether the user-visible legend explains "pass-rate of measured tiles" vs "quality score": **undetermined from code — evidence needed** (no copy string found alongside the orb in `PhaseRail.tsx` or `HammerReportCard.tsx`).

---

## S2 — Metric inventory (BH)

Tile keys come from `src/lib/reportCard/disciplines/bh.ts`. Metric keys, kinds, prompts, and contract→tile mapping come from `src/lib/reportCard/contracts/bh.contract.ts` (client) and `supabase/functions/_shared/reportCardContracts.ts` (server mirror). Confidence and missingness schemas come from `src/lib/reportCard/contracts/shared.ts` and the server schema builder.

Confidence source for every tile: the client tile compute reads `m.confidence` via `readNumber` / `readBool` / `readScore100` (`src/lib/reportCard/metricReaders.ts:11-50`). Confidence is written by the model per the schema description at `supabase/functions/_shared/reportCardContracts.ts:428-432` ("Your measurement confidence 0..1 — NOT athlete quality"). No code-side derivation of confidence was found — `metricReaders.ts` only forwards what the model emitted, defaulting to `1` if the model omitted the field (`metricReaders.ts:19,46`).

Missing conditions for every tile: each `compute` returns `missingState(a, key)` when the metric is absent or `missing:true` in the analysis record (`src/lib/reportCard/metricReaders.ts:52-58`). `missing_reason` is whatever string the model emitted (`metricReaders.ts:55-57`), or `"single_pass_only"` when the edge function back-fills (`supabase/functions/analyze-video/index.ts:2260-2271`).

| Tile (`bh.ts`) | Tile name | Mode | Primary metric key | Range/prompt cite | Compute cite |
|---|---|---|---|---|---|
| `hip_load` | Hip Load Stability | score_meter (acc 70 / elite 90) | `hip_stability_score_100` (legacy `hip_load_score_10`) | `bh.contract.ts:13-21` | `bh.ts:30-34` |
| `hand_load` | Hand Load | score_meter (65/88) | `hand_load_score_100` (legacy `hand_load_score_10`) | `bh.contract.ts:23-32` | `bh.ts:51-55` |
| `p2_timing` | P2 Timing → Knee Lift | pass_fail | `p2_timing_pass` (boolean) | `bh.contract.ts:33-40` | `bh.ts:69-73` |
| `eyes_tracking` | Eyes / Head Tracking | score_meter (70/90) | `eyes_track_score_100` | `bh.contract.ts:41-50` | `bh.ts:89-93` |
| `stride_direction` | Stride Direction | pass_fail (|deg|≤15) | `stride_dir_deg_off_square` | `bh.contract.ts:52-61` | `bh.ts:109-113` |
| `heel_plant` | Heel Plant / Landing | score_meter (65/88) | `heel_plant_score_100` (legacy `_score_10`) | `bh.contract.ts:62-71` | `bh.ts:129-133` |
| `p3_timing` | P3 Timing → Release | score_meter (70/90) | `p3_release_offset_ms` (signed ms) | `bh.contract.ts:72-81` | `bh.ts:148-168` |
| `hands_outside_shoulders_at_landing` | Hands Outside Shoulders at Landing | pass_fail | `hands_outside_shoulders_at_landing_pass` (boolean) | `bh.contract.ts:82-89` | `bh.ts:183-187` |
| `sequencing` | Sequencing (NN) | pass_fail | `sequencing_ok` (boolean) | `bh.contract.ts:92-99` | `bh.ts:205-209` |
| `bat_path` | Bat Path In/Out of Zone | score_meter (65/88) | `bat_path_score_100` (legacy `_score_10`) | `bh.contract.ts:100-109` | `bh.ts:224-228` |
| `on_plane` | On-Plane % | score_meter (60/85) | `on_plane_pct` | `bh.contract.ts:110-119` | `bh.ts:244-248` |
| `time_to_contact` | Time to Contact | raw_pass_fail (≤175 pass, ≤150 elite) | `time_to_contact_ms` | `bh.contract.ts:120-129` | `bh.ts:264-274` |
| `bat_speed_contact` | Bat Speed Through Contact | raw_passed (≥65 pass, ≥75 elite) | `bat_speed_contact_mph` | `bh.contract.ts:130-139` | `bh.ts:290-300` |
| `back_elbow_contact` | Connection & Barrel Delivery | score_meter (70/90) | `connection_barrel_delivery_score_100` | `bh.contract.ts:140-149` | `bh.ts:316-320` |
| `hitters_move` | Hitter's Move (NN) | score_meter (70/92) | `hitters_move_score_100` (legacy `_score_10`) | `bh.contract.ts:150-159` | `bh.ts:337-341` |
| `shoulder_plane_steadiness` | Shoulder Plane Steadiness | score_meter (70/90) | `shoulder_plane_steadiness_score_100` (legacy `_score_10`) | `bh.contract.ts:160-169` | `bh.ts:357-361` |
| `finish_balance` | Finish & Balance | score_meter (65/88) | `finish_balance_score_100` | `bh.contract.ts:170-178` | `bh.ts:376-380` |
| `shoulder_to_shoulder_hold` | Shoulder-to-Shoulder Hold (NN) | pass_fail w/ auto-fail | `shoulder_to_shoulder_hold_pct_to_contact` (primary), `_pass` (fallback), `front_shoulder_leak_before_contact`, `front_shoulder_leak_pct_of_window` | `bh.contract.ts:180-215` | `bh.ts:397-441` |

Notes on the table:
- "Definition shown to model" is the `prompt` field of each metric in `bh.contract.ts` (verbatim above-cited line ranges). The server uses the equivalent mirrored prompts in `supabase/functions/_shared/reportCardContracts.ts:135-388`. The two files are intended to be kept in sync per the header at `reportCardContracts.ts:1-13`; whether they are currently byte-identical is undetermined from code without a diff in this session — every key listed above exists in both files at the cited lines.
- No client tile compute does geometric measurement from frames. Every `compute` calls a reader (`readNumber` / `readBool` / `readScore100`) that pulls a model-emitted value out of `analysis.metrics[key]` (`bh.ts:30-34` and every other `compute`).

---

## S3 — Connect & Move vs Barrel Delivery

- There is no tile named "Connect & Move" in `bh.ts` (search of `bh.ts` lines 1-449 returns no occurrence). The current tile in the P4 connection slot is `back_elbow_contact` with display name `"Connection & Barrel Delivery"` (`bh.ts:302-321`).
- Inputs: single metric `connection_barrel_delivery_score_100` (`bh.ts:317`). Old "back elbow past belly button at contact" formula is explicitly disabled in the contract prompt: `bh.contract.ts:148` ("Do not use the old 'back elbow past belly button at contact' formula") and mirrored at `supabase/functions/_shared/reportCardContracts.ts:311`.
- Formula: pure pass-through of the model's 0..100 score into `scoreMeterState(value, confidence, 70, 90)` (`bh.ts:316-320`). There is no second metric being averaged in, no client-side composition.
- "Connect & Move" as a separately-defined tile: **undetermined from code — evidence needed** (it does not exist in `bh.ts` today; any historical definition is not currently in the codebase).

---

## S4 — Bat Path vs On-Plane %

- Two distinct tiles, two distinct metrics, computed independently:
  - `bat_path` reads `bat_path_score_100` (or legacy `bat_path_score_10`) and maps via `scoreMeterState(v, c, 65, 88)` (`bh.ts:224-228`). Contract prompt: `bh.contract.ts:100-109`.
  - `on_plane` reads `on_plane_pct` and maps via `scoreMeterState(v, c, 60, 85)` (`bh.ts:244-248`). Contract prompt: `bh.contract.ts:110-119`.
- Both definitions are model-supplied scores (no per-frame geometric computation in code). The reference memo at `.lovable/bat-path-vs-on-plane-definitions.md` exists in the project file listing but its contents are not loaded into this audit — pointer only, per scope rules.

---

## S5 — Undetected metrics (contract → prompt → reader → tile trace)

For each of the requested keys: the contract entry, the prompt the model receives, the reader the tile uses, the compute, and the literal `missing_reason` string(s) the system can emit.

### `p2_timing_pass` (P2 Timing → Knee Lift)
- Contract: `bh.contract.ts:33-40` (boolean). Server mirror: `supabase/functions/_shared/reportCardContracts.ts:178-185`.
- Prompt literally instructs: "If the pitcher's knee lift is not visible in the frames, set missing=true with reason `'Pitcher knee lift not in frame'`." (`bh.contract.ts:39`; mirrored `reportCardContracts.ts:184`).
- Reader: `readBool(a, "p2_timing_pass")` → `bh.ts:70-72`. Returns `missingState(a, "p2_timing_pass")` if absent.
- Possible `missing_reason` literals from code: `"Pitcher knee lift not in frame"` (model-emitted per prompt), `"single_pass_only"` (back-fill at `supabase/functions/analyze-video/index.ts:2267`).

### `p3_release_offset_ms` (P3 Timing → Release)
- Contract: `bh.contract.ts:72-81`. Server mirror: `reportCardContracts.ts:226-235`.
- Prompt: "If pitcher release or full-foot-down is not visible, set missing=true with the specific missing anchor." (`bh.contract.ts:80`).
- Reader: `readNumber(a, "p3_release_offset_ms")` → `bh.ts:149-150`. Tile computes a piecewise score over the offset (`bh.ts:152-167`).
- Possible `missing_reason` literals: model-emitted "specific missing anchor" (no fixed string in code), `"single_pass_only"` (`analyze-video/index.ts:2267`).

### `hands_outside_shoulders_at_landing_pass`
- Contract: `bh.contract.ts:82-89`. Server: `reportCardContracts.ts:236-243`.
- Prompt literal: "set missing=true with reason `'Hands or back shoulder not visible at landing'`" (`bh.contract.ts:88`).
- Reader: `readBool(a, "hands_outside_shoulders_at_landing_pass")` → `bh.ts:184-186`.

### `bat_speed_contact_mph`
- Contract: `bh.contract.ts:130-139`. Server mirror has additional method detail: `reportCardContracts.ts:293-301`.
- Prompt literals about missingness: client side says "If no sensor data and motion blur is too high to estimate, set missing=true with reason `'Frame rate too low for bat speed estimate'`" (`bh.contract.ts:138`). Server-side prompt is stricter and lists multiple missing conditions ("barrel is obscured at contact", "frame rate is unknown", "motion blur prevents tracking the barrel tip across two consecutive frames") without enforcing a fixed string (`reportCardContracts.ts:301`).
- Reader: `readNumber(a, "bat_speed_contact_mph")` → `bh.ts:291-292`.

### `time_to_contact_ms`
- Contract: `bh.contract.ts:120-129`. Server mirror: `reportCardContracts.ts:283-291` (stricter, includes `"fps_unknown"` literal).
- Prompt literal: server includes `"If fps is unknown, set missing=true with reason 'fps_unknown'"` and "If either anchor frame is ambiguous (motion blur, occluded knob, off-camera contact), set missing=true with reason naming the specific landmark you could not lock. NEVER GUESS." (`reportCardContracts.ts:291`).
- Reader: `readNumber(a, "time_to_contact_ms")` → `bh.ts:265-266`.

Common path for all of the above when the contract is present and the metric is absent: the edge function backfills `{ missing: true, missing_reason: "single_pass_only", confidence: 0 }` at `supabase/functions/analyze-video/index.ts:2260-2271`. The branch that does this is guarded by `if (reportCardContract && metrics)` (`analyze-video/index.ts:2259`). For analyses where `metrics` came back null from the model parse, no back-fill runs (the entire `if` is skipped); the tile then reads `missing` with `missing_reason: undefined` (`metricReaders.ts:55-57`).

---

## S6 — Bat Speed

- Schema/prompt:
  - Client contract: `bh.contract.ts:130-139` — `kind: "number"`, `unit: "mph"`, `range: [30, 110]`. Prompt: "Estimated barrel speed AT contact in mph. PASS ≥65, ELITE ≥75. If no sensor data and motion blur is too high to estimate, set missing=true with reason 'Frame rate too low for bat speed estimate'."
  - Server contract (active prompt fed to the model): `supabase/functions/_shared/reportCardContracts.ts:293-302`. Method specified: "measure peak translational speed of the BARREL TIP over a 2-frame window straddling the contact frame. Convert pixels/frame to mph using the bat length as the calibration ruler (default bat length = 33 in if unknown — note this assumption)."
- Reader: `readNumber(a, "bat_speed_contact_mph")` (`bh.ts:291-292`). Tile is `raw_passed` mode (`bh.ts:279`), thresholds applied client-side at `bh.ts:293-300`.
- Units: mph (`bh.contract.ts:135`).
- Estimation vs measured: estimation. No code-side bat tracker, no pixel-to-inch calibration pipeline, no sensor ingestion was found under `src/lib/biomech/` or `supabase/functions/_shared/` in this audit's scope. Calibration is **assumed** by the model via "default bat length = 33 in if unknown" (`reportCardContracts.ts:301`) — there is no field in `videos` for bat length read into the prompt (undetermined from code beyond the audited files).
- Frame budget available to the model: 7 frames (`src/lib/biomech/frameExtractionDeterministic.ts:18-19` — `AUTO_PERCENTAGES` and `LANDING_OFFSETS_SEC` are both length 7). The method ("2-frame window straddling the contact frame") therefore must operate within those 7 sampled frames; whether the contact frame is among them depends on selection, which uses fixed percentages or landing-time offsets, not contact detection (`frameExtractionDeterministic.ts:48-58`).

---

## S7 — Time to Contact

- Schema/prompt:
  - Client: `bh.contract.ts:120-129`. `kind:"number"`, `unit:"ms"`, `range:[80,400]`. Prompt: "Milliseconds from the moment the bat first starts moving forward until ball-barrel contact. PASS ≤175 ms, ELITE ≤150 ms. Estimate from the visible frames using the displayed frame rate context."
  - Server (active prompt): `reportCardContracts.ts:283-291`. Defines explicit anchors and formula: "(a) SWING START = the first frame in which the knob begins forward motion AFTER the hand-load has completed AND the hips have begun to clear ... (b) CONTACT FRAME = the first frame in which the bat barrel overlaps the ball. Compute `ms = (contact_frame - start_frame) * 1000 / fps`. Use the video's stated frame rate. If fps is unknown, set missing=true with reason 'fps_unknown'."
- Reader: `readNumber(a, "time_to_contact_ms")` (`bh.ts:265-266`). Tile mode `raw_pass_fail` (`bh.ts:253`), thresholds applied client-side at `bh.ts:267-274`.
- Units: ms (`bh.contract.ts:125`).
- Estimation vs measured: estimation by the AI model from 7 sampled frames (`frameExtractionDeterministic.ts:18`). No code-side swing-start detector or contact detector exists (search of `src/lib/biomech/` shows no such modules; only `auditTrail.ts`, `fingerprint.ts`, `frameExtractionDeterministic.ts`, `probeVideoMetadata.ts`, `versions.ts`, `videoAcceptance.ts`).
- Calibration: relies on `fps_true` already on the `videos` row (`analyze-video/index.ts:1696`). When the model interprets "the displayed frame rate context", whether that frame rate is injected into the prompt vs the schema description is **undetermined from code — evidence needed** (the system prompt body around `analyze-video/index.ts:1889` was not exhaustively read in this audit).

---

## S8 — Failure paths

- File-size gate (client): >50 MB rejected with toast `"videoAnalysis.fileTooLarge"` (`src/pages/AnalyzeVideo.tsx:294-296`). MIME-type gate: must start with `video/` (`AnalyzeVideo.tsx:289-292`).
- Probe failure (client): `probeVideoMetadata(file)` throw → toast `"videoAnalysis.probeFailed"`, `setUploading(false)`, returns without uploading (`AnalyzeVideo.tsx:316-322`).
- Frame extraction failure (client, primary upload path): caught at `AnalyzeVideo.tsx:365-369`; emits toast `"videoAnalysis.frameExtractionFailed"`. Same handling on the recompute path at `AnalyzeVideo.tsx:563-566`.
- Frame extractor internal failure modes:
  - "Canvas 2D context not supported" → thrown (`src/lib/frameExtraction.ts:58`).
  - "video metadata load failed" → thrown (`frameExtraction.ts:75`).
  - "video has invalid dimensions" → thrown (`frameExtraction.ts:81`).
  - Per-seek timeout 8 s → thrown `"seek timeout"`, but caught per-frame; the loop logs `[FRAME EXTRACTION] dropped frame` and continues (`frameExtraction.ts:91-117`). A frame that fails to encode (blob null or 0 bytes) is silently skipped at `frameExtraction.ts:101-102`.
  - Caller throws `"Could not extract enough frames for accurate analysis"` when extraction returns fewer than required (`AnalyzeVideo.tsx:351`, `AnalyzeVideo.tsx:549`).
- Edge-function rejection paths (write `outcome: "rejected"` to `video_analysis_runs` and return 422):
  - `missing_video_sha256` (`analyze-video/index.ts:1709-1726`).
  - `missing_probe_metadata` (`analyze-video/index.ts:1727-1744`).
  - `reject_low_fps` (`analyze-video/index.ts:1776-1778`, `PHASE1_MIN_FPS=24`).
  - `reject_low_resolution` (`analyze-video/index.ts:1779-1781`, `480x480` min).
  - `reject_duration_out_of_bounds` (`analyze-video/index.ts:1782-1784`, 0.5–60 s).
  - `reject_excessive_dropped_frames` (`analyze-video/index.ts:1785-1791`, max-dropped 0.34).
- AI-gateway error classes (re-thrown into top-level catch):
  - `ai_gateway_rate_limited` at status 429 (`analyze-video/index.ts:2195-2198`).
  - `ai_gateway_payment_required` at status 402 (`analyze-video/index.ts:2200-2203`).
  - `ai_gateway_error` at all other non-OK statuses (`analyze-video/index.ts:2204-2207`).
- Status-write conditions: there is exactly one `status: "completed"` write in the edge function (`analyze-video/index.ts:2467`). It runs after the AI response is parsed and `ai_analysis` is assembled (`analyze-video/index.ts:2435-2470`). When the tool-call parse succeeds, the code uses default fallbacks: `efficiency_score = 75`, `feedback = "No analysis available"`, `summary = []`, `positives = []`, `drills = []` (`analyze-video/index.ts:2211-2215`); these are only overwritten if `toolCalls[0].function.arguments` parses (`analyze-video/index.ts:2236-2254`). Therefore a row CAN be marked `completed` while `metrics` is `null` and `feedback`/`summary` are the default strings, provided no error was thrown earlier in the AI call.
- Empty-metrics back-fill: only runs when both `reportCardContract` and `metrics` are truthy (`analyze-video/index.ts:2259`). When the model returns no parseable arguments and `metrics` remains `null`, no back-fill occurs and downstream tiles all read `missing` with `missing_reason: undefined`.
- Failure-while-uploading client behavior: top-level catch at `AnalyzeVideo.tsx:500-506` shows generic toast and resets `uploading=false`. Specific 429/402 paths are mapped to localized toasts at `AnalyzeVideo.tsx:484-490` and `AnalyzeVideo.tsx:591-597`.

---

## S9 — Same-video nondeterminism sources (ranked)

The cache lookup IS keyed on the deterministic fingerprint, but also on `video_id` (`supabase/functions/analyze-video/index.ts:1809-1812` — `.eq("video_id", videoId).eq("cache_fingerprint_hex", cacheFingerprintHex)`). The fingerprint itself is built only from physical inputs (`src/lib/biomech/fingerprint.ts:116-131`):

```
SHA256(
  videoSha256Hex : LANDMARK_MODEL_VERSION : DETECTOR_VERSION : METRIC_ENGINE_VERSION
  : fpsTrue.toFixed(6) : landingTimeSec.toFixed(6)|"null"
  : directionSign : calibrationHpx.toFixed(6)
)
```

Engine versions are pinned at `src/lib/biomech/versions.ts:24-27`: all three are `@0.0.0-stub`. Server mirror constants at `supabase/functions/_shared/biomechFingerprint.ts:10-13` match by string.

Sources of nondeterminism that produce different results for the same underlying video, in order of strength of evidence:

1. **Cache miss across re-uploads of identical bytes.** The cache `select` is `.eq("video_id", videoId)` (`analyze-video/index.ts:1810`). Uploading the same byte stream as a new video record creates a new UUID and therefore never hits the prior cache row, even when `cache_fingerprint_hex` would match. The cache benefit is per-video, not per-byte-stream.
2. **Seed is derived from `videoId`, not from bytes.** `seed: stableSeed(videoId)` (`analyze-video/index.ts:2014-2016`); `stableSeed` is a deterministic 32-bit hash of the string (`analyze-video/index.ts:48-57`). Two videos with identical bytes uploaded as separate rows receive different seeds → different model sampling. The header comment at line 46 reads "Same input video → same seed → same model sampling path → same scores", but the implementation hashes `videoId` (the row UUID), not the video bytes. This contradiction is observable in code: re-upload = new UUID = new seed.
3. **`temperature: 0` is set** (`analyze-video/index.ts:2014`), which removes one source of model randomness but does not, in Gemini, guarantee bitwise reproducibility across calls in the absence of identical seed. The seed is set (item 2), so for a given `videoId` the inputs are stable.
4. **`fps_true` rounding/snapping.** `probeFps` snaps to a standard rate when within 0.5 fps (`src/lib/biomech/probeVideoMetadata.ts:74-78`); otherwise rounds to 3 decimals (`probeVideoMetadata.ts:79-80`). Different browsers / decoders that report slightly different per-frame `mediaTime` deltas may land on either side of a snap band, changing `fps_true`, which changes the fingerprint (`fingerprint.ts:117,125`).
5. **`requestVideoFrameCallback` absence → fallback FPS = 30** (`probeVideoMetadata.ts:18-20,29-31`). Browsers without rVFC produce `fps_true = 30` regardless of the actual rate; this is byte-stable per-browser but diverges across browsers for the same file.
6. **Autoplay-blocked probe path.** If `videoEl.play()` rejects (autoplay blocked), the probe ends at the 8 s timeout (`probeVideoMetadata.ts:46-67`) and uses whatever samples accumulated, possibly falling back to 30 (`probeVideoMetadata.ts:48`). This can produce different `fps_true` between sessions on the same machine.
7. **Canvas → PNG encoding stability.** Frame hashing uses PNG to avoid JPEG drift (`src/lib/frameExtraction.ts:9-11,101`). Whether canvas PNG output is byte-identical across browsers is asserted in the comment ("Hashing uses PNG (lossless) because canvas → JPEG encoding is not byte-stable") but **undetermined from code — evidence needed** for cross-browser PNG bit equality.
8. **Seek-timeout dropped frames.** Per-frame extraction silently drops on `"seek timeout"` (`frameExtraction.ts:91-117`). On a slow decoder, the set of successfully extracted frames may vary, changing what the model sees. The server rejects only when dropped ratio exceeds 0.34 (`analyze-video/index.ts:1785-1791`); below that threshold, dropped-frame variability is silent.
9. **`landing_time_sec` user input** is part of the fingerprint (`fingerprint.ts:118,126`). If the user sets or changes landing time between runs, the fingerprint changes (cache miss) and the selected frames change (`frameExtractionDeterministic.ts:49-53`).
10. **Model-side nondeterminism** beyond what seed+temperature control: **undetermined from code — evidence needed**. The audit cannot establish from code alone whether `google/gemini-2.5-flash` (`analyze-video/index.ts:2431`) is bitwise-deterministic for fixed (seed, temperature, prompt, frames).

---

## S10 — Desktop failure path

- Upload entry is a single function that runs in any browser (`AnalyzeVideo.tsx:285-326`). No `navigator.userAgent` gate or UA sniffing was found in `AnalyzeVideo.tsx` (search returned no matches in §S8 grep).
- 50 MB hard limit applies on desktop and mobile identically (`AnalyzeVideo.tsx:294-296`).
- Probe path requires `loadedmetadata` to fire (`probeVideoMetadata.ts:91-101`); if the desktop browser cannot decode the container (e.g. HEVC/HEIC fragment in MP4 on Firefox Linux), the `error` event fires and the probe throws `"video metadata load failed"` (`probeVideoMetadata.ts:97`), which the page maps to the `probeFailed` toast (`AnalyzeVideo.tsx:316-322`).
- FPS probe degrades silently to 30 on browsers without `requestVideoFrameCallback` (`probeVideoMetadata.ts:18-20,29-31`). Combined with the server's `PHASE1_MIN_FPS = 24` reject (`analyze-video/index.ts:1776-1778`), a value of 30 does not block analysis; however, downstream metrics that compute ms via `frames/fps` will use 30, not the actual rate.
- Frame extractor uses `<video>.currentTime = ...` then waits for `"seeked"` with an 8 s timeout (`frameExtraction.ts:88-98`). On desktop browsers with slow software decoders for HEVC/AV1, individual seeks can time out and frames are dropped (`frameExtraction.ts:115-117`); >34 % dropped → server reject `reject_excessive_dropped_frames` (`analyze-video/index.ts:1785-1791`).
- Whether the page enforces a different acceptable codec set or shows a desktop-specific helper before upload: **undetermined from code — evidence needed** (no codec gate found in `AnalyzeVideo.tsx`; `CameraAngleHelper.tsx` exists in `src/components/report-card/hammer/` but was not read in this audit's scope).

---

## S11 — Trust score per metric

Classifications use ONLY S2–S10 evidence. "TRUSTWORTHY" requires: clear code-side definition, deterministic compute or stable model-bounded compute, no known undetected ambiguity in the prompt. "PARTIALLY TRUSTWORTHY": clear definition but estimation-only with no calibration. "EXPERIMENTAL": defined but with explicit estimation caveats / unbounded calibration dependence. "NOT READY FOR USERS": missing detectors required by the operational rule.

| Tile | Class | Justification (cites) |
|---|---|---|
| `hip_load` | PARTIALLY TRUSTWORTHY | Model-supplied 0–100 with worked-example prompt anchors (`bh.contract.ts:13-21`); no code-side stability detector; confidence forwarded as-is (`metricReaders.ts:46`). |
| `hand_load` | PARTIALLY TRUSTWORTHY | Same shape as `hip_load` (`bh.contract.ts:23-32`). |
| `p2_timing` | PARTIALLY TRUSTWORTHY | Boolean with explicit "Early is acceptable … FALSE only if … unfinished after pitcher peak knee lift" prompt (`bh.contract.ts:33-40`); no code-side knee-lift detector; missing path is explicit (`'Pitcher knee lift not in frame'`). |
| `eyes_tracking` | EXPERIMENTAL | Model-only scoring of head/eye movement from 7 frames (`bh.contract.ts:41-50`); no per-frame head-trajectory detector in code. |
| `stride_direction` | PARTIALLY TRUSTWORTHY | Numeric degrees with ≤15° pass rule applied in code (`bh.ts:109-113`); estimation by model. |
| `heel_plant` | PARTIALLY TRUSTWORTHY | Score 0–100 with worked example (`bh.contract.ts:62-71`); no code-side landing detector. |
| `p3_timing` | PARTIALLY TRUSTWORTHY | Signed ms with continuous piecewise client mapping (`bh.ts:148-168`); model estimates offset; depends on visible release and full-foot-down (`bh.contract.ts:80`). |
| `hands_outside_shoulders_at_landing` | PARTIALLY TRUSTWORTHY | Boolean with explicit landmark requirement and missing reason (`bh.contract.ts:82-89`). |
| `sequencing` | EXPERIMENTAL | Boolean with terse prompt only (`bh.contract.ts:92-99`); no operational measurement rule, no detectors. |
| `bat_path` | EXPERIMENTAL | Single-line subjective prompt (`bh.contract.ts:100-109`); no code measurement. |
| `on_plane` | EXPERIMENTAL | Percent with model worked example (`bh.contract.ts:110-119`); no plane detector in code. |
| `time_to_contact` | NOT READY FOR USERS | Operational formula requires swing-start and contact-frame detection (`reportCardContracts.ts:283-291`); 7-frame sample budget (`frameExtractionDeterministic.ts:18-19`); no detectors in code. |
| `bat_speed_contact` | NOT READY FOR USERS | Calibrated from "default bat length = 33 in if unknown" (`reportCardContracts.ts:301`); requires barrel-tip tracking across 2 frames straddling contact within 7 sampled frames (`frameExtractionDeterministic.ts:18-19`); no tracker in code. |
| `back_elbow_contact` | EXPERIMENTAL | Window-based composite score with explicit "Do not use the old 'back elbow past belly button at contact' formula" (`bh.contract.ts:148`); model-only; no extension-start detector. |
| `hitters_move` | EXPERIMENTAL | Holistic 0–100 with terse prompt (`bh.contract.ts:150-159`); no decomposition in code. |
| `shoulder_plane_steadiness` | EXPERIMENTAL | Score with operational rule "Measure the angle … across the rotation window" (`reportCardContracts.ts:333-341`); no code-side detector. |
| `finish_balance` | EXPERIMENTAL | Prompt header notes "the measurable definition of this metric is being reviewed separately" (`bh.ts:372`); current scoring is the model's 0–100 (`bh.ts:376-380`). |
| `shoulder_to_shoulder_hold` | EXPERIMENTAL | Operational rule fully specified (D0 measurement, ≥0.90·D0 frame test, auto-FAIL on front-shoulder leak >15° — `bh.contract.ts:180-215`); no code-side hand-cluster/back-shoulder tracker; relies on model carrying out the rule across 7 frames. |

---

## Final A/B/C/D trust classification

Derived strictly from S11.

### A. Safe for production today (TRUSTWORTHY)
- None. No metric in S11 meets the TRUSTWORTHY bar from code evidence alone (all are model-emitted; no metric has a code-side deterministic compute).

### B. Metrics requiring redesign (NOT READY FOR USERS — need detectors/calibration before they can be trusted as written)
- `time_to_contact` (`bh.ts:251-275`, `reportCardContracts.ts:283-291`).
- `bat_speed_contact` (`bh.ts:277-301`, `reportCardContracts.ts:293-302`).

### C. Metrics requiring investigation (EXPERIMENTAL — definition present, no code-side measurement)
- `eyes_tracking` (`bh.contract.ts:41-50`).
- `sequencing` (`bh.contract.ts:92-99`).
- `bat_path` (`bh.contract.ts:100-109`).
- `on_plane` (`bh.contract.ts:110-119`).
- `back_elbow_contact` / Connection & Barrel Delivery (`bh.contract.ts:140-149`).
- `hitters_move` (`bh.contract.ts:150-159`).
- `shoulder_plane_steadiness` (`bh.contract.ts:160-169`, `reportCardContracts.ts:333-341`).
- `finish_balance` (`bh.ts:363-381`, including the in-code note that the measurable definition is under review at `bh.ts:372`).
- `shoulder_to_shoulder_hold` (`bh.contract.ts:180-215`).

### D. Metrics that should be hidden until trustworthy
- Cannot be determined from code alone — there is no `visible:false` / hidden-tile flag in the tile spec (`src/lib/reportCard/types.ts:55-78`). Whether to hide any of A/B/C is a policy decision; the audit reports only that the mechanism does not exist in code.
- **undetermined from code — evidence needed** for any tile that the team intends to keep server-side only.

### Partially trustworthy (recorded for completeness; not in A, B, or D)
- `hip_load`, `hand_load`, `p2_timing`, `stride_direction`, `heel_plant`, `p3_timing`, `hands_outside_shoulders_at_landing` — defined and bounded by prompt, but estimation is model-only (S11 cites above).
