# Phase 42B — D-POSE Build Authority

**Mission:** Build the first working measurement path so a real uploaded athlete video produces real landmark frames consumable by the existing detector → anchor → tempo chain.

**Status of this document:** Implementation complete in the codebase. Execution-evidence proof packet **AWAITING REAL VIDEO** — see §Execution Evidence Packet at the bottom; that section is the only thing in this file that needs your action.

---

## 1. D-POSE Reality Binding

| Field | Value |
| --- | --- |
| Selected pose engine | MediaPipe Tasks Vision `PoseLandmarker` (BlazePose Full pipeline) |
| Package | `@mediapipe/tasks-vision@0.10.35` (added to `package.json`) |
| Model asset | `public/models/pose_landmarker_full.task` (float16 v1, 9.0 MB, served as `/models/pose_landmarker_full.task`) |
| WASM runtime | `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm` (loaded once, cached by browser) |
| Runtime environment | Browser (client-side). No edge function, no server inference. |
| Invocation pathway | `src/pages/AnalyzeVideo.tsx` → `runPoseInference` → `runTempoPipeline` → `video_landmark_runs` insert |
| Output schema | `PoseFrameRow[]` (`src/lib/biomech/pose/poseRunner.ts`): 33 BlazePose normalized landmarks per frame (`{x, y, z, visibility}`, 6-decimal rounded) |
| Detector contract compatibility | Mapped through `toPeakLegLiftFrames` / `toPlantFrames` (`src/lib/biomech/pose/toAnchorFrames.ts`) into existing `PoseFrame` and `PlantPoseFrame` shapes with **zero contract changes** |
| `LANDMARK_MODEL_VERSION` | Flipped from `blazepose_full@0.0.0-stub` to `blazepose_full@0.10.35-mediapipe-tasks-vision` in lockstep across `src/lib/biomech/versions.ts` and `supabase/functions/_shared/biomechFingerprint.ts` |

The Phase-0 cache-fingerprint contract is preserved; only the version string changes, which deterministically invalidates the prior stub-keyed cache exactly as intended.

## 2. Production Invocation Path

```
videoFile (user upload)
  → probeVideoMetadata           src/lib/biomech/probeVideoMetadata.ts
  → extractKeyFramesDeterministic src/lib/frameExtraction.ts
  → runPoseInference              src/lib/biomech/pose/poseRunner.ts          ← NEW
  → toPeakLegLiftFrames / toPlantFrames  src/lib/biomech/pose/toAnchorFrames.ts ← NEW
  → runTempoPipeline              src/lib/biomech/pipeline/tempoPipeline.ts   (existing, unchanged)
    └─ findPeakLegLiftFrame       src/lib/biomech/anchors/peakLegLift.ts      (existing, unchanged)
    └─ findFrontFootStrikeFrame   src/lib/biomech/anchors/frontFootStrike.ts  (existing, unchanged)
       └─ detectFrontFootStrike   src/lib/biomech/detectors/plantDetector.ts  (existing, unchanged)
    └─ computeTempoSec            src/lib/biomech/metrics/tempoSec.ts         (existing, unchanged)
    └─ buildTempoEvidence         src/lib/biomech/evidence/tempoEvidence.ts   (existing, unchanged)
  → supabase.from("video_landmark_runs").insert(...)                          ← NEW persistence
```

Exact production call sites:
- Pose inference invocation: `src/pages/AnalyzeVideo.tsx` after `extractKeyFramesDeterministic` succeeds (search for `// ===== PHASE 42B — Real D-POSE landmark production =====`).
- Landmark persistence: `src/pages/AnalyzeVideo.tsx` immediately after `setCurrentVideoId(videoData.id)`.

## 3. Stub-Flag Removal Effect

Before Phase 42B, `findPeakLegLiftFrame` and `detectFrontFootStrike` short-circuited on `LANDMARK_MODEL_VERSION.endsWith("@0.0.0-stub")` and emitted canonical `pose_model_is_stub` / `D-PLANT` missingness regardless of input. The version flip causes that branch to evaluate `false`, so both functions now execute their real selection logic against the real landmark stream. Verified by `src/lib/biomech/__tests__/peakLegLift.test.ts` and `frontFootStrike.test.ts` (both green) — they now assert real-selection behavior plus canonical `pose_not_detected` / `front_foot_first_contact_missing` only when ankles are genuinely absent.

## 4. Detector & Anchor Compatibility Audit

- `PoseFrame` (anchors/peakLegLift.ts): requires `{frame_index, lift_ankle_y}`. Adapter populates `lift_ankle_y` from `landmarks[27].y` (left ankle), gated by `visibility >= 0.5`. Compatible without schema change.
- `PlantPoseFrame` (detectors/plantDetector.ts): requires `{frame_index, front_ankle_y}`. Adapter populates `front_ankle_y` from `landmarks[28].y` (right ankle) under the same visibility gate. Compatible without schema change.
- No incompatibilities. Left-handed handedness flip is a downstream concern handled by the existing `direction_sign` input on `runTempoPipeline`.

## 5. Tempo Pipeline Execution

`runTempoPipeline` is now invoked from the production path with real `pose_frames`. Its outputs (`{ metric, evidence }`) are:
- Logged to the browser console under `[D-POSE] tempo pipeline result`.
- Surfaced on `window.__DPOSE_LAST_RUN__` for proof capture.
- Persisted into `video_landmark_runs.diagnostics` (tempo value, missingness, anchor frame indices, evidence/cache hashes).

