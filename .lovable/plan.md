# DelayCam Session Architecture — Plan (Steps 1–5)

Nothing here gets built until you approve the plan. Step 5 is described only and needs its own separate approval. `ios/` and `capacitor.config.ts` are not touched. Nothing is deployed or published.

## Principles that apply to every step
- **One file, many reps.** DelayCam keeps saving one video per session. Reps are time ranges inside it and never separate files.
- **Frame rate is recorded, never assumed.** Each session and each rep stores its own measured fps and fps tier. No code path contains a 60fps cap or a "≤60" assumption.
- **Metrics declare what they need.** Each metric declares the minimum fps tier it requires. If a rep is below that tier, the metric reports the canonical missingness reason `frame_rate_insufficient`. When a later session meets the tier, the metric works automatically, with no code change.
- **Deterministic.** Rep splitting and metrics run over the saved video file, never the live camera stream. Same file, same model version and same engine version give the same reps and values. Each result is stamped with `engine_version` and `landmark_model_version`.
- **Missing beats guessed.** An uncertain rep boundary is stored as missing with a reason. It is never shown as a rep.

---

## Step 1 — Session and rep records

**Existing pieces this reuses:**
- `videos`: already stores the DelayCam file, with `capture_source='delaycam'`, `requested_fps`, `achieved_fps`, `capture_fps_tier` and `capture_fps_source`.
- `video_landmark_runs` plus the private `pose-landmarks` bucket: dense landmark series for a video, versioned by model.

**Can existing tables be extended instead?** Partly:
- The session's pose series reuses `video_landmark_runs` as-is: one run per session video, and no new storage format.
- `videos` is one row per file, so it can't also hold per-rep rows or session state. Two new tables are needed.

**New table: `delaycam_sessions`** (one row per session)
- `user_id`, `video_id` (points to the one saved original clip; set once the upload finishes), `sport`, `module`, side stamp.
- `started_at`, `ended_at`, `duration_sec` (measured recording time).
- `requested_fps`, `achieved_fps`, `fps_tier`, `fps_source` (copied from capture, never assumed).
- `display_metrics_on` (boolean). **This is display preference only.** It is recorded for audit, and no processing code reads it.
- `processing_state`: `recorded | uploaded | splitting | split | analyzing | analyzed | failed`, plus `processing_error`.
- `rep_detection_state`: `not_run | confident | partial | uncertain`, plus `rep_detection_reason` (canonical missingness code).
- `landmark_run_id` (points to `video_landmark_runs`), `engine_version`, `splitter_version`.
- `summary` (jsonb, written by Step 3), `summary_version`, `analyzed_at`.
- `created_at`, `updated_at`.

**New table: `delaycam_reps`** (one row per detected rep, and only confident ones)
- `session_id`, `user_id`, `rep_index`.
- `start_ms`, `end_ms`, and anchor timestamps (for example `anchor_ms`: the contact or release candidate, which may be null).
- `fps_measured` (frames actually present in the range divided by its duration) and `fps_tier`.
- `boundary_confidence` (0–1, a measurement-quality score) and `boundary_signals` (jsonb: which signals agreed).
- `metrics` (jsonb, same `MetricValue` shape as the report card: value plus confidence, or missing plus reason).
- `engine_version`, `splitter_version`.

**How reps reference the video:** `start_ms` and `end_ms` are offsets into the one session video, using the measured duration from the recording fix. Playback seeks to `start_ms` on the existing player, so no clip is cut.

**Who can see these:**
- The athlete reads and writes only their own rows.
- Coaches and guardians get read access only through the existing `recruitingGate` rules, and only through a gated function, never a broad policy.
- Grants are added in the same migration. Nothing is deleted or dropped.

---

## Step 2 — Background tracking with rep splitting

**Guaranteeing that the toggle only controls display, in code:**
- Gathering lives in one module, `src/lib/delaycam/sessionPipeline.ts`, which is given only the video and the capture metadata.
- The display toggle is not in that module's inputs, so the processing code has no way to read it. A lint and a test check this.
- The live overlay is a separate read-only view that subscribes to the pipeline's output. With the toggle off, the overlay doesn't mount. The pipeline runs the same either way.
- A test runs the pipeline twice on the same file, once with display on and once off, and checks that the results are byte-identical.

