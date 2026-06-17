# Phase 1.75 — Analysis Truth Audit

Evidence-only forensic accounting of the current analysis stack. Every claim is anchored to `path:line-range`. Where code cannot prove behavior, the entry is marked `undetermined from code — evidence needed`. No fixes, no proposals, no roadmap.

Scope: BH (Baseball Hitting) report card, `analyze-video` edge function, biomech determinism layer, frame extraction, video probe, `AnalyzeVideo.tsx` upload/analyze flow. BP/throwing referenced only where the code reuses the same path.

---

## S1 — Report Card Phase Percentages (1 / 2 / 3 / 4 circles)

**Where the orb is rendered.** `src/components/report-card/hammer/visuals/PhaseRail.tsx:63-99`. The orb itself displays `p.count` (the *total* number of tiles in that phase, `PhaseRail.tsx:92`). The text under each orb displays `pctLabel`, which is `"—"` when `p.measured === 0` else `Math.round(p.passRate * 100) + "%"` (`PhaseRail.tsx:63`).

**Where the percentage is computed.** `src/components/report-card/hammer/HammerReportCard.tsx:56-76`. For each phase the loop accumulates:
- `total` — every tile in the phase (`HammerReportCard.tsx:62`).
- `measured` — every tile whose computed `state.status !== "missing"` (`HammerReportCard.tsx:63-64`).
- `passed` — every tile whose computed status is `"pass"` OR `"elite"` (`HammerReportCard.tsx:65`).

`passRate` is `measured > 0 ? passed / measured : 0` (`HammerReportCard.tsx:74`).

**What this number represents.** It is the **pass-rate of measured tiles in the phase**: `(pass + elite) / (pass + elite + warn + fail)`. `warn` and `fail` are in the denominator; `missing` is excluded. It is not a score, not a confidence, not a coverage metric.

**Tier coloring.** `PhaseRail.tsx:46-60`: `>=0.85` green (pass), `>=0.5` amber (warn), else red (fail); `measured === 0` is gray ("missing").

**Is 100% reachable?** Yes, when every measured tile in the phase has `status === "pass"` or `"elite"`. A phase with one measured tile that passes shows 100%. A phase with all tiles `missing` shows `"—"` not 0% (`PhaseRail.tsx:63`).

**What this number is NOT.** It does not weight `score_meter` tiles by their 0–100 score, does not penalize `warn`, and does not account for non-negotiable severity (non-negotiable failures are tracked separately on the ribbon at `HammerReportCard.tsx:51-53`).

---

## S2 — Current Metric Inventory (BH)

Every tile shipped on the BH report card. "Compute fn" = the `compute:` lambda in `src/lib/reportCard/disciplines/bh.ts`. "Source field" = the key it reads via `metricReaders.ts`. "Confidence source" is per-metric on `MetricValue.confidence` (`src/lib/reportCard/contracts/shared.ts:30-44`). "Missing reason" is whatever the AI returns; the readers do not synthesize one.

