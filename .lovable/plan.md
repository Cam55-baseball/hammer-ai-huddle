
## Goal

Add a DelayCam (instant-replay) module directly beneath the analysis section on the Analyze Video page. Live camera feed records into a rolling buffer and plays back on a delay of 1–55 seconds. Game IQ playback stays untouched.

## Deliverables

### 1. New component `src/components/analyze/DelayCam.tsx`

Self-contained, no backend, no uploads.

- Uses `navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false })`.
- Live preview `<video>` (muted, playsInline, autoplay) shows the current camera feed.
- Delayed `<video>` shows the same feed N seconds later.
- Rolling buffer via `MediaRecorder` writing timesliced chunks (e.g. 250 ms) into a ring buffer sized to `delaySeconds + 5s` headroom. Delayed player consumes buffer chunks after `delaySeconds` elapsed, using `MediaSource` + `SourceBuffer` for continuous playback (fallback: rebuild a Blob URL from the last-N-seconds window every tick if MSE unsupported).
- On mount: enumerate devices, default to rear camera on mobile.

### 2. Controls

- Big Start / Stop toggle.
- Camera switch button (front/back) when >1 video input.
- Delay slider 1–55 s (step 1) with live numeric readout.
- Quick preset chips: 3s, 5s, 10s, 20s, 30s, 45s.
- "Save last clip" button — dumps current buffer to a downloadable `.webm`.
- Status line: "Recording • Delay 8s • Buffer 12s".

### 3. Placement

Edit `src/pages/AnalyzeVideo.tsx` — insert `<DelayCam />` in a bordered `Card` immediately below the existing analysis section, with a header "DelayCam — Instant Replay" and a one-line explainer ("Live camera with adjustable 1–55s playback delay for self-review").

### 4. Permissions / errors

- Ask for camera permission on Start (not on mount).
- Handle `NotAllowedError`, `NotFoundError`, `NotReadableError` with inline messaging + retry button.
- Cleanup: stop tracks, revoke object URLs, close MediaSource on unmount and on Stop.

### 5. Not touched

- Game IQ playback engine, `IqDiamond`, `playTimeline`, `playGenerator`.
- Existing video analysis upload/analysis pipeline.
- Auth, routing, database.

## Technical notes

- Pure client-side; no new tables, no edge functions, no dependencies.
- Rolling-buffer approach: keep an array of `{ chunk: Blob, t: number }`; drop entries older than `delaySeconds + headroom`; feed the oldest-eligible chunks into the delayed player's `SourceBuffer`.
- When the user drags the slider longer, buffer grows; when shorter, extra chunks are flushed and the delayed player fast-forwards to the new target offset.
- Works in modern Chromium/Safari/Firefox; iOS Safari requires `playsInline` and a user gesture to start — Start button satisfies that.
- Respect existing design tokens; no hardcoded colors.

## Acceptance

- Analyze Video page shows the DelayCam card below the analysis section.
- Pressing Start prompts for camera, then shows live + delayed feeds side-by-side (or stacked on mobile).
- Adjusting the slider between 1 and 55 seconds visibly changes the replay lag within ~1 second.
- Presets snap the slider and update the delay immediately.
- Stop releases the camera; no console errors on unmount.
- Game IQ "Watch the play" still works exactly as before.
