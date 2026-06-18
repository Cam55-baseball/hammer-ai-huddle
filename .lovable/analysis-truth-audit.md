# Phase 1.75 — Analysis Truth Audit

Evidence-only. Every claim cites `path:line-range`. Any statement not
directly provable from code reads: `undetermined from code — evidence needed`.
No interpretation, no recommendations, no fixes.

---

## S1 — Report-card calculation logic (phase orbs, ribbon, grade)

- Phase orb `passRate` = `passed / measured`, where `passed` counts tiles whose
  status is `pass` or `elite`, and `measured` excludes `missing` tiles:
  `src/components/report-card/hammer/HammerReportCard.tsx:56-76`.
- Phase orb is rendered as `"—"` when `measured === 0`; otherwise
  `Math.round(passRate * 100) + "%"`: `src/components/report-card/hammer/visuals/PhaseRail.tsx:62,67`.
- Phase orb color tier thresholds: `pass` ≥ 0.85, `warn` ≥ 0.5, else `fail`;
  `missing` when `measured === 0`:
  `src/components/report-card/hammer/visuals/PhaseRail.tsx:47-55`.
- Orb numeric label shows total tile `count` (not measured count):
  `src/components/report-card/hammer/visuals/PhaseRail.tsx:88` reading
  `p.count` defined as `e.total += 1` in
  `src/components/report-card/hammer/HammerReportCard.tsx:62`.
- Ribbon coverage values fed to `FoilGradeCard`: `measured`, `total`,
  `eliteCount`, `nonNegotiableFailed`:
  `src/components/report-card/hammer/HammerReportCard.tsx:48-53,100-106`.
- Tile-level state mapping for 0–100 score meters:
  `score < acceptable*0.7` → `fail`; `[acceptable*0.7, acceptable)` → `warn`;
  `[acceptable, elite)` → `pass`; `≥ elite` → `elite`:
  `src/lib/reportCard/metricReaders.ts:65-77`.
- Letter grade (`gradeFromTiles`) used elsewhere: pass=100, warn=70, fail=0
  averaged over measured tiles; one non-negotiable fail caps score at 60,
  two-or-more at 40: `src/lib/reportCard/grade.ts:22-49`. Whether
  `HammerReportCard.tsx` calls `gradeFromTiles` — not invoked in
  `HammerReportCard.tsx:1-179` (ribbon shown without letter per
  comment on line 94: "no letter, no /100 score").

## S2 — Metric production sources (AI vs client compute)

- BH metric values are produced exclusively by the AI model via tool call
  `return_analysis.metrics`:
  `supabase/functions/analyze-video/index.ts:2237-2273`.
- Metrics block appended to the system prompt:
  `supabase/functions/analyze-video/index.ts:1891-1894`.
- Tile `compute(analysis)` reads only `analysis.metrics[key]` via
  `readNumber` / `readBool` / `readScore100`:
  `src/lib/reportCard/metricReaders.ts:5-47`.
- No client-side geometric/landmark computation feeds `metrics`. Search for
  pose/landmark consumers in tile compute path: `src/lib/reportCard/`
  contains no landmark detector imports — `src/lib/biomech/versions.ts:24-27`
  are stub strings (see S3). `undetermined from code — evidence needed`
  for any runtime landmark detector wired to tile compute.

## S3 — Engine / detector versions

- All three engine version constants are stub-pinned to `@0.0.0-stub`:
  - `LANDMARK_MODEL_VERSION = "blazepose_full@0.0.0-stub"`:
    `src/lib/biomech/versions.ts:25`.
  - `DETECTOR_VERSION = "events@0.0.0-stub"`: `src/lib/biomech/versions.ts:26`.
  - `METRIC_ENGINE_VERSION = "metrics@0.0.0-stub"`:
    `src/lib/biomech/versions.ts:27`.
- Edge-function mirror, byte-identical strings:
  `supabase/functions/_shared/biomechFingerprint.ts:10-13`.