| # | Tile key | Display name | Mode | Source field(s) read | Compute (bh.ts) | Pass/warn/fail bands | Confidence source | Missing path |
|---|---|---|---|---|---|---|---|---|
| 1 | `hip_load` | Hip Load Stability | `score_meter` | `hip_stability_score_100` (fallback `hip_load_score_10`) | `bh.ts:30-34` | acceptable 70, elite 90 (`bh.ts:33`); bands per `scoreMeterState` (`metricReaders.ts:67-83`) | `m.confidence` from `readScore100` (`metricReaders.ts:24-39`) | `missingState(a, "hip_stability_score_100")` (`bh.ts:32`) → reason from AI's `missing_reason` (`metricReaders.ts:47-54`) |
| 2 | `hand_load` | Hand Load | `score_meter` | `hand_load_score_100` (fallback `hand_load_score_10`) | `bh.ts:51-55` | 65 / 88 | same | same pattern |
| 3 | `p2_timing` | P2 Timing → Knee Lift | `pass_fail` | `p2_timing_pass` (bool) | `bh.ts:69-73` | pass = true, fail = false | `readBool` confidence (`metricReaders.ts:42-49`) | `p2_timing_pass` missing |
| 4 | `eyes_tracking` | Eyes / Head Tracking | `score_meter` | `eyes_track_score_100` | `bh.ts:89-93` | 70 / 90 | `readNumber` | `eyes_track_score_100` missing |
| 5 | `stride_direction` | Stride Direction | `pass_fail` | `stride_dir_deg_off_square` (number) | `bh.ts:109-113` | pass if `Math.abs(value) <= 15` (`bh.ts:112`) | `readNumber` | `stride_dir_deg_off_square` missing |
| 6 | `heel_plant` | Heel Plant / Landing | `score_meter` | `heel_plant_score_100` (fallback `heel_plant_score_10`) | `bh.ts:129-133` | 65 / 88 | same | same |
| 7 | `p3_timing` | P3 Timing → Release | `score_meter` | `p3_release_offset_ms` | `bh.ts:148-168` | piecewise: deadband ±33 ms → 100; (33,80] linear 100→90; (80,150] 90→70; >150 decays to 0; early branch (offset < −33) decays from 100 → 85 over ~267 ms (`bh.ts:153-162`). `scoreMeterState` acceptable 70, elite 90 (`bh.ts:165`). Display value derived from sign of offset (`bh.ts:166`). | `readNumber` confidence | `p3_release_offset_ms` missing |
| 8 | `hands_outside_shoulders_at_landing` | Hands Outside Shoulders at Landing | `pass_fail` | `hands_outside_shoulders_at_landing_pass` (bool) | `bh.ts:183-187` | bool pass/fail | `readBool` | bool missing |
| 9 | `sequencing` | Sequencing | `pass_fail`, non-negotiable | `sequencing_ok` (bool) | `bh.ts:205-209` | bool | `readBool` | bool missing |
| 10 | `bat_path` | Bat Path In/Out of Zone | `score_meter` | `bat_path_score_100` (fallback `bat_path_score_10`) | `bh.ts:224-228` | 65 / 88 | `readScore100` | same |
| 11 | `on_plane` | On-Plane % | `score_meter` | `on_plane_pct` (number) | `bh.ts:244-248` | 60 / 85 via `scoreMeterState(value, conf, 60, 85)` | `readNumber` | `on_plane_pct` missing |
| 12 | `time_to_contact` | Time to Contact | `raw_pass_fail` | `time_to_contact_ms` (number) | `bh.ts:264-274` | elite if `value <= 150`, pass if `value <= 175`, else fail (`bh.ts:267-273`) | `readNumber` | `time_to_contact_ms` missing |
| 13 | `bat_speed_contact` | Bat Speed Through Contact | `raw_passed` | `bat_speed_contact_mph` (number) | `bh.ts:290-300` | elite ≥75, pass ≥65 (`bh.ts:293-294`) | `readNumber` | `bat_speed_contact_mph` missing |
| 14 | `back_elbow_contact` | Connection & Barrel Delivery | `score_meter` | `connection_barrel_delivery_score_100` only — legacy fallback explicitly removed (no second arg passed to `readScore100`, `bh.ts:317`) | `bh.ts:316-320` | 70 / 90 | `readScore100` | `connection_barrel_delivery_score_100` missing |
| 15 | `hitters_move` | Hitter's Move Quality | `score_meter`, non-negotiable | `hitters_move_score_100` (fallback `hitters_move_score_10`) | `bh.ts:337-341` | 70 / 92 | `readScore100` | same |
| 16 | `shoulder_plane_steadiness` | Shoulder Plane Steadiness | `score_meter` | `shoulder_plane_steadiness_score_100` (fallback `_score_10` — note: `_10` key is not defined in the contract at `bh.contract.ts:160-216`, fallback would never resolve) | `bh.ts:357-361` | 70 / 90 | `readScore100` | same |
| 17 | `finish_balance` | Finish & Balance | `score_meter` | `finish_balance_score_100` (no `_10` fallback — read via `readNumber`, `bh.ts:377`) | `bh.ts:376-380` | 65 / 88 | `readNumber` | same |
| 18 | `shoulder_to_shoulder_hold` | Shoulder-to-Shoulder Hold | `pass_fail`, non-negotiable | `front_shoulder_leak_before_contact` (bool, auto-fail trigger), `shoulder_to_shoulder_hold_pct_to_contact` (number), `shoulder_to_shoulder_hold_pass` (bool fallback), `front_shoulder_leak_pct_of_window` (number, used only for display string) | `bh.ts:397-441` | If leak.value === true → forced `fail` with `note` (`bh.ts:404-423`). Else if pct present: elite ≥95, pass ≥50, else fail (`bh.ts:427-436`). Else falls back to `passM` bool (`bh.ts:437-439`). | `min(leak.confidence, pctM?.confidence)` on auto-fail (`bh.ts:414-417`); `pctM.confidence` or `passM.confidence` otherwise | `missingState(a, "shoulder_to_shoulder_hold_pct_to_contact")` (`bh.ts:440`) when none of leak/pct/pass are present |

The phase grouping is set on each tile's `phase` field (`bh.ts:21,44,62,81,102,121,141,175,196,217,236,256,282,308,328,349,369,388`).

**All measurement values come from a single source.** Every numeric/bool above is produced by the AI model via the `return_analysis` tool call (`supabase/functions/analyze-video/index.ts:2021-2168`) and stored at `ai_analysis.metrics[<key>]` by the edge function (`index.ts:2248-2249, 2435-2461`). There is no client-side geometric measurement of any of these values — confirmed by `LANDMARK_MODEL_VERSION`/`DETECTOR_VERSION`/`METRIC_ENGINE_VERSION` all being `"@0.0.0-stub"` (`src/lib/biomech/versions.ts:24-27`; mirrored at `supabase/functions/_shared/biomechFingerprint.ts:11-14`). The "engine" is the LLM.

---

## S3 — Connect & Move (Hitter's Move) vs Barrel Delivery (Connection & Barrel Delivery)

There is no tile literally named "Connect & Move" in the current code. The two adjacent P4 tiles that share semantic territory are:

- **Hitter's Move Quality** (`bh.ts:322-342`, contract `bh.contract.ts:151-159` / server mirror `reportCardContracts.ts:314-322`).
  - Reads: `hitters_move_score_100` (number, 0–100).
  - Prompt text: "Score 0-100: hands stay back, elbow leads, no casting/early barrel flip, chest stays square, contact made with the hands, barrel catapults last." (`bh.contract.ts:158`).

- **Connection & Barrel Delivery** (`bh.ts:302-321`, contract `bh.contract.ts:141-148` / server mirror `reportCardContracts.ts:304-311`).
  - Reads: `connection_barrel_delivery_score_100` (number, 0–100).
  - Prompt text (contract `bh.contract.ts:147-148`): scores the P4 launch → barrel-delivery → contact window with explicit "do not use the old 'back elbow past belly button at contact' formula" instruction.

**Shared inputs:** both are AI-emitted 0–100 scores generated from the same 7 frames in the same single `return_analysis` call (`analyze-video/index.ts:2021-2168`). They do not share a numeric input field. They are both downstream of the same prompt block (`reportCardContracts.ts:457-474`) and the same `HITTING_DOCTRINE_PROMPT` / `HITTING_CAUSAL_CHAIN_PROMPT` (`analyze-video/index.ts:267-269`).

**Differences in code:**
- Acceptable / elite thresholds differ: 70 / 92 vs 70 / 90 (`bh.ts:340, 319`).
- Connection & Barrel Delivery explicitly drops the legacy `_score_10` fallback (`bh.ts:317`); Hitter's Move keeps it (`bh.ts:338`).
- Non-negotiable flag: Hitter's Move = true (`bh.ts:329`); Connection & Barrel Delivery = false (no `nonNegotiable: true`).

**What the code does not encode:** whether the AI is instructed to differentiate "barrel delivery quality" from "hitter's move quality" beyond the prompt text shown above. Undetermined from code — evidence needed: empirical correlation between the two emitted scores on the same video.

---

## S4 — Bat Path vs On-Plane %

- **Bat Path In/Out of Zone** (`bh.ts:211-229`, contract `bh.contract.ts:101-109`).
  - Reads `bat_path_score_100` (fallback `bat_path_score_10`).
  - Prompt: "Score 0-100 for elite bat path: enters behind ball, exits in front, long on-plane window. PASS at 65, ELITE at 88." (`bh.contract.ts:108`).

- **On-Plane %** (`bh.ts:230-249`, contract `bh.contract.ts:110-119`).
  - Reads `on_plane_pct` (number, 0–100; unit `percent` at `bh.contract.ts:114-116`).
  - Prompt: "Percentage of the swing arc that stays on the plane of the incoming pitch. PASS at 60%, ELITE at 85%." (`bh.contract.ts:117-118`).

**Diff:** Bat Path is an AI 0–100 quality judgment; On-Plane % is an AI percentage estimate of the swing-arc-on-plane window. Both are emitted in the same tool call. The Bat Path prompt explicitly references "long on-plane window" as one of its scoring inputs (`bh.contract.ts:108`), so the two fields share a semantic input even though they are separate numeric outputs.

`.lovable/bat-path-vs-on-plane-definitions.md` exists; per the plan, it is referenced only as a pointer and is not the source of truth for this audit. The code computes nothing beyond what is described above.

---

## S5 — Undetected Metrics: Contract → Prompt → Reader → Tile Trace

For each metric: declared in contract, embedded in the prompt block, read by the tile, and the literal missing-reason path.

### P2 knee-lift (`p2_timing_pass`)
- Contract: `bh.contract.ts:33-40`; server `reportCardContracts.ts:179-185`.
- Prompt instruction (verbatim, `bh.contract.ts:38-39`): "TRUE if the hitter's hand load is finished by the time the pitcher reaches PEAK KNEE LIFT. … If the pitcher's knee lift is not visible in the frames, set missing=true with reason `'Pitcher knee lift not in frame'`."
- Prompt is concatenated into the user message by `buildMetricsPromptBlock` (`reportCardContracts.ts:457-474`); attached at `analyze-video/index.ts:2158`.
- Reader: `readBool(a, "p2_timing_pass")` (`bh.ts:70`).
- Missing path: `missingState(a, "p2_timing_pass")` (`bh.ts:71`) which calls `metricReaders.ts:47-54` and surfaces whatever string the AI emitted (or `undefined`).
- Literal missing_reason strings the system can emit: AI-authored, e.g. `"Pitcher knee lift not in frame"` (from the prompt). The server also injects `"single_pass_only"` when a required key comes back missing/unparseable in the single pass (`analyze-video/index.ts:2258-2273`).
- Failure category from code: **AI did not return a value, or AI explicitly set missing=true**. Whether the actual reason was occlusion vs frame budget is `undetermined from code — evidence needed`.

### P3 release (`p3_release_offset_ms`)
- Contract: `bh.contract.ts:72-81`; server `reportCardContracts.ts:226-234`.
- Prompt: requires "Signed milliseconds from pitcher RELEASE to the hitter's FRONT FOOT FULLY DOWN" with the instruction "If pitcher release or full-foot-down is not visible, set missing=true with the specific missing anchor" (`bh.contract.ts:80`).
- Reader: `readNumber(a, "p3_release_offset_ms")` (`bh.ts:149`).
- Missing path: `missingState(a, "p3_release_offset_ms")` (`bh.ts:150`) — reason originates with the AI. `"single_pass_only"` fallback applies if blank (`analyze-video/index.ts:2266-2268`).
- Failure category: model-emitted missing. No client-side fallback computation (no detector exists; `DETECTOR_VERSION` is `"events@0.0.0-stub"` at `versions.ts:26`).

