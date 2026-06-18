# Phase 5 — Canonical Gap Analysis & Build Matrix

Compares **Current Reality** (Phase 1.75 Audit + Phase 2 Extraction) against
**Canonical State** (Phase 3 Measurement Architecture + Phase 4 Implementation
Blueprint). Every Current cell cites `audit S#` or `extraction §#`. Every
Canonical cell cites `arch Part#.§` or `bp §#`. No new investigation,
no roadmap, no sequencing, no estimates. Inventory only.

---

## Preamble

**Citation shortcuts**
- `audit S#` → `.lovable/analysis-truth-audit.md` section S1–S11.
- `extract §#` → `.lovable/analysis-truth-extraction.md` section.
- `arch P#.§` → `.lovable/canonical-measurement-architecture.md` Part #.
- `bp §X` → `.lovable/canonical-implementation-blueprint.md` Section A–I.

**Gap classification vocabulary**
- `BUILD` — component does not exist; must be authored.
- `FIX` — component exists but violates canonical contract.
- `REPLACE` — component exists; must be swapped for a canonical implementation.
- `HIDE` — surface must be removed/gated until canonical path lands.
- `RETAIN` — current already matches canonical; no work.
- `CALIBRATE` — parameter/threshold tuning only; no new code.

**Trust class vocabulary (from audit S11)**
- `T0` fabricated (no measurement substrate).
- `T1` stub (versioned `@0.0.0-stub`; AI-only; no detector).
- `T2` partial-deterministic (some geometry, no calibration / anchors).
- `T3` deterministic-uncalibrated (deterministic engine, lacks pinned cal).
- `T4` production-ready (passes all 10 blueprint §I gates).

**Audit-derived shared facts (apply to every BH metric row)**
- Producer = AI tool-call only (`audit S2`, `extract §3`).
- Engine versions = `@0.0.0-stub` across `LANDMARK_MODEL_VERSION`,
  `DETECTOR_VERSION`, `METRIC_ENGINE_VERSION` (`audit S3`).
- Sample budget = 7 frames per clip (`audit S7`).
- Calibration = prompt-only 33 in bat length, no pixel scaler (`audit S6`).
- Seed = `stableSeed(videoId)`; re-upload changes seed (`audit S5`).
- Cache key includes `video_id`; re-upload misses cache (`audit S4`).
- Probe `fps_true` falls back to synthetic 30 fps (`audit S9`).

Every metric therefore starts at **T1** unless audit S11 places it lower.
The audit places `time_to_contact` and `bat_speed_contact` in Bucket B
(requires redesign) — treated as T1 with calibration-blocking gap rather
than a higher trust class.

---

## Section A — Metric Gap Matrix (18 BH metrics)

`★` = special-focus metric called out in Phase 3 brief.

