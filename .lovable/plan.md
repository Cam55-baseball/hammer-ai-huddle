
# Hammers Video Analysis — Implementation Authorization Acceptance

The Metric Constitution (Phase 3), Event Constitution (Phase 3A), and the prior Phase-0…Phase-2 capability audits are accepted as the binding scope. This plan implements **exactly** what the contract specifies — no substitutions, no shortcuts, no simplifications. Every clause maps to a deliverable below. Where the contract is silent on a technical detail, the prior ratified constitutions govern.

The work ships in **six phases**, in order. Phase N may not begin until Phase N−1's acceptance tests pass. Acceptance criteria from the contract are the only gate to release.

---

## Phase 0 — Determinism Foundation

**Goal.** Same input → byte-identical output. No nondeterministic analysis path remains.

**Schema (one migration).**
- `videos`: add `sha256_hex text`, `fps_true numeric`, `duration_sec numeric`, `width int`, `height int`, `orientation text`, `landing_time_sec numeric`, `calibration_h_px numeric`, `direction_sign smallint`.
- `video_landmark_runs` (one row per pose extraction): `video_id`, `landmark_model_id` ('blazepose_full'), `landmark_model_version`, `fps_true`, `frame_count`, `landmarks_storage_path`, `landmarks_sha256_hex`, `mean_visibility`, `created_at`.
- `video_event_runs`: `video_id`, `landmark_run_id`, `detector_version`, `events_jsonb`, `events_sha256_hex`, `created_at`. One row per `(video_id, detector_version)` — idempotent upsert.
- `video_metric_runs`: `video_id`, `landmark_run_id`, `event_run_id`, `metric_engine_version`, `metrics_jsonb`, `metrics_sha256_hex`, `created_at`. Idempotent upsert.
- `video_analysis_runs` (the audit trail the contract requires): `id`, `video_id`, `requested_by`, `requested_at`, `cache_fingerprint_hex`, `cache_hit boolean`, `video_sha256_hex`, `landmark_model_version`, `detector_version`, `metric_engine_version`, `fps_true`, `frame_selection_jsonb`, `event_selection_jsonb`, `confidence_summary_jsonb`, `landmark_run_id`, `event_run_id`, `metric_run_id`, `coaching_run_id nullable`, `outcome text`. Append-only — every analysis attempt persists forever.
- `video_coaching_runs`: `id`, `metric_run_id`, `ai_model_id`, `ai_model_version`, `prompt_sha256_hex`, `narrative_jsonb`, `drills_jsonb`, `created_at`. Coaching only — never writes measurements.

All public tables include GRANTs and RLS scoped to the video owner; service role full access for edge functions.

**Cache fingerprint (deterministic).**
```
cache_fingerprint = SHA256(
  video_sha256_hex || ":" ||
  landmark_model_version || ":" ||
  detector_version || ":" ||
  metric_engine_version || ":" ||
  fps_true || ":" ||
  landing_time_sec_or_null || ":" ||
  direction_sign || ":" ||
  calibration_h_px
)
```
Prompt text, athlete-context snapshots, AI model id, and any other coaching-layer inputs are **excluded** from the measurement cache. They live on `video_coaching_runs` with their own fingerprint. All existing `replay_input_fingerprint = "input-only"` paths are removed.

**Replay validation tooling.** A node/deno script `scripts/replay/verify-determinism.ts` re-runs the landmark→event→metric pipeline N times against a fixed `landmarks.jsonl` fixture and asserts byte-identical `events_sha256_hex` and `metrics_sha256_hex`. Wired into the test suite.

**Removals.**
- The `Pass-2 Pro escalation` path in `analyze-video` is retired.
- `recompute-report-card` is rewritten as a thin re-runner against the persisted landmark file — same code path as initial analysis. There is exactly one logic path.

---

## Phase 1 — Video Processing Layer

**FPS & quality.** New `src/lib/video/probeVideo.ts` uses `WebCodecs.VideoDecoder` (with `requestVideoFrameCallback` fallback) to detect `fps_true`, `duration_sec`, `width`, `height`, `orientation`, and a `dropped_frame_ratio` sample. Persisted on `videos` at upload.