### Hands outside shoulders at landing (`hands_outside_shoulders_at_landing_pass`)
- Contract: `bh.contract.ts:82-89`; server `reportCardContracts.ts:236-243`.
- Prompt: "TRUE if at the frame of FRONT-FOOT STRIKE (landing) the hands sit HORIZONTALLY OUTSIDE the line of the back shoulder … If hands or back shoulder are not visible in the landing frame, set missing=true with reason `'Hands or back shoulder not visible at landing'`." (`bh.contract.ts:87-88`).
- Reader / missing path: `readBool` / `missingState` (`bh.ts:184-185`).
- Failure category: model decision.

### Bat speed (`bat_speed_contact_mph`)
- Contract: `bh.contract.ts:130-139`; server `reportCardContracts.ts:293-301`.
- Prompt on the server side (`reportCardContracts.ts:300-301`): "Estimated barrel speed AT contact, in mph. … Method: measure peak translational speed of the BARREL TIP over a 2-frame window straddling the contact frame. Convert pixels/frame to mph using the bat length as the calibration ruler (default bat length = 33 in if unknown — note this assumption). … If the barrel is obscured at contact, if frame rate is unknown, or if motion blur prevents tracking the barrel tip across two consecutive frames, set missing=true with the specific reason. NEVER GUESS."
- Client-side contract prompt is shorter (`bh.contract.ts:137-138`): "Estimated barrel speed AT contact in mph. PASS ≥65, ELITE ≥75. If no sensor data and motion blur is too high to estimate, set missing=true with reason `'Frame rate too low for bat speed estimate'`."
- Note: contract is mirrored between client and server but the bat-speed prompt **diverges between client (`bh.contract.ts`) and server (`reportCardContracts.ts`)** — the server is the prompt actually sent to the AI (it is the one read by `buildMetricsSchema`/`buildMetricsPromptBlock` in `analyze-video/index.ts:2158`).
- Reader: `readNumber(a, "bat_speed_contact_mph")` (`bh.ts:291`).
- Calibration code path: no client-side pixel-to-mph conversion exists. There is no detector that locates the bat. The "bat length = 33 in" calibration is an AI-side instruction in the prompt (`reportCardContracts.ts:301`), not a measured input.

### Time to contact (`time_to_contact_ms`)
- Contract: `bh.contract.ts:120-129`; server `reportCardContracts.ts:283-291`.
- Server prompt (`reportCardContracts.ts:290-291`): defines SWING START and CONTACT FRAME explicitly, computes `ms = (contact_frame - start_frame) * 1000 / fps`, requires `missing=true reason 'fps_unknown'` if fps absent, otherwise specific landmark reason. "NEVER GUESS."
- Client contract prompt (`bh.contract.ts:127-128`) is the short form: "Estimate from the visible frames using the displayed frame rate context."
- Reader: `readNumber(a, "time_to_contact_ms")` (`bh.ts:265`).
- The fps the AI uses is whatever the system prompt feeds it. The frame timestamps are embedded as `[Frame i/N]` labels (`analyze-video/index.ts:1990-1998`); the explicit per-frame `timestamp_seconds` from deterministic extraction is sent via `frameExtractions` on the request (`analyze-video/index.ts:40, 1659`) and recorded server-side, but the labels passed to the model do not include the timestamp in seconds — `undetermined from code` whether the model sees timestamps in the visible prompt; what's visible to the model is the system prompt and the `[Frame i/N]` headers.

---

## S6 — Bat Speed Audit

- Field: `bat_speed_contact_mph`, units `mph`, range `[30, 110]` (`bh.contract.ts:130-139`).
- The model is told to estimate barrel speed via a 2-frame window centered on contact, using `pixels/frame → mph` with a bat length assumed at 33" if unknown (`reportCardContracts.ts:301`).
- No code-side calibration exists:
  - `videos` row contains no bat-length column referenced in the analyze function (selected columns: `sha256_hex, fps_true, duration_sec, width, height, landing_time_sec, direction_sign, calibration_h_px, ai_analysis, efficiency_score, status` — `analyze-video/index.ts:1691`). `calibration_h_px` is athlete-height-based calibration for the determinism cache key (`fingerprint.ts:99-128`), not a bat ruler.
  - No client transmits a bat length to the function (`AnalyzeVideo.tsx:465-479, 572-586`).
  - No detector exists that finds the bat (versions are stubs at `versions.ts:24-27`).
- Therefore the emitted mph value is a model estimate from visual frames only, with the 33" assumption baked into the prompt. There is no measured pixel-to-real-world scale.
- Sampling budget: 7 frames per analysis (`frameExtractionDeterministic.ts:18-19`). The "2-frame window straddling contact" requested by the prompt is only available if two of the seven sampled frames happen to bracket contact.

---