| # | Metric | Current State | Canonical State | Gap | Trust | Required Detectors | Required Anchors | Required Calibration | Phone-Only Possible? | Production Ready? |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `hip_load` | AI score 0–100 from 7 frames; no pose-geometry compute (`audit S10 #1`, `S11`) | Hybrid: D-POSE hip-shoulder separation geometry over landing→launch window; AI bounded residual (`arch P2 §1`, `bp §D`) | BUILD detector binding + geometry engine; REPLACE AI-only producer | T1 | D-POSE | landing_frame, launch_frame | none beyond intrinsic pose | Y if T-mid 60 fps | N |
| 2 | `hand_load` | AI score 0–100; no hand tracker (`audit S10 #2`) | Hybrid: D-POSE+D-HANDS trajectory of hand cluster vs torso; AI residual (`arch P2 §2`, `bp §B2`) | BUILD D-HANDS integration; BUILD geometry engine; REPLACE producer | T1 | D-POSE, D-HANDS | hand_load_peak_frame, landing_frame | none | Y if T-mid | N |
| 3 | `p2_timing` ★ | AI boolean anchored to pitcher event from ≤7 frames (`audit S10 #3`, `S11 D`) | Deterministic: ms-offset between hand-load-peak anchor and pitcher knee-lift anchor; tile is offset-windowed pass/fail (`arch P2 §3`, `bp §C`) | BUILD D-RELEASE / pitcher-event anchor; BUILD D-HANDS hand-load-peak anchor; REPLACE producer; HIDE until anchors land | T1 | D-POSE, D-HANDS, D-RELEASE | pitcher_knee_lift_frame, hand_load_peak_frame | none | Y if T-mid + pitcher visible | N |
| 4 | `eyes_tracking` | AI score; no head-tracking (`audit S10 #4`) | Hybrid: D-POSE head-yaw/pitch stability over swing window; AI residual on gaze plausibility (`arch P2 §4`) | BUILD head-orientation engine; REPLACE producer | T1 | D-POSE | swing_start_frame, contact_frame | none | Y if T-mid | N |
| 5 | `stride_direction` | AI degree estimate; no pose math (`audit S10 #5`) | Deterministic: D-POSE foot vector vs plate-line; degrees off square (`arch P2 §5`) | BUILD foot-vector geometry; REPLACE producer | T1 | D-POSE | stride_landing_frame | plate-line reference (calibration_h_px or homography prior) | Y if T-low + plate visible | N |
| 6 | `heel_plant` | AI composite score (`audit S10 #6`) | Hybrid: D-POSE+D-PLANT heel-first vs toe-first plant classification; AI residual on quality (`arch P2 §6`) | BUILD D-PLANT; REPLACE producer | T1 | D-POSE, D-PLANT | stride_landing_frame, heel_contact_frame | none | Y if T-mid | N |
| 7 | `p3_timing` ★ | AI ms anchored to pitcher release from ≤7 frames (`audit S10 #7`, `S11 D`) | Deterministic: ms-offset between front-foot-plant anchor and pitcher-release anchor (`arch P2 §7`, `.lovable/p3-timing-methodology.md`, `bp §C`) | BUILD D-RELEASE; BUILD D-PLANT; REPLACE producer; HIDE until anchors land | T1 | D-POSE, D-RELEASE, D-PLANT | pitcher_release_frame, front_foot_plant_frame | none | Y if pitcher visible in same frame as batter | N |
| 8 | `hands_outside_shoulders_at_landing` ★ | AI single-frame boolean (`audit S10 #8`, `S11 D`) | Deterministic: D-POSE hand-cluster horizontal vs back-shoulder at landing-anchor frame (`arch P2 §8`) | BUILD landing-anchor detector binding; REPLACE producer; HIDE until anchor lands | T1 | D-POSE | stride_landing_frame | none | Y if T-low | N |
| 9 | `sequencing` | AI whole-swing boolean (`audit S10 #9`, `S11 D`) | Deterministic: D-POSE+D-BAT peak-velocity ordering hips→torso→hands→barrel; tile is order-pass (`arch P2 §9`, `bp §D`) | BUILD D-BAT; BUILD per-segment angular velocity engine; REPLACE producer; HIDE until detectors land | T1 | D-POSE, D-BAT | swing_start_frame, contact_frame, plus 4 segment-peak anchors | none | Y if T-mid + side-on | N |
| 10 | `bat_path` ★ | AI subjective score (`audit S10 #10`) | Deterministic: D-BAT barrel-axis trajectory; in-zone / out-of-zone classification per `.lovable/bat-path-vs-on-plane-definitions.md` (`arch P2 §10`) | BUILD D-BAT; BUILD barrel-axis tracker + zone reconstruction; REPLACE producer | T1 | D-POSE, D-BAT | swing_start_frame, contact_frame | strike-zone reconstruction (calibration_h_px + posture height) | Y if T-mid + side-on | N |
| 11 | `on_plane` ★ | AI percent; no per-frame plane geometry (`audit S10 #11`) | Deterministic: D-BAT barrel-axis vs swing-plane; pct of swing in-plane per `.lovable/bat-path-vs-on-plane-definitions.md` (`arch P2 §11`) | BUILD D-BAT; BUILD swing-plane fit + per-frame deviation; REPLACE producer | T1 | D-POSE, D-BAT | swing_start_frame, contact_frame | swing-plane prior from D-POSE | Y if T-mid + side-on | N |
| 12 | `time_to_contact` ★ | AI ms from 7 frames; 30 fps fallback → ≈33 ms granularity (`audit S10 #12`, `S11 B`, `extract §5`) | Deterministic: D-CONTACT contact_frame minus swing_start_frame, in ms at probed `fps_true`; requires T-high ≥120 fps for production class (`arch P2 §12`, `.lovable/time-to-contact-vs-power.md`, `bp §C`) | BUILD D-CONTACT; BUILD swing-start anchor; REPLACE producer; FIX probe contract (no synthetic 30 fps); CALIBRATE frame-density gate to T-high | T1 | D-POSE, D-BAT, D-CONTACT | swing_start_frame, contact_frame | none beyond fps_true validity | Y only at T-high (≥120 fps) per `arch P3` | N |
| 13 | `bat_speed_contact` ★ | AI mph with prompt-only 33 in bat length; no bat detector; no pixel scaler (`audit S6`, `S10 #13`, `S11 B`) | Hybrid: D-BAT barrel-tip displacement across contact ± frames × calibrated px-per-inch (bat-length prior) × fps_true; T-high required; AI residual bounded ±10 (`arch P2 §13`, `bp §D20`) | BUILD D-BAT; BUILD pixel-scaler from bat-length prior; BUILD T-high probe gate; REPLACE producer; ENFORCE bat-length prior server-side (currently prompt-only) | T1 | D-POSE, D-BAT | contact_frame ±k | bat-length prior with uncertainty; calibration_h_px or homography; fps_true | Y only at T-high + side-on + bat fully visible | N |
| 14 | `back_elbow_contact` (Connect & Move / Barrel Delivery) ★ | AI composite (`audit S10 #14`) | Hybrid: D-POSE elbow-torso angle progression + D-BAT barrel delivery vector across launch→contact window per `.lovable/back-elbow-methodology.md` (`arch P2 §14`) | BUILD D-BAT; BUILD elbow-progression engine; REPLACE producer | T1 | D-POSE, D-BAT | launch_frame, contact_frame | none | Y if T-mid | N |
| 15 | `hitters_move` | AI composite (`audit S10 #15`) | Hybrid: D-POSE COM-direction + stride composite over load→launch (`arch P2 §15`) | BUILD COM-trajectory engine; REPLACE producer | T1 | D-POSE | load_peak_frame, stride_landing_frame | none | Y if T-mid | N |
| 16 | `shoulder_plane_steadiness` | AI score; no per-frame shoulder geometry (`audit S10 #16`) | Deterministic: D-POSE shoulder-line angular variance across load→contact (`arch P2 §16`) | BUILD shoulder-line variance engine; REPLACE producer | T1 | D-POSE | load_peak_frame, contact_frame | none | Y if T-mid | N |
| 17 | `finish_balance` | AI score (`audit S10 #17`) | Hybrid: D-POSE COM stability post-contact per `.lovable/finish-and-balance-methodology.md` (`arch P2 §17`) | BUILD post-contact COM-window engine; REPLACE producer | T1 | D-POSE | contact_frame, finish_frame | none | Y if T-mid | N |
| 18 | `shoulder_to_shoulder_hold` | AI percent + booleans across landing→contact window; no tracker (`audit S10 #18`) | Deterministic: D-POSE chin-vector vs back-shoulder unit-vector pct of window in-hold; front-shoulder leak detector (`arch P2 §18`) | BUILD chin/shoulder vector tracker; REPLACE producer | T1 | D-POSE | stride_landing_frame, contact_frame | none | Y if T-mid | N |