- Versions are written into `ai_analysis` and every analysis-run audit row:
  `supabase/functions/analyze-video/index.ts:2456-2458, 2482-2484`.

## S4 — Cache fingerprinting + scoping

- Cache fingerprint inputs: `video_sha256_hex || landmark || detector ||
  metric_engine || fps_true(.toFixed(6)) || landing_time_sec_or_null ||
  direction_sign || calibration_h_px(.toFixed(6))`:
  `src/lib/biomech/fingerprint.ts:101-128`.
- Server build matches: `supabase/functions/_shared/biomechFingerprint.ts:53-67`.
- Cache lookup is keyed by **both** `video_id` AND `cache_fingerprint_hex` and
  requires `outcome = "ok"` plus `videos.status = "completed"`:
  `supabase/functions/analyze-video/index.ts:1807-1816`.
- Cached AI payload is read from `videos.ai_analysis` (not from the run row):
  `supabase/functions/analyze-video/index.ts:1815-1836`.
- Consequence (from code): a re-upload of the same byte stream produces a
  new `videos.id` (UUID column referenced as `videoId`), and the
  `.eq("video_id", videoId)` filter at
  `supabase/functions/analyze-video/index.ts:1810` will not match the
  prior video's run row. `undetermined from code — evidence needed` for
  the exact insert path that issues a new `videos.id` on re-upload.
- Prompt text, athlete context, and AI model id are explicitly excluded
  from the fingerprint by contract: `src/lib/biomech/fingerprint.ts:19-22`,
  `supabase/functions/_shared/biomechFingerprint.ts:6-8`.

## S5 — Seed derivation + same-video nondeterminism sources

- AI request seed = `stableSeed(videoId)` (FNV-1a over the UUID string):
  `supabase/functions/analyze-video/index.ts:44-56, 2016`.
- Two uploads of the same byte stream → different `videoId` UUIDs →
  different `seed`: derivable from
  `supabase/functions/analyze-video/index.ts:48-56, 2016` combined with
  the cache-key scoping in S4.
- Model call uses `temperature: 0, top_p: 0, seed: stableSeed(videoId)`:
  `supabase/functions/analyze-video/index.ts:2012-2016`.
- Retry wrapper sends identical body on every attempt:
  `supabase/functions/analyze-video/index.ts:65-89`.
- Frame extraction is integer-deterministic given `fps_true`,
  `duration_sec`, `landingTime`:
  `src/lib/biomech/frameExtractionDeterministic.ts:37-72`.
- FPS probe snaps to standard rates within ±0.5 fps to stabilize the
  fingerprint: `src/lib/biomech/probeVideoMetadata.ts:72-91`.
- Determinism guarantee under code: identical `(video_id, fingerprint
  inputs, engine versions, prompt, frame extractions)` ⇒ identical seed,
  identical request body, identical cache hit. **The
  `seed = stableSeed(videoId)` choice is the dominant same-video
  nondeterminism source for re-uploads** (derivable from above).
- Whether the AI gateway honors `temperature:0`/`seed` deterministically
  for `google/gemini-2.5-flash`: `undetermined from code — evidence needed`.

## S6 — Calibration assumptions (bat length, pixel scaling)

- Bat-speed calibration assumes a default bat length of 33 inches when
  unknown, stated only in the AI prompt text (not enforced server-side):
  `supabase/functions/_shared/reportCardContracts.ts:301`.
- `calibration_h_px` is read from `videos.calibration_h_px` and enters
  the fingerprint only; no code consumes it for unit conversion in the
  analyzer:
  `supabase/functions/analyze-video/index.ts:1691, 1706, 1798`;
  `src/lib/biomech/fingerprint.ts:101-128`.
- No pixel-to-inch or pixel-to-meter scaler exists in the analyzer path
  reviewed. `undetermined from code — evidence needed` for any other
  pixel-scaling module.

## S7 — Sampling budget / frame extraction

