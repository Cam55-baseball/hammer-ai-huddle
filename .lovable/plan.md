# Capture & Analysis Consolidation

## Current state (verified, not assumed)

**Four entry points exist, and only three of them are actually "capture choices."**

| Path | Where | What it really is | Feeds |
|---|---|---|---|
| Upload | `AnalyzeVideo.tsx:1129` (mode `upload`) | Pick an existing file | `analyze-video` |
| Record here | `HighFpsCapture.tsx` via `AnalyzeVideo.tsx:1457` | In-app record, negotiates 120→60fps, measures real fps | `analyze-video` |
| DelayCam | `DelayCam.tsx` via `AnalyzeVideo.tsx:1474` | In-app record **plus** a 1–55s delayed mirror for self-review | `analyze-video` |
| /pitch-velocity | `PitchVelocityPrep.tsx`, `App.tsx:363`, StaffOnlyRoute | Separate upload + reference-distance form | `pitch-velocity-prep` → `pitch-velocity-measure` |

DelayCam and Record here both record in-app with the same high-fps constraints. The only real difference is the delayed-mirror playback. So it is a *mode*, not a pipeline.

**Where the report card comes from:** `analyze-video` returns `metrics`; `AnalyzeVideo.tsx` renders `HammerReportCard`, which resolves tiles through `getReportCardSpec(sport, module)` and each tile's `compute()` reads `analysis.metrics`. Visibility is filtered by `reportCard/release1.ts` (today only `tempo_sec` and `shoulder_tilt_deg` are visible; hitting fully suppressed).

**The velocity pipeline is genuinely separate.** `pitch-velocity-prep`/`-measure` write `cv_calibration_sessions` / `cv_calibration_frames` / `cv_velocity_measurements`. Calibration is keyed **per video**, and `PitchVelocityPrep` inserts its *own* new `videos` row rather than reusing an analyzed clip. `analyze-video` never reads any `cv_*` table. No report-card tile exists for pitch velocity. The two pipelines share exactly one thing: the `_shared/ballTrackingGate.ts` module.

**Honesty gates today:** server floor 58fps in `ballTrackingGate.ts`; fail-closed (a client claiming eligibility can never open the gate). But only `HighFpsCapture` actually sends `captureFps`/`ballTrackingEligible` — Upload and DelayCam rely on the server's `fps_true` fallback. Also three near-duplicate floor constants (`58` server, `60` in `highFpsCapture.ts:18`, `58` in `classifyFps`).

**Other duplication found:** sport resolution is re-implemented in `PitchVelocityPrep` instead of shared; the on-device ONNX detector (`onDeviceBallDetector.ts`) is hard-disabled and unreferenced.

## Proposed consolidation

### 1. One capture entry point, two honest choices
Replace the 3-card chooser with 2 cards:
- **Record now** — "Your camera records as fast as it can, so the ball stays sharp. Best results."
- **Upload a video I already have** — "Send a clip from your camera roll. Mechanics always work; ball speed needs a fast enough clip."

Inside Record now, a toggle: **Delayed mirror (watch yourself right after each rep)** — off by default. Toggling it swaps in the existing `DelayCam` recorder; both share the same high-fps constraints and the same save/analyze handoff. `captureMode` becomes `choose | record | upload`, with `delayedMirror: boolean`.

### 2. Inline reference distance step
New `CalibrationStep` component shown *after* the athlete has a clip, only when the discipline can produce ball flight (pitching now; hitting later). It pre-fills the standard distance from `leagueDistances.ts` (baseball 60.5ft, softball 43ft), offers a league-level dropdown and manual entry, and has a plain **"Skip — just check my mechanics"**. Skipping is a first-class, non-penalised choice.

### 3. One recording → one report card
- Extract the calibration + measure call sequence out of `PitchVelocityPrep` into `src/lib/cv/velocityRun.ts`, taking an existing `videoId` + `reference_distance_ft`.
- `AnalyzeVideo` runs it alongside `analyze-video` on the same video row when a distance was supplied and the gate is open.
- Merge the result into `analysis.metrics` under a new `pitch_velocity_mph` key with the existing `MetricValue` shape (value/confidence, or `missing` + reason).
- Add a `pitch_velocity_mph` tile to the BP and SP contracts; register it in `release1.ts` (visibility to be set by you — default proposal: visible for staff, `SHOWCASE_FUTURE` for athletes, matching the current pre-release lock).
- `/pitch-velocity` stays as a staff diagnostics page but stops being an athlete-facing path.

### 4. Plain-language everywhere
Every new option, and the velocity tile's missing states, get copy in the `uploadErrorCopy.ts` voice — what happened, why, what to do next. New strings centralised in `src/lib/capture/captureCopy.ts`.

### 5. Gates preserved
- Single floor constant, exported once from `highFpsCapture.ts` and mirrored server-side, removing the 58/60 drift.
- Upload and DelayCam paths start sending `captureFps`/`ballTrackingEligible` explicitly, so the fallback path is a backstop rather than the norm.
- No calibration → velocity reports `missing` with "we don't know the distance", mechanics unaffected.
- Below floor → velocity and any other ball-flight metric report `missing`, mechanics unaffected.

## Notes / assumptions
- Pitch velocity remains **credit-billing and unvalidated**, so per the existing lock I will keep the actual Roboflow call staff-gated; the flow, the tile, and the missing-state copy ship for everyone. Say the word to open it to athletes.
- No changes to `analyze-video`'s mechanics analysis itself.
- The disabled on-device ONNX detector stays untouched.