## S7 — Time-to-Contact Audit

- Field: `time_to_contact_ms`, units `ms`, range `[80, 400]` (`bh.contract.ts:120-129`).
- Server prompt (`reportCardContracts.ts:283-291`) defines SWING START as "first frame in which the knob begins forward motion AFTER the hand-load has completed AND the hips have begun to clear" and CONTACT FRAME as "first frame in which the bat barrel overlaps the ball", computing `(contact_frame - start_frame) * 1000 / fps`.
- No code-side detector identifies "knob forward motion" or "barrel-overlaps-ball"; both are model judgments from the 7 frames.
- The fps the model uses is whatever it infers from the prompt. The deterministic `fps_true` is captured per-video at `probeVideoMetadata.ts:121` and persisted on the row at `AnalyzeVideo.tsx:434`, but `undetermined from code` whether the model receives fps_true verbatim in its visible prompt; what is verifiable: the user message does include `[Frame i/N]` labels (`analyze-video/index.ts:1990-1998`) and the system prompt block contains the contract prompt (`analyze-video/index.ts:2158`); nothing in the read sections of the edge function code shows fps being interpolated into the user prompt text. Evidence needed: a full dump of the assembled prompt at runtime.
- Sampling: 7 frames (`frameExtractionDeterministic.ts:18-19`). Resolution of any frame-difference measurement is bounded by the 7-sample budget; at 30 fps the inter-sample interval given AUTO_PERCENTAGES `[0.10, 0.25, 0.40, 0.50, 0.60, 0.75, 0.90]` over a ~3s clip is hundreds of ms. The model cannot reach the ≤150 ms elite threshold from frame-counting alone unless contact and swing start happen to fall on adjacent sampled frames; otherwise it is interpolating.

---

## S8 — Failure Paths in `analyze-video`

**Upload entry (`AnalyzeVideo.tsx`):**
- `handleFileSelect` rejects non-video MIME and files >50 MB (`AnalyzeVideo.tsx:289-297`).
- `handleUploadAndAnalyze` requires `videoFile && user` (`AnalyzeVideo.tsx:307-308`).
- `probeVideoMetadata` failure → toast + early return (`AnalyzeVideo.tsx:315-323`).
- Frame extraction failure → toast + early return (`AnalyzeVideo.tsx:331-371`); fewer than 3 frames extracted throws inside try block (`AnalyzeVideo.tsx:350-352`).
- Video row insert error throws (`AnalyzeVideo.tsx:444`).
- Edge-function invoke error: status set on `analysisError`, branches on 429 / 402 / generic (`AnalyzeVideo.tsx:481-493`).
- On success, `setAnalysis(analysisData)` is called unconditionally even if the payload's `ai_analysis.metrics` is null or empty (`AnalyzeVideo.tsx:496`).

**Edge function (`analyze-video/index.ts`):**
- Zod request schema requires `frames.length >= 3` (`index.ts:33`).
- Missing `videos.sha256_hex` → 422 `rejected:missing_video_sha256` (`index.ts:1710-1725`).
- Missing `fps_true` → 422 `rejected:missing_probe_metadata` (`index.ts:1727-1743`).
- Phase 1 acceptance gates → 422 `rejected:*` (`index.ts:1746-1791`): low fps (<24), low resolution (<480x480), duration out of `[0.5, 60]`s, dropped-frame ratio >0.34.
- Cache hit: returns prior `ai_analysis` only if `prior && cachedAi && videoRow?.status === "completed"` (`index.ts:1816`); else cache miss path proceeds. If cache hit, returns 200 with `replay_cache: true` (`index.ts:1831-1840`).
- `videos.status` set to `"processing"` after cache miss (`index.ts:1847`).
- AI gateway call: `retryFetch` with up to 3 attempts on 5xx/408/425/429 (`index.ts:65-89`, `2005`).
- AI gateway failure: writes `status: "failed"` with `ai_analysis: { error: errorData }` to the video (`index.ts:2180-2186`); throws a class-tagged Error so the outer catch records one `failed` audit row (`index.ts:2188-2206`).
- Tool-call parse: if `toolCalls` missing, falls back to text parse — sets `feedback = content` and best-effort score (`index.ts:2409-2417`). In that fallback, `metrics` stays `null`, `summary = []`, `positives = []`, `drills = []`, and the row is still written with `status: "completed"` further below.
- "Complete but empty" path: if `analysisArgs.metrics` is missing or not an object, `metrics` stays `null` (`index.ts:2237, 2248-2251`); the final write at `index.ts:2463-2472` sets `status: "completed"` regardless. `ai_analysis.metrics` is then `null` (`index.ts:2446`).
- Auto-recompute on the client: when the analysis is loaded with fewer than 3 present metric values, `AnalyzeVideo.tsx:245-264` invokes `recompute-report-card` (one-shot per video). Whether that function deterministically completes the missing metrics is `undetermined from code — evidence needed` (the function is not in the read set).
- Failed-state thumbnail path: thumbnail generation failure is caught and analysis proceeds without a thumbnail (`AnalyzeVideo.tsx:407-421`). Does not affect analysis completion semantics.