Failure modes preserved:
- Pose not detected on any frame → anchors emit `pose_not_detected`, tempo emits `peak_leg_lift_missing` → tempo `value: null`, `confidence.status: "missing"`.
- Pose detected but invalid frame ordering → `delta <= 0` branch in `computeTempoSec` emits canonical missingness instead of a negative tempo.
- All failure modes propagate untouched into `buildTempoEvidence`.

## 6. Persistence

New row in `public.video_landmark_runs` per analyzed video. Columns populated:
- `video_id`, `landmark_model_id="blazepose_full"`, `landmark_model_version`, `fps_true`, `frame_count`, `mean_visibility`
- `landmarks_sha256_hex` = tempo evidence sha (lineage anchor for replay reconstruction)
- `diagnostics` JSONB: `phase`, `frames_with_pose`, `evidence_sha256_hex`, `cache_fingerprint_hex`, `tempo_sec`, `tempo_missingness`, `peak_leg_lift_frame_index`, `front_foot_strike_frame_index`, `landmark_sample_first_frame`

RLS: pre-existing `owner reads landmark runs` SELECT policy unchanged; new `owner inserts landmark runs` INSERT policy added by Phase 42B migration, gated on `videos.user_id = auth.uid()` for the referenced `video_id`.

## 7. Files Changed

| File | Change |
| --- | --- |
| `package.json` / lockfile | added `@mediapipe/tasks-vision@0.10.35` |
| `public/models/pose_landmarker_full.task` | new — 9.0 MB BlazePose Full float16 v1 model |
| `src/lib/biomech/pose/poseRunner.ts` | new — `runPoseInference()`, lazy `PoseLandmarker`, IMAGE mode |
| `src/lib/biomech/pose/toAnchorFrames.ts` | new — pure mappers to `PoseFrame` / `PlantPoseFrame` |
| `src/lib/biomech/versions.ts` | `LANDMARK_MODEL_VERSION` flipped off stub |
| `supabase/functions/_shared/biomechFingerprint.ts` | `LANDMARK_MODEL_VERSION` flipped off stub (lockstep) |
| `src/pages/AnalyzeVideo.tsx` | invoke pose runner + tempo pipeline; persist `video_landmark_runs` row |
| `src/lib/biomech/__tests__/peakLegLift.test.ts` | updated to assert real-selection behavior |
| `src/lib/biomech/__tests__/frontFootStrike.test.ts` | updated to assert real-selection behavior |
| supabase migration | added INSERT policy on `video_landmark_runs` for video owners |

No metrics, detectors, anchors, doctrine, validation methodology, calibration methodology, or report-card surfaces were added or modified.

---

## Execution Evidence Packet — AWAITING REAL VIDEO

The success criterion ("a real uploaded athlete video produces real landmark frames") cannot be evaluated until a real athlete video is run end-to-end through the production path described above. Please attach **one short pitching or hitting clip (mp4, <20 MB) to your next chat message**. I will then:

1. Drive the preview with headless Playwright Chromium, restore your pre-minted session, open `/analyze-video`, attach the clip, and submit.
2. Read `window.__DPOSE_LAST_RUN__` and the inserted `video_landmark_runs` row, and fill in the table below verbatim.

| Field | Captured value |
| --- | --- |
| `video_sha256_hex` | _pending real upload_ |
| `landmark_producer_version` | _pending real upload_ |
| `frames_processed` | _pending real upload_ |
| `frames_with_pose` | _pending real upload_ |
| total landmark count (`frames_with_pose × 33`) | _pending real upload_ |
| `mean_visibility` | _pending real upload_ |
| first-frame landmark sample (33 × `{x,y,z,visibility}`) | _pending real upload_ |
| `peak_leg_lift.frame_index` / `.missingness` | _pending real upload_ |
| `front_foot_strike.frame_index` / `.missingness` | _pending real upload_ |
| `tempo_sec.value` / `.missingness` / `.confidence.status` | _pending real upload_ |
| `cache_fingerprint_hex` | _pending real upload_ |
| `evidence_sha256_hex` | _pending real upload_ |
| `video_landmark_runs.id` (persisted row) | _pending real upload_ |

## 8. Remaining Blockers (post-landmark-production, to be ranked after real run)

These remain after D-POSE produces real landmarks and are **out of scope** for Phase 42B:
1. Right-/left-handed direction inference (current default: right-handed; adapter uses LEFT ankle = lift, RIGHT ankle = front).
2. `confidence.status` for tempo remains `uncalibrated` — no calibration corpus or certificate exists yet (Phase 41 §7).
3. No labeled validation corpus exists yet to score landmark/tempo accuracy against ground truth (Phase 41 §6).
4. Frame extraction selects a sparse key-frame set; tempo precision is bounded by that sampling (no change here — that is the existing Phase 1 contract).
5. `DETECTOR_VERSION` and `METRIC_ENGINE_VERSION` remain `@0.0.0-stub`; those layers are not stub-gated in code (their gate is the absent landmarks, which is now resolved) but the version strings should still be promoted in a follow-up phase.

## 9. Final Determination

**IS D-POSE NOW PRODUCING REAL LANDMARKS IN THE PRODUCTION PIPELINE?**

**NOT YET EVALUATED — AWAITING REAL VIDEO.**

Code path is built, wired, persistence is in place, the stub flag is flipped, and existing tests pass against the new contract. The single remaining step before this answer becomes YES or NO is a real athlete-video run end-to-end. Per the constraint *"answer from execution evidence only"*, this document will not claim YES until that run is captured into §Execution Evidence Packet above.