**Frame extraction.** `src/lib/video/extractFrames.ts` replaces `frameExtraction.ts`. Frame selection is computed from event-time anchors (post-Phase 3) or, pre-pose, from a fixed deterministic grid driven by `fps_true` and `duration_sec` — never `Math.random`, never browser-clock. Each extracted frame persists `{frame_index, t_seconds=frame_index/fps_true, sha256_hex}` into the audit row.

**Rejection rules (constitutional minimums).**
- `fps_true < 24` → reject with `missing_reason: "fps_below_minimum"`.
- `width*height < 480*270` → reject.
- `duration_sec < 0.8` or `> 30` → reject.
- `dropped_frame_ratio > 0.05` → reject.
Rejections create a `video_analysis_runs` row with `outcome='rejected'` and a structured reason; no silent pass.

**Audit logs.** Every frame extraction emits a structured log entry with frame index, timestamp, hash, and selection rule id.

---

## Phase 2 — Landmark & Measurement Layer

**Dependency.** Add `@mediapipe/tasks-vision`. Model assets (BlazePose Full) served from the public CDN per MediaPipe docs; pinned by version string in `landmark_model_version`.

**Worker.** `src/workers/poseWorker.ts` runs `PoseLandmarker` in a Web Worker over every frame, emitting one row per frame to a streaming `landmarks.jsonl` buffer. Output is uploaded to Storage at `landmarks/{video_id}/{landmark_model_version}.jsonl`, hashed, and persisted on `video_landmark_runs`. **One landmark file per `(video_id, landmark_model_version)`**; never recomputed when present.

**Module.** `src/lib/biomech/` holds: `landmarks.ts` (loader), `kinematics.ts` (the fixed Savitzky-Golay window=5 / order=2 smoother, velocity, angle, tilt — exactly the operators ratified in Phase 3A §0), `calibration.ts` (`H_px` selection).

**Quality scoring.** Per-landmark visibility mean + per-frame visibility mean persisted. Missing-landmark diagnostics surfaced in the run record.

**Tools.** A dev-only `/admin/landmarks/:videoId` overlay renders landmarks onto frames for debugging. Not user-facing.

---

## Phase 3 — Event Engine

Implements **E-1…E-10** verbatim from the Phase 3A Event Detection Constitution.

**Files.** `src/lib/biomech/events/` with one file per event (`tSetup.ts`, `tLoadStart.ts`, `tP2Complete.ts`, `tLift.ts`, `tStrike.ts`, `tRotationStart.ts`, `tRelease.ts`, `tContact.ts`, `tFinish.ts`) and `index.ts` that runs them in the constitutional dependency order with the fixed single second-pass for forward references (E-3 ↔ E-6).

**Determinism.** Every detector is a pure function `(landmarks, fps_true, dir, H_px) → {frame_index, t_seconds, confidence, missing, missing_reason}`. No `Date.now`, no `Math.random`, no network. Earliest-frame tie-break enforced centrally in a `argmaxEarliest()` helper.

**Persistence.** Results written to `video_event_runs` as a single canonical JSON object keyed by event name. Hash stored. `t_landing` exposed as a read-only alias of `t_strike` for hitting.

**Validation.**
- Temporal consistency check (`t_contact > t_landing`, `t_release > t_strike`); violations mark both events `missing` with `missing_reason: "temporal_consistency_violation"`.
- Replay fixture suite per the Phase 3A §4 protocol — boundary tests, FPS sensitivity (30/60/120), 10× re-run equivalence.

**Metrics may not self-detect events** — enforced by lint rule + code review: `src/lib/biomech/metrics/**` cannot import from `events/` detector internals, only from the persisted event record.

---

## Phase 4 — Metric Engine

Implements every metric in the Phase 3 Metric Constitution.

**Files.** `src/lib/biomech/metrics/` with one file per metric id (BP-1…, BH-1…, TH-…). Each exports a pure function `(landmarks, events, fps_true, calibration) → MetricValue`.

**Contract enforced.**
- No `fetch`, no Supabase client, no AI gateway call, no `pose*` import inside metric files. Vitest guard + ESLint rule.
- Output schema is the existing `MetricValue` from `src/lib/reportCard/contracts/shared.ts`: `{value, score, confidence, missing?, missing_reason?}`.
- Confidence caps from the Phase 3 constitution applied centrally in `applyConfidenceCap(metricId, raw)`.
- `bat_speed_contact_mph` (BH-13) remains retired — file exists but always returns `{missing: true, missing_reason: "retired_no_sensor"}`.

