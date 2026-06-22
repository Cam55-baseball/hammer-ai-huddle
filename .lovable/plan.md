# Phase 42B — D-POSE Build Authority

Build the first working measurement path: real uploaded athlete video → real landmark frames → existing detector/anchor/tempo chain → evidence packet.

## Pose Engine Selection

**MediaPipe Tasks Vision (`@mediapipe/tasks-vision`) — `PoseLandmarker`, `pose_landmarker_full.task` model.**

| Criterion | Why this one |
|---|---|
| Runs where the frames already are | Frame extraction is already client-side (`src/lib/frameExtraction.ts`); putting pose inference next to it avoids re-uploading frame buffers and avoids any new server cost. |
| Matches the contract's declared identity | `LANDMARK_MODEL_ID = "blazepose_full"` (`versions.ts`, `biomechFingerprint.ts`) — MediaPipe Pose Landmarker *is* the BlazePose Full pipeline. Flipping `LANDMARK_MODEL_VERSION` off `@0.0.0-stub` keeps the existing fingerprint contract intact. |
| Deterministic per-frame | Static image mode + fixed model file = byte-stable landmark output, satisfies Phase 0 cache fingerprint and Phase 26 evidence-hash requirements. |
| Outputs the fields the existing contracts need | Per-frame normalized landmarks include ankle indices (27/28) — directly usable as `lift_ankle_y` (`PoseFrame`) and `front_ankle_y` (`PlantPoseFrame`) without schema change. |
| Realistic in sandbox | WASM bundle + model file fetch on demand; no native deps; no GPU required; works in Playwright Chromium for sandbox verification. |

## Changes (multi-file, narrow)

### 1. Dependency

- `bun add @mediapipe/tasks-vision`.

### 2. New client module: `src/lib/biomech/pose/poseRunner.ts`

- Exports `runPoseInference(frames: ExtractedFrame[]): Promise<PoseFrameRow[]>`.
- Lazy-loads `PoseLandmarker` from `FilesetResolver.forVisionTasks(".../wasm")` with `runningMode: "IMAGE"`, `numPoses: 1`, model asset path `/models/pose_landmarker_full.task` (served from `public/models/`).
- For each extracted frame: decode data URL → `ImageBitmap` → `poseLandmarker.detect(bitmap)` → push `{ frame_index, timestamp_seconds, landmarks: NormalizedLandmark[33], world_landmarks, visibility }`.
- Returns the array plus a summary `{ frames_processed, frames_with_pose, mean_visibility }`.
- All numeric outputs rounded to 6 decimals so JSON round-trips byte-identically (mirrors `tempoSec.ts` convention).

### 3. New adapter: `src/lib/biomech/pose/toAnchorFrames.ts`

- `toPeakLegLiftFrames(rows): PoseFrame[]` → `{ frame_index, lift_ankle_y: landmarks[27].y }` (left ankle; direction_sign already in tempo inputs).
- `toPlantFrames(rows): PlantPoseFrame[]` → `{ frame_index, front_ankle_y: landmarks[28].y }`.
- Pure mapping, no logic.

### 4. Flip the stub flag

- `src/lib/biomech/versions.ts`: `LANDMARK_MODEL_VERSION = "blazepose_full@0.10.14-mediapipe-tasks-vision"` (pinned to installed package version).
- `supabase/functions/_shared/biomechFingerprint.ts`: same string. Both files updated in lockstep — fingerprint determinism rule.
- The existing `endsWith("@0.0.0-stub")` checks in `anchors/peakLegLift.ts` and `detectors/plantDetector.ts` now evaluate **false** → anchors/detector run their real logic instead of emitting `pose_model_is_stub` missingness.

### 5. Wire into `AnalyzeVideo.tsx`

Immediately after `extractKeyFramesDeterministic` succeeds (around line 363) and **before** the `analyze-video` invoke:

```ts
const poseRows = await runPoseInference(result.frames);
const tempoResult = await runTempoPipeline({
  video_sha256_hex: result.video_sha256_hex,
  fps_true: result.fps_true,
  landing_time_sec: result.landing_time_sec,
  direction_sign: 1,
  calibration_h_px: result.calibration_h_px,
  pose_frames: zip(toPeakLegLiftFrames(poseRows), toPlantFrames(poseRows)),
});
```

Persistence: insert one row into `video_landmark_runs` (already exists, 12 columns) keyed by `video_id` with columns `landmark_producer_version`, `frames_processed`, `frames_with_pose`, `mean_visibility`, `evidence_sha256_hex`, `cache_fingerprint_hex`, plus the full landmark array in a `landmarks_jsonb` column. If the existing column list doesn't include the JSON payload, write a minimal migration adding `landmarks jsonb not null` + RLS unchanged.

