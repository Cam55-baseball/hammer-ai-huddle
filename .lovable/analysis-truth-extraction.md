# Phase 2 — Analysis Truth Audit Extraction

Read-only extraction of `.lovable/analysis-truth-audit.md`. All citations
refer to that audit's sections (S1–S11) and the `path:line-range` already
captured there. No new code reads, no new investigation, no fixes.

---

## 1. Executive Summary

### Top 10 Findings

1. All 18 BH metrics are produced exclusively by the AI model via the
   `return_analysis.metrics` tool call; no client-side geometric or
   landmark computation feeds the tiles (S2; `analyze-video/index.ts:2237-2273`,
   `metricReaders.ts:5-47`).
2. All three engine-version constants are `@0.0.0-stub`
   (`LANDMARK_MODEL_VERSION`, `DETECTOR_VERSION`, `METRIC_ENGINE_VERSION`)
   (S3; `versions.ts:25-27`, `biomechFingerprint.ts:10-13`).
3. Phase orb `passRate = passed / measured`, excluding `missing` tiles;
   rendered `"—"` when `measured === 0`, else `Math.round(passRate*100)+"%"`
   (S1; `HammerReportCard.tsx:56-76`, `PhaseRail.tsx:47-67`).
4. The numeric label inside each phase orb shows total tile `count`, not
   the measured count (S1; `PhaseRail.tsx:88`, `HammerReportCard.tsx:62`).
5. AI seed = `stableSeed(videoId)` (FNV-1a over UUID); two uploads of the
   same byte stream yield different `videoId` → different seed
   (S5; `analyze-video/index.ts:44-56, 2016`).
6. Cache lookup keyed on `(video_id, cache_fingerprint_hex)` with
   `outcome="ok"` AND `videos.status="completed"`; a re-upload's new
   `videos.id` cannot match a prior video's run row (S4;
   `analyze-video/index.ts:1807-1816`).
7. Bat-speed calibration is a default 33 in bat length stated only in
   the AI prompt; no server-side enforcement and no pixel-to-inch scaler
   exists in the analyzer path (S6; `reportCardContracts.ts:301`).
8. Sampling budget for analysis is 7 frames per clip (auto or
   landing-anchored) (S7; `frameExtractionDeterministic.ts:18-19`).
9. Videos rows are written with `status:"completed"` even when `metrics`
   is null or empty; only a `videos.update` failure aborts
   (S8; `analyze-video/index.ts:2464-2490`).
10. Desktop `probeFps` falls back to a synthetic 30 fps when
    `requestVideoFrameCallback` is absent or times out at 8 s, which
    silently passes the server's `fps_true >= 24` gate
    (S9; `probeVideoMetadata.ts:24-26, 33-39, 51-53`;
    `analyze-video/index.ts:1749, 1776-1778`).

### Top 10 Risks

1. No metric is classified TRUSTWORTHY or PARTIALLY TRUSTWORTHY; none
   pass to bucket A (S11; Final block).