---

## Section B — Detector Gap Matrix

| Detector | Exists? | Current implementation | Canonical contract | Required-by metrics | Gap |
|---|---|---|---|---|---|
| D-POSE | Missing (version stub only) | `LANDMARK_MODEL_VERSION = "blazepose_full@0.0.0-stub"` is a string constant; no runtime pose code feeds tile compute (`audit S2`, `S3`; `versions.ts:25`) | Blazepose Full @ pinned version; worker runtime; per-frame 33-landmark output; visibility & confidence per landmark (`bp §B1`) | 1–18 (all) | BUILD |
| D-HANDS | Missing | No hands tracker referenced in audit (`audit S2`, `S10`) | MediaPipe Hands @ pinned version; per-frame 21-keypoint per hand; worker (`bp §B2`) | 2 `hand_load`, 3 `p2_timing` | BUILD |
| D-BAT | Missing | No bat detector in code (`audit S6`, `S10 #10, #13`, `S11 B`) | Custom CNN barrel-keypoint detector; per-frame barrel knob + tip; pinned version; worker (`bp §B3`) | 9 `sequencing`, 10 `bat_path`, 11 `on_plane`, 12 `time_to_contact`, 13 `bat_speed_contact`, 14 `back_elbow_contact` | BUILD |
| D-BALL | Missing | No ball tracker referenced (`audit S2`) | Pitched-ball tracker; pinned version; worker; optional uplift for `p2_timing`/`p3_timing` quality (`bp §B4`) | Uplift for 3, 7; not required for any tile to ship | BUILD (optional uplift) |
| D-CONTACT | Missing | No contact-frame detector (`audit S10 #12`) | Contact-frame detector keyed off bat–ball proximity + audio-optional; pinned; worker (`bp §B5`) | 12 `time_to_contact`, 13 `bat_speed_contact`, 14 `back_elbow_contact` | BUILD |
| D-RELEASE | Missing | No pitcher-release detector (`audit S10 #3, #7`, `S11 D`) | Pitcher release-event detector from D-POSE pitcher skeleton; pinned; worker (`bp §B6`) | 3 `p2_timing`, 7 `p3_timing` | BUILD |
| D-PLANT | Missing | No front-foot plant detector (`audit S10 #6, #7`) | Foot-plant detector from D-POSE ankle/foot landmarks; pinned; worker (`bp §B7`) | 6 `heel_plant`, 7 `p3_timing` | BUILD |