**Engine version.** `METRIC_ENGINE_VERSION` constant; bumped on any formula change; participates in the cache fingerprint.

**Persistence.** Results to `video_metric_runs` with hash. Tile components read from this table only; they never recompute.

---

## Phase 5 — Coaching Layer

AI is permitted **only** in this layer.

**Files.** `supabase/functions/coach-narrative/index.ts`. Input: `metric_run_id`. Pulls the deterministic metric record + athlete context snapshot, calls Lovable AI Gateway (Gemini), returns `{narrative, drills, development_plan}` — text only. Persisted on `video_coaching_runs`.

**Hard prohibitions** (enforced by schema + code review):
- The coach function may not write to `video_metric_runs`, `video_event_runs`, or `video_landmark_runs`.
- The response JSON schema has no `value`, `score`, or `confidence` field anywhere.
- A coaching run NEVER influences the cache fingerprint of the measurement layer — recomputing narrative does not invalidate metrics; recomputing metrics does invalidate narrative.

---

## Phase 6 — Observability

New `/ops/video/:videoId` admin route with sub-tabs:
1. **Replay** — re-runs the deterministic pipeline against persisted landmarks and shows hash equivalence.
2. **Landmarks** — frame-by-frame skeleton viewer.
3. **Events** — table of E-1…E-10 with frame index, t_seconds, confidence, missing reason.
4. **Metrics lineage** — for each metric: which events it consumed, which landmarks, which calibration, raw formula trace, confidence cap applied.
5. **Confidence** — per-metric, per-event, per-landmark.
6. **Failures** — every `outcome != 'ok'` `video_analysis_runs` row, decoded.
7. **Run compare** — diff any two `video_analysis_runs` rows; highlights non-zero hash diffs.
8. **Determinism audit** — runs 10× equivalence test on demand.

Admin-only via `user_roles`.

---

## Acceptance Criteria (release gate)

A release ships only after all eight pass against a fixed test video:
1. 10 sequential analyses produce identical `landmarks_sha256_hex`.
2. 10 sequential analyses produce identical `events_sha256_hex`.
3. 10 sequential analyses produce identical `metrics_sha256_hex`.
4. Per-tile confidence values are identical across 10 runs.
5. Tile statuses and rendered values identical across 10 runs.
6. Coaching narrative wording may differ; metric record cited by the narrative is byte-identical.
7. Metric lineage viewer resolves every metric → events → landmarks chain without gaps.
8. `scripts/replay/verify-determinism.ts` exits 0 in CI.

---

## Technical Sequencing

```text
Phase 0  schema + audit trail + cache rewrite + replay tool   (DB migration #1)
Phase 1  WebCodecs probe + deterministic frame extraction     (no schema change)
Phase 2  MediaPipe worker + landmarks.jsonl + storage         (deps + storage bucket)
Phase 3  Event detectors + persistence + fixtures             (no schema change)
Phase 4  Metric engine + lint guards + tile rewiring          (no schema change)
Phase 5  coach-narrative edge function                        (edge function only)
Phase 6  /ops/video/:videoId observability surfaces           (frontend only)
```

Each phase ends with its slice of the acceptance suite passing before the next begins.

---

## Out of Scope (explicitly)

- Bat-tip / ball / glove tracking (Phase 3 retired BH-13; no equipment-tracking work).
- Multi-camera fusion.
- Softball-specific windmill biomechanics (remains aliased to baseball per Phase 3 §3).
- Any AI-generated measurement, score, or confidence.
- Any path that lets the LLM influence cached measurement values.

---

## First Migration (Phase 0) — to be submitted on approval

A single migration creates `video_landmark_runs`, `video_event_runs`, `video_metric_runs`, `video_analysis_runs`, `video_coaching_runs`, the column additions on `videos`, GRANTs, RLS policies, and `updated_at` triggers. No data backfill; legacy `ai_analysis` rows remain readable but new analyses use the new tables exclusively.

**Awaiting authorization to begin Phase 0.**