2. `time_to_contact` and `bat_speed_contact` require redesign — anchor
   detection and calibration absent in code (S11 B; S10 #12–13).
3. Four event-anchored metrics depend on the AI locating anchor frames
   within ≤7 frames: `p2_timing`, `p3_timing`,
   `hands_outside_shoulders_at_landing`, `sequencing` (S11 D; S7).
4. Twelve subjective composites have no code-side geometry to validate
   against (S11 C).
5. Re-upload nondeterminism: identical bytes produce different seeds,
   different cache outcomes, potentially different results (S4, S5).
6. Engine version constants are stubs; any cache invalidation discipline
   keyed on them is unenforced semantically (S3).
7. AI gateway determinism for `temperature:0`/`seed` on
   `google/gemini-2.5-flash` is `undetermined from code — evidence
   needed` (S5).
8. Tool-call parse errors fall through to defaults
   (`efficiency_score = 75`, `feedback = "No feedback available"`)
   without surfacing failure (S8; `analyze-video/index.ts:2237-2247,
   2406-2408`).
9. When no tool calls return, only a free-text `/\d+\/100/` scan runs;
   the rest stays at defaults (S8; `analyze-video/index.ts:2409-2417`).
10. Desktop fallback FPS of 30 is indistinguishable downstream from a
    truly probed 30 fps (S9; `undetermined from code — evidence needed`).

### Top 10 User-Facing Failures

1. Phase orb shows total-tile count as the orb number while percentage
   below is over measured tiles only — two different denominators in one
   orb (S1; `PhaseRail.tsx:88` vs `:62,67`).
2. Re-uploading the same video can yield different scores/tiles because
   the seed changes with `videoId` (S5).
3. `time_to_contact` is exposed to users but lacks frame-accurate anchor
   detection; 30 fps fallback yields ≈33 ms resolution (S11 B, S9).
4. `bat_speed_contact` is exposed to users with a 33-in prompt-only
   calibration and no bat detector (S11 B, S6).
5. Tiles the AI does not return appear as
   `missing_reason: "single_pass_only"` with no remediation path
   (S8; `analyze-video/index.ts:2258-2273`).
6. Analyses can complete with `metrics = null` and `status = "completed"`
   (S8).
7. Empty summary is auto-regenerated from feedback bullets, masking
   model failure (S8; `analyze-video/index.ts:2420-2423`).
8. Desktop browsers without `requestVideoFrameCallback` silently pass
   the FPS gate at synthetic 30 fps (S9).
9. Autoplay-blocked probes have their `play()` rejection swallowed and
   rely on timeout fallback (S9; `probeVideoMetadata.ts:66-68`).
10. Phase 1–4 orbs display `"—"` only when `measured === 0`; partial
    measurement (e.g., 1 of 5) produces a pass-rate that visually reads
    as score (S1).

---

## 2. Report Card Accuracy Findings

**What the Phase 1–4 percentages represent (S1).** The percentage shown
beneath each orb is `passRate * 100`, where `passRate = passed / measured`
and `passed` counts tiles with status `pass` or `elite`; `missing` tiles
are excluded from the denominator
(`HammerReportCard.tsx:56-76`, `PhaseRail.tsx:62,67`).

**They are pass-rate of measured tiles**, not confidence, not completion,
not a score average. The orb's central numeric label is a separate value:
the **total** tile count for the phase (including missing), set as
`e.total += 1` (`HammerReportCard.tsx:62`, rendered at
`PhaseRail.tsx:88`).

**Can they reach 100%?** Yes — when every measured tile in the phase has
status `pass` or `elite`, `passRate = 1.0` and the label renders `"100%"`.
Missing tiles do not block 100%; they are excluded
(S1; `HammerReportCard.tsx:56-76`).

**Exact calculation path (S1).**
1. Per tile, `metricReaders.ts:65-77` maps a 0–100 score to status:
   `< acceptable*0.7` → `fail`; `[acceptable*0.7, acceptable)` → `warn`;
   `[acceptable, elite)` → `pass`; `≥ elite` → `elite`.
2. `HammerReportCard.tsx:56-76` tallies per-phase `passed`, `measured`,
   `total`.
3. `PhaseRail.tsx:47-67` colors the orb by `passRate` threshold
   (`pass ≥ 0.85`, `warn ≥ 0.5`, else `fail`; `missing` when
   `measured === 0`) and renders `"—"` or `Math.round(passRate*100)+"%"`.
4. Letter-grade path via `gradeFromTiles` (`grade.ts:22-49`) is **not
   invoked** in `HammerReportCard.tsx`; the ribbon shows coverage
   without a letter (S1; comment at `HammerReportCard.tsx:94`).

---

## 3. Metric Reliability Findings (all 18 BH metrics)

Shared facts (S2, S3, S6, S7): producer = AI tool-call only; engine
versions = `@0.0.0-stub`; calibration = prompt-only 33-in default;
sample budget = 7 frames per clip. "Deterministic?" reflects same
`videoId` + pinned inputs (yes by construction per S4/S5); re-upload
determinism is **no** for every metric because seed = `stableSeed(videoId)`.

| # | Metric | Trust (S11) | Source | Same-`videoId` det. | Re-upload det. | AI or computed | Prod-ready |
|---|---|---|---|---|---|---|---|
| 1 | `hip_load` | EXPERIMENTAL (C) | AI | yes | no | AI | no |
| 2 | `hand_load` | EXPERIMENTAL (C) | AI | yes | no | AI | no |
| 3 | `p2_timing` | EXPERIMENTAL (D) | AI | yes | no | AI | no |
| 4 | `eyes_tracking` | EXPERIMENTAL (C) | AI | yes | no | AI | no |
| 5 | `stride_direction` | EXPERIMENTAL (C) | AI | yes | no | AI | no |
| 6 | `heel_plant` | EXPERIMENTAL (C) | AI | yes | no | AI | no |
| 7 | `p3_timing` | EXPERIMENTAL (D) | AI | yes | no | AI | no |
| 8 | `hands_outside_shoulders_at_landing` | EXPERIMENTAL (D) | AI | yes | no | AI | no |
| 9 | `sequencing` | EXPERIMENTAL (D) | AI | yes | no | AI | no |
| 10 | `bat_path` | EXPERIMENTAL (C) | AI | yes | no | AI | no |
| 11 | `on_plane` | EXPERIMENTAL (C) | AI | yes | no | AI | no |
| 12 | `time_to_contact` | NOT READY (B) | AI | yes | no | AI | no |
| 13 | `bat_speed_contact` | NOT READY (B) | AI | yes | no | AI | no |
| 14 | `back_elbow_contact` | EXPERIMENTAL (C) | AI | yes | no | AI | no |
| 15 | `hitters_move` | EXPERIMENTAL (C) | AI | yes | no | AI | no |
| 16 | `shoulder_plane_steadiness` | EXPERIMENTAL (C) | AI | yes | no | AI | no |
| 17 | `finish_balance` | EXPERIMENTAL (C) | AI | yes | no | AI | no |
| 18 | `shoulder_to_shoulder_hold` | EXPERIMENTAL (C) | AI | yes | no | AI | no |

Cites: S2, S3, S4, S5, S6, S7, S10 #1–18, S11.

---

## 4. Bat Speed Investigation (`bat_speed_contact`)

- **Why values appear unreliable.** Produced by AI tool-call from a
  7-frame budget (S2, S7); no bat detector exists in code; bat length
  defaults to 33 in declared **only** in the AI prompt with no
  server-side enforcement and no pixel-to-inch scaler (S6;
  `reportCardContracts.ts:301`).
- **Root cause.** Two-frame barrel-tip displacement + assumed bat length
  with no calibrated pixel scale (S10 #13; S6).
- **Visibility per audit.** Classified **B — Requires redesign**
  (requires detectors/calibration before it can be trustworthy)
  (S11 B; Final block).

---

## 5. Time To Contact Investigation (`time_to_contact`)

- **Root cause.** Requires frame-accurate swing-start and contact
  anchors; the AI must locate them within a 7-frame sample budget
  (S7; S10 #12). Temporal resolution at 30 fps fallback ≈ 33 ms; at
  60 fps ≈ 16 ms (S9; S11).
- **Reliability assessment.** No client-side anchor detection; producer
  is AI tool-call only (S2, S10 #12).
- **Visibility per audit.** Classified **B — Requires redesign** (S11 B;
  Final block).

---

## 6. Missing Metric Investigation

All missing tiles are coerced to
`{ missing: true, missing_reason: "single_pass_only", confidence: 0 }`
when the AI does not return them (S8;
`analyze-video/index.ts:2258-2273`).

- **P2 Knee Lift (`p2_timing`).** Boolean anchored to a pitcher event
  the AI must locate from ≤7 frames; explicit `missing` path defined in
  the contract (S11; `bh.contract.ts:33-40, esp. :39`; S10 #3).
- **P3 Release (`p3_timing`).** Anchored to the pitcher release frame
  the AI must locate from ≤7 frames (S11; S10 #7;
  `bh.contract.ts:72-81`).
- **Hands Outside Shoulders (`hands_outside_shoulders_at_landing`).**
  Single-frame boolean AI estimate at landing; no client-side pose
  detection (S11; S10 #8; `bh.contract.ts:82-89`).

Detection-path failure (all three): no code-side detector for the anchor
event — pitcher release / batter landing — exists in the analyzer path
(S2, S10).

---

## 7. Same-Video Reanalysis Investigation

Ranked nondeterminism causes derived strictly from S4–S5:

1. **`seed = stableSeed(videoId)`.** New upload → new `videos.id` UUID →
   new seed → different sampling path inside the model (S5;
   `analyze-video/index.ts:44-56, 2016`). Identified by the audit as the
   **dominant** same-video nondeterminism source for re-uploads.
2. **Cache miss on re-upload.** Cache lookup is `.eq("video_id", videoId)`;
   a new `videos.id` cannot match a prior row, forcing re-inference even
   if `cache_fingerprint_hex` would match (S4;
   `analyze-video/index.ts:1807-1816`).
3. **AI gateway honoring of `temperature:0`/`seed` for
   `google/gemini-2.5-flash`.** `undetermined from code — evidence
   needed` (S5).
4. **FPS probe variability across captures.** Snapped to standard rates
   within ±0.5 fps; stable for the same file but can differ across
   re-encodes that change container/FPS (S5; `probeVideoMetadata.ts:72-91`).

Excluded as nondeterminism sources by code: prompt text, athlete
context, model id (excluded from fingerprint by contract — S4;
`fingerprint.ts:19-22`).

---

## 8. Desktop Failure Investigation

Exact failure points (S9, S8):

1. **Missing `requestVideoFrameCallback`.** `probeFps` returns synthetic
   `FALLBACK_FPS = 30` (`probeVideoMetadata.ts:26, 33-39`).
2. **Probe timeout.** 8 s ceiling; if no rVFC samples collected, falls
   back to 30 fps (`probeVideoMetadata.ts:25, 51-53`).
3. **Autoplay blocked.** `videoEl.play()` rejection swallowed; relies on
   timeout fallback (`probeVideoMetadata.ts:66-68`).
4. **Metadata load failure.** Probe Promise rejects with
   `"video metadata load failed"` (`probeVideoMetadata.ts:104-113`).
5. **Server FPS gate.** Hard-rejects when `fps_true < 24`
   (`analyze-video/index.ts:1749, 1776-1778`); a 30 fps synthetic
   fallback **passes** this gate, so downstream cannot distinguish probed
   vs fallback (S9; `undetermined from code — evidence needed`).
6. **Browser codec/container support.** `undetermined from code —
   evidence needed` (no codec gating found).
7. **Completed-with-null.** Even after probe and analysis paths, video
   rows are written `status:"completed"` regardless of `metrics` null
   state (S8; `analyze-video/index.ts:2464-2490`).

---

## 9. Production Readiness Matrix (from S11 Final Block)

**Bucket A — Safe to expose now.**
- None.

**Bucket B — Requires fixes (redesign: needs detectors/calibration).**
- `time_to_contact` (S10 #12, S11).
- `bat_speed_contact` (S6, S10 #13, S11).

**Bucket C — Requires redesign (subjective composites; need code-side
geometry or human-labeled ground truth).**
- `hip_load`, `hand_load`, `eyes_tracking`, `heel_plant`,
  `stride_direction`, `bat_path`, `on_plane`, `back_elbow_contact`
  (`connection_barrel_delivery_score_100`), `hitters_move`,
  `shoulder_plane_steadiness`, `finish_balance`,
  `shoulder_to_shoulder_hold` (S10 #1–6, 10, 11, 14–18; S11).

**Bucket D — Hide immediately (event-anchored within 7-frame budget).**
- `p2_timing`, `p3_timing`, `hands_outside_shoulders_at_landing`,
  `sequencing` (S7, S10 #3, 7, 8, 9; S11).

---

## 10. Fix Sequencing

Ranking is over the issues already present in the audit. Impact = breadth
of user-facing harm. Difficulty = scope of change implied by the audit
evidence (no design proposals). User-trust risk = severity of perceived
unreliability if left as-is.

| Rank | Issue | Impact | Difficulty | Trust risk | Cite |
|---|---|---|---|---|---|
| 1 | Bucket D metrics surfaced to users (`p2_timing`, `p3_timing`, `hands_outside_shoulders_at_landing`, `sequencing`) | high | low | high | S11 D |
| 2 | Re-upload nondeterminism (`seed = stableSeed(videoId)` + `video_id`-keyed cache) | high | medium | high | S4, S5 |
| 3 | `bat_speed_contact` exposed with prompt-only 33-in calibration | high | high | high | S6, S10 #13, S11 B |
| 4 | `time_to_contact` exposed without anchor detection | high | high | high | S7, S10 #12, S11 B |
| 5 | Phase orb dual-denominator display (orb number = total, % = measured-only) | medium | low | medium | S1 |
| 6 | Completed-with-null analyses (`status:"completed"` w/ `metrics=null`) | medium | low | medium | S8 |
| 7 | Desktop synthetic 30 fps fallback indistinguishable from probed | medium | medium | medium | S9 |
| 8 | Tool-call parse errors fall through to silent defaults | medium | low | medium | S8 |
| 9 | No-tool-call fallback uses `/\d+\/100/` free-text scan only | medium | low | medium | S8 |
| 10 | Bucket C subjective composites lack code-side geometry validation | high | high | medium | S11 C |
| 11 | Engine version constants pinned to `@0.0.0-stub` | low | low | low | S3 |
| 12 | AI gateway determinism for `temperature:0`/`seed` unverified | medium | medium | medium | S5 (`undetermined`) |
| 13 | Browser codec/container support not gated | low | medium | low | S9 (`undetermined`) |
| 14 | Autoplay-blocked probe rejection swallowed | low | low | low | S9 |

---

End of extraction. No code, schema, prompt, UI, or metric changes were
made. Source of every claim above is `.lovable/analysis-truth-audit.md`
sections S1–S11.