---

## Section C — Determinism Gap Matrix

| Seam | Current | Canonical | Gap | Affected metrics |
|---|---|---|---|---|
| Seed source | `seed = stableSeed(videoId)` (FNV-1a over UUID); re-upload → new seed (`audit S5`; `analyze-video/index.ts:44-56, 2016`) | `seed = stableSeed(canonical_trace_fingerprint)` derived from `pose_trace`/`bat_trace`/anchors hash (`bp §F3`) | REPLACE seed source | All 18 (re-upload determinism) |
| Cache key | `(video_id, cache_fingerprint_hex)` filter requires byte-identical `videos.id`; new upload of same bytes → cache miss (`audit S4`; `analyze-video/index.ts:1807-1816`) | `cache(video_sha256_hex + cache_fingerprint_hex)` — no `video_id` in lookup; same bytes always hit (`bp §F2`, `§F4`) | REPLACE cache lookup; `video_id` is metadata only | All 18 |
| Engine version pins | All three constants pinned to `@0.0.0-stub` strings (`audit S3`; `versions.ts:25-27`, `biomechFingerprint.ts:10-13`) | `LANDMARK_MODEL_VERSION`, `DETECTOR_VERSION`, `METRIC_ENGINE_VERSION` pinned to real, immutable, semver-stable artifacts shipped with code (`bp §F1`) | REPLACE stubs; FIX promotion discipline | All 18 (cache invalidation correctness) |
| Probe contract | `probeFps` returns synthetic `FALLBACK_FPS = 30` when rVFC missing / autoplay blocked / timeout; server gate `fps_true >= 24` admits the synthetic value (`audit S9`; `probeVideoMetadata.ts:24-26, 33-39, 51-53, 66-68`; `analyze-video/index.ts:1749, 1776-1778`) | No synthetic fallback. If `fps_true` cannot be measured deterministically, every fps-dependent metric emits `missing` with `insufficient_temporal_resolution` (`bp §G2`, `arch P0 missingness enum`) | FIX `probeVideoMetadata.ts` to drop fallback; FIX server gate to require probed `fps_true`; add missingness emission | 12 `time_to_contact`, 13 `bat_speed_contact`, 9 `sequencing` (peak-velocity ordering), 14 `back_elbow_contact`, all velocity-derived hybrids |
| AI residual envelope | AI is sole producer of every numeric tile (`audit S2`); `temperature:0, top_p:0, seed: stableSeed(videoId)` (`audit S5`; `:2012-2016`); no bound on output magnitude | AI runs only as bounded residual ±10 around the deterministic value; `temperature 0`; seed = `stableSeed(canonical_trace_fingerprint)`; clipped server-side (`bp §D20`) | REPLACE AI surface (producer → residual); BUILD residual clamp | All hybrid metrics |
| Replay equivalence harness | None present in audit (`audit S2`, `S5`; AI-gateway determinism for `gemini-2.5-flash` `undetermined`) | `ReplayHarness` runs canonical_trace_fingerprint → metrics twice; bit-identity required for deterministic metrics; ±0 tolerance for engine, ±0 for hybrid AI residual under seeded gateway (`bp §F5`, `§H5`) | BUILD harness; BUILD gateway determinism verification | All 18 |
| Tool-call failure path | Parse error → silent defaults (`efficiency_score = 75`, `feedback = "No feedback available"`); no-tool-call fallback uses `/\d+\/100/` text scan; `metrics = null` allowed with `status:"completed"` (`audit S8`; `:2237-2247, 2406-2423, 2464-2490`) | Hybrid residual failure → tile emits `missing` with explicit reason; engine never substitutes defaults; analyses with missing engine output do not write `status:"completed"` (`bp §D20`, `§E1`, `arch P0 missingness enum`) | FIX failure paths to emit `missing`; REMOVE silent defaults | All 18 |