### 6. Static model asset

- `public/models/pose_landmarker_full.task` (~6.5 MB) downloaded via `curl` at build-script time from Google's official MediaPipe model URL into the project. One-time commit; no runtime fetch from third party.

### 7. Determinism guard

- Vitest: `src/lib/biomech/pose/__tests__/poseRunner.replay.test.ts` — runs `runPoseInference` twice over a fixed 3-frame fixture (3 PNGs added to `src/test/fixtures/pose/`) and asserts byte-identical JSON output. Protects Phase 0 replay law.

## Proof Packet Capture

The success criterion ("a real uploaded athlete video produces real landmark frames") requires **your** action: you indicated you will supply one short (<20 MB) athlete clip. After the code lands I will:

1. Spin up the dev server and Playwright-Chromium in the sandbox (`headless=true`, viewport 1280×1800).
2. Log into the preview using the pre-minted Supabase session, navigate to `/analyze-video`, attach the clip you upload to chat.
3. Capture from the live run:
   - `video_sha256_hex` (already computed by `extractKeyFramesDeterministic`)
   - `landmark_producer_version` (from `versions.ts`)
   - landmark count (`frames_processed × 33`)
   - landmark sample (first frame's 33 normalized landmarks, JSON)
   - `peakLegLift` anchor output (`frame_index` + `missingness`)
   - `frontFootStrike` anchor output
   - `computeTempoSec` output (`value`, `unit`, `lineage`, `confidence`)
   - `tempoEvidence` artifact (`evidence_sha256_hex`, `cache_fingerprint_hex`)
   - Report-card tile JSON for `tempo_sec`
4. Write all of those — verbatim, with no fabrication — into `.lovable/phase-42b-d-pose-build-authority.md` under §"Execution Evidence Packet".

The document's **Final Determination** will be set from that captured evidence:
- If landmarks emit and tempo lineage is non-missing → **YES**.
- If the run reaches pose inference but no athlete is detected (clip too tight, poor framing) → **PARTIAL**, with the exact missingness reason logged.
- If pose inference itself fails (WASM load, model fetch) → **NO**, with the stack trace logged. No fabricated YES under any condition.

## What This Phase Will NOT Do

- No new metrics, detectors, anchors, doctrine, validation methodology, or calibration methodology — exactly the constraint set in Phase 42's original brief. `runTempoPipeline`, `findPeakLegLiftFrame`, `findFrontFootStrikeFrame`, `computeTempoSec`, `buildTempoEvidence` are all consumed unchanged.
- No new report-card surfaces.
- No edge-function rewrite. `analyze-video` keeps doing its Gemini visual analysis untouched; landmarks travel on a parallel track straight from client into `video_landmark_runs`.
- No confidence-certificate work (still emits `uncalibrated()`); that remains a downstream phase blocker, not in scope here.

## What You Need to Do After Approval

1. Approve this plan.
2. After I finish the code changes, **attach one short athlete pitching/hitting clip (mp4, <20 MB) to the next chat message**. Without that file the success criterion cannot be evaluated, and the document's Final Determination will be **NOT EVALUATED — AWAITING REAL VIDEO** rather than YES or NO.

## Files Touched

| File | Action |
|---|---|
| `package.json` / lockfile | add `@mediapipe/tasks-vision` |
| `public/models/pose_landmarker_full.task` | new asset |
| `src/lib/biomech/pose/poseRunner.ts` | new |
| `src/lib/biomech/pose/toAnchorFrames.ts` | new |
| `src/lib/biomech/pose/__tests__/poseRunner.replay.test.ts` | new |
| `src/test/fixtures/pose/*.png` | new (3 fixture frames) |
| `src/lib/biomech/versions.ts` | flip `LANDMARK_MODEL_VERSION` |
| `supabase/functions/_shared/biomechFingerprint.ts` | flip `LANDMARK_MODEL_VERSION` (lockstep) |
| `src/pages/AnalyzeVideo.tsx` | invoke pose runner + tempo pipeline after frame extraction; insert into `video_landmark_runs` |
| `supabase/migrations/<ts>_video_landmark_runs_landmarks.sql` | only if `video_landmark_runs` lacks a `landmarks jsonb` column |
| `.lovable/phase-42b-d-pose-build-authority.md` | the deliverable doc, written last with real captured proof |