**Can `status === "completed"` coexist with empty metrics / empty summary / empty feedback?** Yes:
- Empty `metrics` (`null`): `index.ts:2446` writes `metrics: metrics ?? null`, then `index.ts:2467` writes `status: "completed"`. No guard.
- Empty `summary`: `summary` is regenerated via `makeBeginnerBullets(feedback, positives)` at `index.ts:2419-2423` only if it is empty; if `feedback` and `positives` are also empty, the resulting array is empty but the row still completes.
- `feedback` defaults to `"No analysis available"` (`index.ts:2212`) and then `"No feedback available"` if tool-call parse succeeded but feedback was empty (`index.ts:2244`).
- `efficiency_score` defaults to `75` (`index.ts:2211, 2241`) if AI returns nothing parseable.

---

## S9 — Same-Video Nondeterminism Sources

**Cache fingerprint inputs (canonical, `src/lib/biomech/fingerprint.ts:113-138`):**
```
SHA256(
  videoSha256Hex : LANDMARK_MODEL_VERSION : DETECTOR_VERSION : METRIC_ENGINE_VERSION
  : fpsTrue.toFixed(6) : landingTimeSec.toFixed(6)|null : directionSign : calibrationHpx.toFixed(6)
)
```
Server mirror at `supabase/functions/_shared/biomechFingerprint.ts:42-70` is byte-identical in structure.

**Cache LOOKUP key in the edge function (`analyze-video/index.ts:1805-1814`):**
```
videos.id == videoId  AND  video_analysis_runs.cache_fingerprint_hex == cacheFingerprintHex  AND  outcome == 'ok'
```
This is the load-bearing finding: cache lookup is scoped to a single `videoId`. The cache fingerprint includes the video bytes hash, but the LOOKUP is `eq("video_id", videoId)`. Re-uploading the same bytes as a new `videos` row produces a new `video_id`, which cannot hit the cache of any prior video_id even though `cache_fingerprint_hex` would match. Cross-video cache reuse is impossible by construction.

**Determinism controls inside the AI call (`analyze-video/index.ts:2011-2016`):**
- `model: "google/gemini-2.5-flash"` (fixed).
- `temperature: 0`.
- `top_p: 0`.
- `seed: stableSeed(videoId)` — FNV-1a over `videoId`, masked to int32 (`index.ts:48-56`).

The seed depends on `videoId`, not on video bytes. Two uploads of identical bytes produce different `videoId`s → different seeds → potentially different model output.

**Enumerated nondeterminism sources, ranked by code evidence:**