- Auto-mode sample budget: 7 frames at fixed percentages
  `[0.10, 0.25, 0.40, 0.50, 0.60, 0.75, 0.90]`:
  `src/lib/biomech/frameExtractionDeterministic.ts:18`.
- Landing-anchored mode: 7 offsets in seconds
  `[-0.4, -0.2, -0.1, 0, 0.1, 0.2, 0.3]`:
  `src/lib/biomech/frameExtractionDeterministic.ts:19`.
- Duplicates clamped & dedup'd before sort:
  `src/lib/biomech/frameExtractionDeterministic.ts:61-71`.
- FPS probe sample budget: 60 frames or 8 s hard ceiling:
  `src/lib/biomech/probeVideoMetadata.ts:24-26`.
- Server requires `frames.length >= 3`:
  `supabase/functions/analyze-video/index.ts:33`.

## S8 — Failure paths (completed-with-null, fallbacks)

- Tool-call argument parsing wrapped in `try`; on parse error only logs
  and falls through with defaults already assigned upstream
  (`efficiency_score = 75`, `feedback = "No feedback available"`, etc.):
  `supabase/functions/analyze-video/index.ts:2237-2247, 2406-2408`.
- Fallback when **no tool calls** are returned: free-text scan only for
  `/\d+\/100/`; everything else stays at defaults:
  `supabase/functions/analyze-video/index.ts:2409-2417`.
- Empty/invalid `summary` regenerated from feedback/positives via
  `makeBeginnerBullets`: `supabase/functions/analyze-video/index.ts:2420-2423`.
- `metrics` set to `null` if absent from tool args:
  `supabase/functions/analyze-video/index.ts:2237, 2248-2251, 2446`.
- Tiles the AI does not return are coerced to
  `{ missing: true, missing_reason: "single_pass_only", confidence: 0 }`:
  `supabase/functions/analyze-video/index.ts:2258-2273`.
- Videos row is written with `status: "completed"` regardless of whether
  `metrics` is null or empty — only `videos.update` failure aborts:
  `supabase/functions/analyze-video/index.ts:2464-2490`.
- Pre-analysis rejects (write audit row, return 422) for missing
  `sha256_hex`, missing probe metadata, or Phase-1 acceptance failures:
  `supabase/functions/analyze-video/index.ts:1710-1791`.

## S9 — Desktop / browser failure paths

- `probeFps` returns `FALLBACK_FPS = 30` when
  `requestVideoFrameCallback` is missing on the `<video>` element:
  `src/lib/biomech/probeVideoMetadata.ts:26, 33-39`.
- 8-second probe timeout falls back to whatever rVFC samples were
  collected, otherwise 30 fps:
  `src/lib/biomech/probeVideoMetadata.ts:25, 51-53`.
- Autoplay-blocked path: `videoEl.play()` rejection is swallowed; probe
  relies on the timeout fallback:
  `src/lib/biomech/probeVideoMetadata.ts:66-68`.
- Metadata-load failure rejects the probe Promise with
  `"video metadata load failed"`:
  `src/lib/biomech/probeVideoMetadata.ts:104-113`.
- Server hard-rejects when `fps_true < 24`:
  `supabase/functions/analyze-video/index.ts:1749, 1776-1778`. Combined
  with the 30 fps fallback above, browsers without rVFC pass this gate
  with a synthetic 30 fps — `undetermined from code — evidence needed`
  whether downstream code distinguishes probed vs fallback FPS.
- Browser-specific codec/container support: `undetermined from code —
  evidence needed` (no codec gating found in the files reviewed).

## S10 — Per-metric evidence (18 BH tiles)

Sources: tile registry `src/lib/reportCard/disciplines/bh.ts:16-389`;
AI metric contracts `src/lib/reportCard/contracts/bh.contract.ts:7-217` and
`supabase/functions/_shared/reportCardContracts.ts:270-340`.
Production: AI tool-call only (S2). Engine versions: all stub (S3).