---

## Section D — Report Card Gap Matrix

| Surface | Current behavior | Canonical behavior | Gap | Affected |
|---|---|---|---|---|
| Phase % | `passRate = passed / measured`, missing excluded from denominator (`audit S1`; `HammerReportCard.tsx:56-76`, `PhaseRail.tsx:62,67`) | Identical formula; preserved as canonical (`bp §E2`) | RETAIN | All phases |
| Phase orb central numeric | Renders total tile `count` (includes missing), while % renders measured-only — two denominators in one orb (`audit S1`, `extract §2`; `PhaseRail.tsx:88` vs `HammerReportCard.tsx:62`) | Single denominator surfaced; orb displays `measured / total` coverage and `passRate` % in a non-ambiguous mapping (`bp §E2`) | FIX dual-denominator presentation | All 4 phase orbs |
| Missingness surfacing | All missing tiles coerced to `missing_reason: "single_pass_only"` regardless of true cause (`audit S8`; `:2258-2273`) | Tile emits one of the canonical missingness enum values: `insufficient_temporal_resolution`, `out_of_frame`, `landmark_occluded`, `anchor_not_detected`, `calibration_unavailable`, `detector_unavailable`, `low_confidence`, plus a free-text human-readable cause (`arch P0 missingness enum`, `bp §E1`) | REPLACE `single_pass_only` umbrella; BUILD per-cause routing from engine | All 18 |
| Confidence surfacing | Coerced missing tiles report `confidence: 0`; non-missing tiles have no confidence path described in audit (`audit S2`, `S8`) | Every tile exposes confidence ∈ [0, 1] derived from `visibility × temporal_certainty × stability × calibration_factor` (`arch P0 confidence model`, `bp §E1`) | BUILD confidence propagation end-to-end | All 18 |
| Tile-state thresholds | `< acceptable*0.7` → `fail`; `[acceptable*0.7, acceptable)` → `warn`; `[acceptable, elite)` → `pass`; `≥ elite` → `elite` (`audit S1`; `metricReaders.ts:65-77`) | Identical mapping retained; confidence-aware downgrade when `confidence < confidence_floor` (`bp §E1`) | FIX mapper to consult confidence; otherwise RETAIN thresholds | All score-meter tiles |
| Ribbon coverage | `FoilGradeCard` receives `measured`, `total`, `eliteCount`, `nonNegotiableFailed` (`audit S1`; `HammerReportCard.tsx:48-53,100-106`) | Same fields; `nonNegotiableFailed` must reflect canonical non-negotiable list and must respect missingness (`bp §E3`) | RETAIN data plumbing; FIX non-negotiable computation to exclude missing | Ribbon |
| AI coaching layer | AI produces metric values directly (`audit S2`) | AI coaching is presentation-only consumer of deterministic engine output; never authors tile values (`bp §E4`) | REPLACE AI role from producer → presenter | All 18 |
| Completed-with-null | Videos row written `status:"completed"` even when `metrics` is null/empty (`audit S8`; `:2464-2490`) | Engine output is the gate; rows with no engine output do not reach `completed` (`bp §A storage seams`, `§D0`) | FIX completion gate | All 18 |