1. **Re-upload as a new `videos` row.** `videoId` is a new UUID per upload (`AnalyzeVideo.tsx:424-444`). New UUID → new seed (`index.ts:48-56, 2016`) AND new cache-lookup scope (`index.ts:1810`). High confidence: same bytes can produce different scores on each re-upload.
2. **`fps_true` rounding/snapping drift across probes.** `probeVideoMetadata.ts:84-91` snaps measured fps to the nearest standard rate within 0.5 fps, else rounds to 3 decimals. Browser frame-callback timing varies; if a borderline video falls on either side of the snap window across probes, `fps_true` differs → different `cache_fingerprint_hex` (`fingerprint.ts:116`) AND different `frame_index` selection (`frameExtractionDeterministic.ts:45-58`).
3. **PNG byte-stability across browsers.** Frames are encoded via `canvas.toBlob(resolve, "image/png")` (`frameExtraction.ts:101`). Per `frameExtraction.ts:8-11` comment, PNG is used because JPEG is "not byte-stable across browsers". PNG itself includes encoder-defined chunks (e.g. `tIME`, gamma) that vary by browser/runtime; same-browser repeat should be stable, cross-browser is `undetermined from code — evidence needed`. Frame `frame_index` selection IS deterministic via integer math (`frameExtractionDeterministic.ts:37-72`), but per-frame `sha256_hex` may vary because PNG bytes vary. This does not affect the cache fingerprint (which is keyed on video bytes, not frame bytes) but does affect `video_frame_extractions` audit content.
4. **`landingTimeSec` input drift.** The cache key includes `landingTimeSec.toFixed(6)` (`fingerprint.ts:115, 130`). The client passes `landingTime` only if explicitly marked by the user (`AnalyzeVideo.tsx:339, 552-559`); the value is set via UI not visible in the read set. Different landing-time values on the same video → different cache keys and different frame-extraction grid (`frameExtractionDeterministic.ts:49-53`).
5. **`fallback fps = 30`.** When `requestVideoFrameCallback` is unavailable, `probeFps` returns the constant `FALLBACK_FPS = 30` (`probeVideoMetadata.ts:26, 37-39`). On browsers without rVFC, the probe is fully deterministic but may not match a real-rVFC probe.
6. **Frame-selection clamp/dedup determinism.** Pure integer math, no time/random sources (`frameExtractionDeterministic.ts:48-71`). Same `fps_true + duration_sec + landingTime` → identical indices. Stable.
7. **Retry path.** `retryFetch` re-sends identical body (`analyze-video/index.ts:65-89, 2005-2169`). Replay-safe for the AI call.
8. **Auto-recompute.** Client invokes `recompute-report-card` exactly once per `videoId` per page-mount when `<3` metrics present (`AnalyzeVideo.tsx:244-264`). Whether the recompute function uses the same seed/temperature/cache key — `undetermined from code — evidence needed` (function not in read set).
9. **Prompt content drift via historical context.** The system prompt incorporates "historical analysis data" formatted from previous uploads (`analyze-video/index.ts:226-260`). Different historical state at the moment of analysis → different prompt → different `prompt_hash` (`index.ts:2433`) → different model output even with the same seed (Gemini's `seed` is best-effort and only stabilizes output when the prompt is also identical; the prompt fingerprint is not included in the cache key by constitutional rule per `versions.ts:21-22`).
10. **Model upstream drift.** `model: "google/gemini-2.5-flash"` is a moving target on the upstream side (versioning beyond `2.5-flash` is not pinned). `MODEL_VERSION = "2.5-flash"` is stored on the row (`index.ts:2432`) but cannot pin upstream behavior.

**Replay equivalence claim vs reality.** The Phase 0 fingerprint excludes prompt text, athlete context, and AI model id by constitutional rule (`versions.ts:21-22`, `fingerprint.ts:88-90`). Therefore two different prompts that produce different AI output can share the same `cache_fingerprint_hex` — but the cache write only happens via `recordAnalysisRun(outcome:"ok")` after a successful analysis (`index.ts:2493-2497`), and the cache READ requires both the same `cache_fingerprint_hex` AND the same `videoId` (`index.ts:1810-1814`). The cache cannot serve a wrong-prompt result because re-prompt happens only within the same `videoId`; but cross-`videoId` reuse of bytes-identical analyses is **never** served from cache.

---

## S10 — Desktop Failure Path

**Upload page paths used on desktop:**
- `<input type="file" accept="video/*">` is the upload control (full path not in read set — visible in handler signature `AnalyzeVideo.tsx:285-305`). 50 MB cap (`AnalyzeVideo.tsx:294`).
- `URL.createObjectURL(file)` (`AnalyzeVideo.tsx:300`) for preview.

**Probe path (desktop-impacting):** `src/lib/biomech/probeVideoMetadata.ts`.
- Creates a hidden `<video>` element, sets `preload="auto"`, `muted=true`, `playsInline=true`, `src = blob URL` (`probeVideoMetadata.ts:98-102`).
- Awaits `loadedmetadata`; on `error` event rejects with `"video metadata load failed"` (`probeVideoMetadata.ts:104-113`). This bubbles into `AnalyzeVideo.tsx:315-323` and shows the "probe failed" toast.
- `probeFps` requires `videoEl.requestVideoFrameCallback` (`probeVideoMetadata.ts:33-39`). If absent, returns the constant `FALLBACK_FPS = 30` (no failure). Calls `videoEl.play()` which can be blocked by autoplay policy; on rejection it falls back to the timeout path (`probeVideoMetadata.ts:66-68`).

**Frame-extraction path (desktop-impacting):** `src/lib/frameExtraction.ts`.
- Creates a hidden `<video>` and `<canvas>` (`frameExtraction.ts:55-58`). Throws if 2D context unavailable.
- Awaits `loadedmetadata`; on error rejects with `"video metadata load failed"` (`frameExtraction.ts:73-78`).
- Seeks via `video.currentTime = sel.timestamp_seconds`, awaits `seeked` event with an 8 s timeout per frame (`frameExtraction.ts:88-98`). Timeout drops the frame with a console.warn (`frameExtraction.ts:115-117`).
- `canvas.toBlob(resolve, "image/png")` is required (`frameExtraction.ts:101`). Older Safari and Firefox have implemented this for years, but encoding behavior is browser-specific.

**Identified desktop-specific blockers from code:**
- `requestVideoFrameCallback` not present in all desktop browsers (e.g., Firefox does not ship it as of this codebase; Safari shipped it more recently than Chrome). When absent, `fps_true` defaults to 30 (`probeVideoMetadata.ts:26, 37-39`). This does not block analysis; it pins fps to 30 deterministically, which is fine for the cache key but inaccurate for any timing-derived metric (P3 timing, time-to-contact).
- Autoplay blocked + no rVFC: probe relies on the timeout path with whatever `mediaTimes` accumulated (`probeVideoMetadata.ts:51-53`). If none accumulated, fps falls to 30.
- Codec/container support: any video the desktop browser cannot decode raises the `<video>` `error` event in `probeVideoMetadata.ts:106` and `frameExtraction.ts:75`, surfacing as "probe failed" or "frame extraction failed" toast. No code-side codec detection.
- Per-frame `seeked` timeout: 8 s budget × 7 frames = 56 s ceiling. If decoder seek is slow (large/long videos in Safari), frames silently drop (`frameExtraction.ts:115-117`); the server then enforces `frames.length >= 3` (`analyze-video/index.ts:33`) and `dropped/requested <= 0.34` (`index.ts:1785-1790`) — videos that lose too many frames get `reject_excessive_dropped_frames`.
- No UA-gated code path, no desktop-specific branch is present in the read set. `undetermined from code — evidence needed`: actual cross-browser test matrix.

---

## S11 — Trust Score per Metric

Justification rooted strictly in S2–S10 evidence. "Confidence" below means measurement-confidence of the underlying signal as evidenced by the code path; it is independent of the AI's self-reported `confidence` field.

| Metric (tile key) | Class | Justification (cite) |
|---|---|---|
| `hip_load` | EXPERIMENTAL | AI-only 0–100 quality judgment; no detector backing (S2; `versions.ts:24-27`). Stable across seed when prompt and `videoId` are identical (S9). |
| `hand_load` | EXPERIMENTAL | Same as above. |
| `p2_timing` | EXPERIMENTAL | Boolean depending on AI identifying pitcher peak knee lift in a 7-frame sample; no detector (`reportCardContracts.ts:179-185`, S5). |
| `eyes_tracking` | EXPERIMENTAL | AI 0–100; no head-tracking signal in code. |
| `stride_direction` | PARTIALLY TRUSTWORTHY | AI-emitted degrees; threshold logic is deterministic at `bh.ts:112`. Reliability depends on AI angle judgment from 7 frames. |
| `heel_plant` | EXPERIMENTAL | AI 0–100; no foot-strike detector. |
| `p3_timing` | EXPERIMENTAL | Continuous ms offset emitted by AI; scoring formula is deterministic (`bh.ts:152-168`), but the input is entirely AI-derived from 7 frames with no per-frame release/foot-down detector. |
| `hands_outside_shoulders_at_landing` | EXPERIMENTAL | Boolean depending on AI seeing the landing frame; only ~7 frames available. |
| `sequencing` | EXPERIMENTAL | Boolean AI judgment; non-negotiable in the grading layer (`bh.ts:197`). |
| `bat_path` | EXPERIMENTAL | AI 0–100; overlaps semantically with `on_plane` (S4). |
| `on_plane` | EXPERIMENTAL | AI percentage; 7-frame sampling makes a true "plane window" estimate sparse (S7). |
| `time_to_contact` | NOT READY FOR USERS | Hard ms output, but resolution is bounded by 7-frame sampling (S6/S7). Cannot reach the ≤150 ms elite band reliably from frame-counting; the model is effectively interpolating. |
| `bat_speed_contact` | NOT READY FOR USERS | mph output from AI with no pixel-to-real-world calibration in code (S6); 33" bat assumption is prompt-side only. |
| `back_elbow_contact` (Connection & Barrel Delivery) | EXPERIMENTAL | New formula; AI 0–100 over a window the model itself must identify (`bh.contract.ts:147-148`). No detector. |
| `hitters_move` | EXPERIMENTAL | AI 0–100; non-negotiable in grading. |
| `shoulder_plane_steadiness` | EXPERIMENTAL | AI 0–100; `_score_10` fallback key is undefined in the contract (S2 row 16). |
| `finish_balance` | EXPERIMENTAL | AI 0–100; uses `readNumber` (no `_10` fallback). |
| `shoulder_to_shoulder_hold` | EXPERIMENTAL | Compound AI inputs (`pct`, `pass`, `leak`); auto-fail logic is deterministic (`bh.ts:404-423`) but inputs come from AI judging a multi-frame window from 7 samples. |

No metric in the BH report card currently reads a value produced by code-side geometric measurement; the entire stack is AI-derived (S2 footer). No metric meets the bar for **TRUSTWORTHY** as defined by code-side measurement evidence.

---

## A — Metrics safe for production today

None on the BH report card meet "TRUSTWORTHY" by the code-evidence bar applied in S11 (every signal is AI-derived from 7 frames; no detector or calibration backs any tile).

## B — Metrics requiring redesign

- `time_to_contact` — needs an input path with frame resolution sufficient for sub-25 ms accuracy. Today: 7-frame sample budget (`frameExtractionDeterministic.ts:18-19`) + AI interpolation.
- `bat_speed_contact` — needs real-world calibration (bat-length scale, contact-frame anchor). Today: AI-only with 33" prompt assumption (`reportCardContracts.ts:301`).
- `back_elbow_contact` (Connection & Barrel Delivery) — new window-based formula has no detector for launch / extension-start / contact anchors; entirely AI-judged.

## C — Metrics requiring investigation

- Same-video repeatability of all AI-derived tiles across re-uploads (S9-1).
- Cross-browser frame-PNG byte-stability (S9-3) and its downstream effect on the AI's reading of those frames (visual content is identical; PNG byte ordering is not the model's input — but `video_frame_extractions` audit content varies).
- Whether the assembled user prompt visible to the model contains explicit `fps` and per-frame `timestamp_seconds` (S7 — `undetermined from code`).
- Behavior of `recompute-report-card` (called from `AnalyzeVideo.tsx:255`) — file not in read set, contract unknown.
- Empirical correlation between `hitters_move_score_100` and `connection_barrel_delivery_score_100` (S3).
- Desktop browser failure matrix (S10 — no UA-gated code; evidence requires runtime testing).

## D — Metrics that should be hidden until trustworthy

Determined strictly from S11 classifications above: all BH tiles classified **EXPERIMENTAL** or **NOT READY FOR USERS** would be hidden under that criterion, i.e. every BH tile in the current set. This is an audit classification, not a recommendation.

---

End of audit. No proposals follow; this document is closed pending review.