| # | Tile key | Phase | Non-neg? | Metric key(s) | Kind | Code-side compute? |
|---|---|---|---|---|---|---|
| 1 | `hip_load` | P1 | yes (`bh.ts:22`) | `hip_stability_score_100` (`bh.contract.ts:13-21`) | score 0–100 | none — AI estimate |
| 2 | `hand_load` | P2 | no | `hand_load_score_100` (`bh.contract.ts:23-32`) | score 0–100 | none — AI estimate |
| 3 | `p2_timing` | P2 | no | `p2_timing_pass` (`bh.contract.ts:33-40`) | boolean | none — AI estimate |
| 4 | `eyes_tracking` | P2 | no | `eyes_track_score_100` (`bh.contract.ts:41-50`) | score 0–100 | none — AI estimate |
| 5 | `stride_direction` | P3 | no | `stride_dir_deg_off_square` (`bh.contract.ts:52-61`) | degrees | none — AI estimate |
| 6 | `heel_plant` | P3 | no | `heel_plant_score_100` (`bh.contract.ts:62-71`) | score 0–100 | none — AI estimate |
| 7 | `p3_timing` | P3 | no | `p3_release_offset_ms` (`bh.contract.ts:72-81`) | ms | none — AI estimate |
| 8 | `hands_outside_shoulders_at_landing` | P3 | no | `hands_outside_shoulders_at_landing_pass` (`bh.contract.ts:82-89`) | boolean | none — AI estimate |
| 9 | `sequencing` | P4 | yes (`bh.ts:197`) | `sequencing_ok` (`bh.contract.ts:92-99`) | boolean | none — AI estimate |
| 10 | `bat_path` | P4 | no | `bat_path_score_100` (`bh.contract.ts:100-109`) | score 0–100 | none — AI estimate |
| 11 | `on_plane` | P4 | no | `on_plane_pct` (`bh.contract.ts:110-119`) | percent | none — AI estimate |
| 12 | `time_to_contact` | P4 | no | `time_to_contact_ms` (`bh.contract.ts:120-129`; server prompt `reportCardContracts.ts:283-292`) | ms | none — AI estimate from 7-frame budget (S7); fps from probe |
| 13 | `bat_speed_contact` | P4 | no | `bat_speed_contact_mph` (`bh.contract.ts:130-139`; server prompt `reportCardContracts.ts:293-302`) | mph | none — AI estimate; default 33 in bat length assumed in prompt only (S6) |
| 14 | `back_elbow_contact` | P4 | no | `connection_barrel_delivery_score_100` (`bh.contract.ts:140-149`) | score 0–100 | none — AI estimate |
| 15 | `hitters_move` | P4 | yes (`bh.ts:329`) | `hitters_move_score_100` (`bh.contract.ts:150-159`) | score 0–100 | none — AI estimate |
| 16 | `shoulder_plane_steadiness` | P4 | no | `shoulder_plane_steadiness_score_100` (`bh.contract.ts:160-169`) | score 0–100 | none — AI estimate |
| 17 | `finish_balance` | P4 | no | `finish_balance_score_100` (`bh.contract.ts:170-179`) | score 0–100 | none — AI estimate |
| 18 | `shoulder_to_shoulder_hold` | P4 | yes (`bh.ts:389`) | `shoulder_to_shoulder_hold_pct_to_contact` + `_pass` + `front_shoulder_leak_before_contact` + `_pct_of_window` (`bh.contract.ts:180-215`) | percent + booleans | none — AI estimate |

## S11 — Per-metric trust classification

Classification is derived strictly from the code-side evidence assembled
above. The shared facts apply to every BH metric:

- Producer: AI tool-call only (S2).
- Engine versions: all `@0.0.0-stub` (S3).
- Sample budget: 7 frames per clip (S7).
- Calibration: no code-side pixel scaling; bat length is a prompt
  default (S6).
- Determinism under same `videoId` and pinned engine: deterministic by
  construction (S4, S5); under re-upload (new `videoId`): seed changes
  and cache misses (S4, S5).

Per metric:

- `hip_load` — **EXPERIMENTAL.** Subjective score, no code-side detector
  (S2, S10 #1).
- `hand_load` — **EXPERIMENTAL.** Same as above (S10 #2).
- `p2_timing` — **EXPERIMENTAL.** Boolean anchored to a pitcher event
  the AI must locate from ≤7 frames (S7, S10 #3); explicit `missing`
  path defined in prompt (`bh.contract.ts:39`).
- `eyes_tracking` — **EXPERIMENTAL.** Subjective score, no head-tracking
  in code (S10 #4).
- `stride_direction` — **EXPERIMENTAL.** Degree estimate without
  client-side pose math (S10 #5).
- `heel_plant` — **EXPERIMENTAL.** Subjective composite score (S10 #6).
- `p3_timing` — **EXPERIMENTAL.** Anchored to pitcher release frame the
  AI must locate from ≤7 frames (S7, S10 #7).
- `hands_outside_shoulders_at_landing` — **EXPERIMENTAL.** Single-frame
  boolean AI estimate (S10 #8).
- `sequencing` — **EXPERIMENTAL.** Whole-swing boolean estimate (S10 #9).
- `bat_path` — **EXPERIMENTAL.** Subjective score, no bat detector
  (S10 #10).
- `on_plane` — **EXPERIMENTAL.** Requires per-frame plane geometry not
  present in code (S10 #11).
- `time_to_contact` — **NOT READY FOR USERS.** Requires frame-accurate
  swing-start and contact anchors; available budget is 7 frames per
  clip (S7); resolution at 30 fps ≈ 33 ms (S9 fallback), at 60 fps ≈
  16 ms; no client-side anchor detection (S10 #12).
- `bat_speed_contact` — **NOT READY FOR USERS.** Depends on 2-frame
  barrel-tip tracking plus a default 33 in calibration declared only in
  the prompt (S6); no bat detector in code (S10 #13).
- `back_elbow_contact` (`connection_barrel_delivery_score_100`) —
  **EXPERIMENTAL.** Subjective composite over a multi-anchor window
  (S10 #14).
- `hitters_move` — **EXPERIMENTAL.** Subjective composite (S10 #15).
- `shoulder_plane_steadiness` — **EXPERIMENTAL.** Requires per-frame
  shoulder-line geometry not present in code (S10 #16).
- `finish_balance` — **EXPERIMENTAL.** Subjective score (S10 #17).
- `shoulder_to_shoulder_hold` — **EXPERIMENTAL.** Requires per-frame
  hand-cluster and back-shoulder tracking across landing→contact
  window; no client-side tracker (S10 #18).

“TRUSTWORTHY” and “PARTIALLY TRUSTWORTHY” require code-side
deterministic measurement or independently calibrated sensor inputs.
No such code path was found in the files reviewed; therefore no metric
is classified TRUSTWORTHY or PARTIALLY TRUSTWORTHY here.

---

## Final block — A / B / C / D classification (derived strictly from S11)

**A. Safe for production today.**
- None.

**B. Requiring redesign (require detectors/calibration before they can
be trustworthy).**
- `time_to_contact` (S10 #12, S11).
- `bat_speed_contact` (S6, S10 #13, S11).

**C. Requiring investigation (subjective composites; need code-side
geometry or human-labeled ground truth before classification can change).**
- `hip_load`, `hand_load`, `eyes_tracking`, `heel_plant`,
  `stride_direction`, `bat_path`, `on_plane`, `back_elbow_contact`
  (`connection_barrel_delivery_score_100`), `hitters_move`,
  `shoulder_plane_steadiness`, `finish_balance`,
  `shoulder_to_shoulder_hold` (S10 #1–6, 10, 11, 14–18; S11).

**D. Hide until trustworthy (event-anchored booleans/offsets that depend
on locating anchor frames inside a 7-frame budget).**
- `p2_timing`, `p3_timing`, `hands_outside_shoulders_at_landing`,
  `sequencing` (S7, S10 #3, 7, 8, 9; S11).