---

## Section E — Production Readiness Matrix

Buckets follow audit S11 Final Block / `extract §9`. "Outstanding gates"
references the 10-gate matrix in `bp §I`: detector, anchor, frame-density,
calibration, missingness, confidence, determinism, golden clips,
tile-state mapper, replay.

### Bucket A — Production-ready or near (T3/T4)
- Empty. No BH metric ships at T3 or T4 today (`audit S11 A`; `extract §9 A`).

### Bucket B — Deterministic foundation present but uncalibrated (T2 → T3)
- Empty. The audit found no T2 metrics; every metric is T1 (`audit S11`).

### Bucket C — Stub-class; new detectors/anchors required (T1 → T2/T3)
All twelve subjective-composite metrics from `audit S11 C` plus the two
Bucket-B metrics from `audit S11 B` (B is "requires redesign" in audit
terms — i.e. canonical work load equal to or greater than C; placed here
because the gating work is the same shape: build detector + anchor +
calibration).

| Metric | Outstanding gates (from `bp §I`) | What must happen to move up one bucket |
|---|---|---|
| `hip_load` | detector, anchor, confidence, determinism, golden, mapper, replay | Build D-POSE; bind landing + launch anchors; ship geometry engine; replace AI producer with residual |
| `hand_load` | detector (×2), anchor, confidence, determinism, golden, mapper, replay | Build D-POSE + D-HANDS; bind hand-load-peak anchor; ship engine; replace producer |
| `eyes_tracking` | detector, anchor, confidence, determinism, golden, mapper, replay | Build D-POSE head-orientation engine; replace producer |
| `stride_direction` | detector, anchor, calibration, confidence, determinism, golden, mapper, replay | Build D-POSE; bind landing anchor; provide plate-line reference; ship engine |
| `heel_plant` | detector (×2), anchor, confidence, determinism, golden, mapper, replay | Build D-POSE + D-PLANT; ship engine |
| `bat_path` | detector (×2), anchor, calibration, confidence, determinism, golden, mapper, replay | Build D-POSE + D-BAT; reconstruct strike zone; ship engine |
| `on_plane` | detector (×2), anchor, calibration, confidence, determinism, golden, mapper, replay | Build D-POSE + D-BAT; fit swing-plane prior; ship engine |
| `back_elbow_contact` | detector (×2), anchor, confidence, determinism, golden, mapper, replay | Build D-POSE + D-BAT; ship elbow + barrel-delivery engine |
| `hitters_move` | detector, anchor, confidence, determinism, golden, mapper, replay | Build D-POSE COM-trajectory engine |
| `shoulder_plane_steadiness` | detector, anchor, confidence, determinism, golden, mapper, replay | Build D-POSE shoulder-variance engine |
| `finish_balance` | detector, anchor, confidence, determinism, golden, mapper, replay | Build D-POSE post-contact engine |
| `shoulder_to_shoulder_hold` | detector, anchor, confidence, determinism, golden, mapper, replay | Build D-POSE chin/shoulder tracker |
| `time_to_contact` ★ | detector (×3), anchor (×2), frame-density T-high, missingness, confidence, determinism, golden, mapper, replay | Build D-POSE + D-BAT + D-CONTACT; bind swing-start + contact anchors; enforce T-high probe gate; replace AI producer |
| `bat_speed_contact` ★ | detector (×2), anchor, calibration, frame-density T-high, missingness, confidence, determinism, golden, mapper, replay | Build D-POSE + D-BAT; enforce bat-length prior server-side with uncertainty; build pixel-scaler; T-high gate; replace producer |