**Two passes:**
1. **Live pass (during recording), only for the on-screen display.**
   - About 12 frames a second at roughly 256px on the short side, using the existing `poseRunner` with the lite model.
   - Frames are paused whenever the phone reports thermal pressure or the recorder falls behind.
   - It only produces "rep in progress / rep done" hints for the display, and those hints are **never stored**.
   - Stored truth comes only from pass 2, so a dropped live frame can never corrupt the data.
2. **Stored pass (after Stop, on the device, over the saved file).**
   - **Scout pass:** the existing `scoutPass` samples the whole file at 15 frames a second to find movement windows.
   - **Dense pass:** full-rate tracking inside each window only, using the existing `denseLandmarkCapture` at native fps. The result is written as the session's one `video_landmark_runs` series.
   - It runs after the recording has been saved, can be resumed if the app goes to the background, and shows progress.

**How a rep boundary is detected** (from landmarks only, since there's no bat or ball detector):
- **Hitting:**
  - The athlete is still in stance: wrist speed below the rest threshold for at least 300 ms.
  - Load: the hands move back, away from the pitcher side.
  - Burst: peak wrist speed together with pelvis-then-shoulder rotation, and the peak must pass the swing threshold.
  - Finish: movement drops back below the rest threshold.
  - The rep runs from the end of the stance stillness to the return to rest. The contact candidate is the time of peak hand speed. It's labelled a candidate, not contact.
- **Pitching:**
  - Set position: stillness.
  - First movement: the lift knee or hands start moving.
  - Peak knee height.
  - Stride foot landing: foot speed drops to about zero after forward travel.
  - Peak throwing-wrist speed, which is the release candidate.
  - Follow-through, then return to stillness or walking off.
  - The rep runs from first movement to follow-through finishing. This reuses the anchor logic behind `tempoSec` (first movement to foot plant).
- **Throwing:** the same as pitching but with a shorter structure: the crow hop or step, then plant, then arm peak.

**When detection is uncertain** (canonical missingness, never a guessed split):
- A window is kept as a rep only when every required signal agrees and the athlete was the same tracked person throughout (the existing `subjectLock`).
- Otherwise the window is recorded in the session's `boundary_signals` log with one of these reasons: `subject_lost`, `occluded`, `signals_disagree`, `overlap_ambiguous`, `below_rest_threshold_never` or `frame_rate_insufficient`. **No rep row is created for it.**
- The session is marked `partial` (some reps confident) or `uncertain` (none). Uncertain windows are counted and shown as "N movements we couldn't separate cleanly".
- The thresholds start as proposed values and are checked against your real DelayCam sessions before any rep count is shown to athletes. Until then, rep splitting is visible to staff only, the same way tempo was gated.

**Battery and heat:** I can't measure this from here. It needs a real phone. What I can say:
- The stored pass processes a few percent of frames by count, because the scout pass is sparse and the dense pass only covers movement windows.
- The live pass has a fixed limit of about 12 small frames a second and pauses under thermal pressure.
- I'll add stage timing logs and a battery-level check at the start and end so you can measure it on your iPhone.

---

## Step 3 — Analyze Session

**What it contains today, honestly:**
- **Session facts** (always shown when present):
  - Duration, measured fps, and the fps tier explained in plain words.
  - Rep count split into confident and couldn't-separate.
  - Tracking coverage: the percentage of frames where the athlete was tracked.
- **Per-rep strip:** each confident rep can be tapped to jump to that time in the video.
- **Tempo** (pitching only):
  - Per-rep values, median, range and spread (standard deviation) across reps.
  - Shown only for reps where the existing tempo gate passes.
  - Stays staff-only until the rep splitter is checked, as described in Step 2.
- **Shoulder tilt at release** (pitching and throwing):
  - Only when a release candidate is found and the existing shoulder-tilt guard passes.
  - Otherwise it's listed as missing with its reason.
- **Mechanics consistency:** limited to what's actually measured. That means the spread of the metrics above, not opinions.
- **Hitting:** session facts and rep count only. Every hitting metric stays hidden, because hitting analysis is still switched off app-wide.

**How missing metrics are presented:**
- The summary builds its list from a registry of metrics, not from the ones that happened to produce values.
- Every metric the session could have shown gets a row: either the value, or a plain-language reason from the canonical missingness codes.
- Examples:
  - "Needs a faster camera — this session was 52fps, this measurement needs 120fps."
  - "Not released yet — we can't measure this directly from video today."
  - "Couldn't find release in 4 of 9 reps."
- Rows for "not released yet" metrics are collapsed into one section, so the summary isn't a long list of blanks.

**How it grows without a rewrite:**
- Each metric is a registry entry declaring:
  - which module it applies to
  - the minimum fps tier it needs
  - which anchors it needs
  - its release status
  - its per-rep compute function
- The summary loops over the registry.
- When a new detector lands, a new entry is added (or an existing one is flipped to released) and past sessions can be recalculated from the stored landmark series. Nobody has to re-film.
- The summary includes `summary_version`, so older summaries stay reconstructable.

---

## Step 4 — Player profile connection

**What the profile shows:**
- A read-only "DelayCam sessions" card on the athlete's profile:
  - the last 5 sessions (date, module, reps, fps tier)
  - a trend of tempo median and spread across sessions, only for released metrics with confident reps
- Each entry opens that session's summary.

**Data model:**
- No change to existing profile tables. The card reads `delaycam_sessions` and `delaycam_reps` directly.
- Coach and guardian viewing goes through a gated function that uses `recruitingGate`. Minors keep guardian precedence.

---

## Step 5 — Hammers Today connection (described only; separate approval needed)

**What it would consume:** a small, read-only "movement signals" summary per athlete, built from analyzed sessions:
- recent session count per module
- throwing and pitching rep counts, as arm-load context only
- released metric trends with their confidence

Unreleased and missing metrics are never passed along.

**What the freeze forbids today:** any change to `wk-generate-daily`, the daily card builders, the lift certifier, the session builder, or anything they read that could change a plan's output. That includes new inputs.

**What the approval would need to cover:**
1. Adding the new input to the generator.
2. Exactly which decisions it may affect. For example, arm-load context feeding the existing arm ledger (counts only, never doses), or suggesting a drill when a measured spread is high.
3. A before-and-after comparison on the matrix: 1,296 plan combinations, with no changes when the signals are absent.
4. A way to switch it off and revert.

None of this gets touched until you approve it separately.

---

## What changes once 240fps exists, and what doesn't

**Stays the same:**
- The schema for both tables.
- The one-file, time-range model for reps.
- The two-pass pipeline.
- The rule that the toggle only controls display.
- The missingness codes.
- The summary registry.
- The profile card.
- The Step 5 input.

**Changes, and only as configuration or data:**
- Sessions record the higher fps and a new tier (`elite` already exists at 100fps and up).
- Metrics that need that tier (ball speed, time to contact, finer release timing) start working without code changes, once their detectors exist.
- The live display pass keeps its limit of about 12 frames a second. The stored dense pass handles 4× more frames per rep, so it takes longer, and the progress UI covers that.
- A native camera plugin would add a second capture source feeding the same session insert, recorded as `fps_source='native'`.

---

## Technical details
- **New files:**
  - `src/lib/delaycam/sessionPipeline.ts`
  - `src/lib/delaycam/repSplitter/{hitting,pitching,throwing}.ts`
  - `src/lib/delaycam/sessionMetricRegistry.ts`
  - `src/lib/delaycam/sessionSummary.ts`
  - `src/components/analyze/delaycam/{DisplayMetricsToggle,LiveRepOverlay,SessionSummary}.tsx`
  - a profile card component
- **Reused:** `poseRunner`, `scoutPass`, `denseLandmarkCapture`, `subjectLock`, `landmarkSeriesStorage`, `tempoSec` and its gate, `shoulderTiltGuarded`, `classifyFps`, `metrics/missingness.ts`.
- **Tests:**
  - Determinism: the same file processed twice gives identical splits.
  - Display on and display off give identical results.
  - A synthetic landmark series is split correctly, including uncertain windows.
  - An fps-tier gate returns missingness below the tier and a value at or above it.
  - No code path references a fixed 60fps.
- **Migration:** creates `delaycam_sessions` and `delaycam_reps`, with grants, access rules, an `updated_at` trigger and indexes on `(user_id, created_at)` and `(session_id, rep_index)`. It only adds; nothing is dropped.