### Bucket D — Cannot ship as currently measured; surface must be hidden until canonical path lands (T0/T1)
Four event-anchored metrics dependent on anchors the AI is asked to
locate in a 7-frame budget (`audit S11 D`).

| Metric | Outstanding gates | What must happen to move up |
|---|---|---|
| `p2_timing` ★ | detector (D-RELEASE, D-HANDS), anchor (×2), missingness, confidence, determinism, golden, mapper, replay | Hide tile until D-RELEASE + D-HANDS anchors land; then build offset engine |
| `p3_timing` ★ | detector (D-RELEASE, D-PLANT), anchor (×2), missingness, confidence, determinism, golden, mapper, replay | Hide tile until D-RELEASE + D-PLANT anchors land; then build offset engine per `.lovable/p3-timing-methodology.md` |
| `hands_outside_shoulders_at_landing` ★ | detector (D-POSE), anchor (landing), missingness, confidence, determinism, golden, mapper, replay | Hide tile until landing anchor is deterministic; then build single-frame geometry |
| `sequencing` | detector (D-POSE, D-BAT), anchor (×6), missingness, confidence, determinism, golden, mapper, replay | Hide tile until D-BAT + segment-peak anchors land; then build ordering engine |

---

## Section F — Master Build Inventory

Single deduplicated inventory across Sections A–E. Categories for
readability only — no priority, no sequencing, no owner, no estimate.

### Detectors to build
- D-POSE (Blazepose Full) wired to worker runtime, replacing the
  `@0.0.0-stub` constant.
- D-HANDS (MediaPipe Hands) wired to worker runtime.
- D-BAT (custom barrel-keypoint CNN) wired to worker runtime.
- D-CONTACT (contact-frame detector) wired to worker runtime.
- D-RELEASE (pitcher release-event detector) wired to worker runtime.
- D-PLANT (front-foot plant detector) wired to worker runtime.
- D-BALL (pitched-ball tracker) wired to worker runtime — uplift only,
  not blocking for any tile.

### Event anchors to build
- `swing_start_frame`
- `contact_frame`
- `pitcher_release_frame`
- `pitcher_knee_lift_frame`
- `front_foot_plant_frame`
- `heel_contact_frame`
- `stride_landing_frame`
- `hand_load_peak_frame`
- `load_peak_frame`
- `launch_frame`
- `finish_frame`
- Four kinetic-chain peak-velocity anchors used by `sequencing`
  (hips, torso, hands, barrel).

Each anchor must emit `{frame_index, t_ms, confidence, source_detector,
contributing_signals[]}` per `bp §C`.

### Calibration subsystems to build
- Bat-length prior with uncertainty propagation, enforced server-side
  (replaces prompt-only 33 in default).
- Pixel-to-inch scaler driven by bat-length prior + `calibration_h_px`
  (or homography fallback).
- Strike-zone reconstruction from posture height + `calibration_h_px`.
- Swing-plane prior fit from D-POSE.
- Plate-line reference for stride-direction degrees.

### Determinism seams to fix
- Replace `seed = stableSeed(videoId)` with
  `seed = stableSeed(canonical_trace_fingerprint)`.
- Replace cache lookup `.eq("video_id", videoId)` with
  `.eq("video_sha256_hex", …)` + `.eq("cache_fingerprint_hex", …)`.
- Replace `@0.0.0-stub` engine-version constants with real pinned
  artifacts in both `src/lib/biomech/versions.ts` and the edge mirror
  `supabase/functions/_shared/biomechFingerprint.ts`.
- Remove synthetic `FALLBACK_FPS = 30` from `probeVideoMetadata.ts` and
  the server gate's tolerance of it.
- Add AI residual envelope: clip to ±10 around deterministic value,
  `temperature 0`, seed = `canonical_trace_fingerprint`.
- Remove silent-default fall-throughs in `analyze-video/index.ts`
  (`efficiency_score = 75`, `feedback = "No feedback available"`,
  `/\d+\/100/` text scan).
- Gate `videos.status = "completed"` on engine output presence, not
  AI-payload presence.

### Missingness and confidence surfaces
- Per-cause missingness routing replacing the
  `missing_reason: "single_pass_only"` umbrella, using the canonical
  enum (`insufficient_temporal_resolution`, `out_of_frame`,
  `landmark_occluded`, `anchor_not_detected`, `calibration_unavailable`,
  `detector_unavailable`, `low_confidence`).
- Per-tile confidence value in `[0, 1]` derived from
  `visibility × temporal_certainty × stability × calibration_factor`.
- Confidence-aware downgrade in `TileStateMapper`.

### Report-card contract changes
- Single-denominator phase orb presentation (resolve dual-denominator
  bug where orb central number uses total but % uses measured).
- Non-negotiable computation that excludes missing tiles.
- AI coaching layer demoted from producer to presentation-only
  consumer of deterministic engine output.

### Validation harnesses to build
- `DeterminismHarness` — re-run canonical trace twice; assert byte-equal
  metric output for deterministic metrics.
- `GoldenClipSuite` — per-metric pass-rate floors per `bp §H2`.
- `ConfidenceCalibrationHarness` — calibration curve per `bp §H3`.
- `MissingnessAudit` — every emitted missingness reason traces to a
  canonical enum value.
- `ReplayHarness` — canonical_trace_fingerprint round-trip
  reproducibility per `bp §H5`.
- Production-rollout gate (10-gate matrix) per `bp §I`, blocking
  promotion of any metric that fails any gate.
- AI-gateway determinism verification for `google/gemini-2.5-flash`
  under `temperature 0` + seed (currently `undetermined` per `audit S5`).

### Surfaces to hide until canonical path exists
- Tile rendering for `p2_timing`, `p3_timing`,
  `hands_outside_shoulders_at_landing`, `sequencing` (Bucket D).
- Numeric values for `time_to_contact` and `bat_speed_contact` on any
  capture below T-high (≥120 fps).
- Any tile whose required detector(s) from Section B are absent —
  presented as `missing` with the canonical `detector_unavailable`
  reason rather than rendered.

---

## Closing constraints

This document is inventory only. It does not order the work, prioritize
the work, estimate the work, or assign the work. It supersedes nothing
in the audit, extraction, measurement architecture, or implementation
blueprint; it consumes them. Subsequent phases will consume this matrix.

No code, schema, prompts, UI, roadmap, sequencing, owners, or estimates
were produced.
