# DelayCam Record/Stream Toggle Redesign

## Goal
Replace the existing "Replay + Save" vs "Stream only" segmented toggle with two clearly labeled action buttons: **Record** and **Stream**. Clicking **Record** starts a normal recording session (delayed mirror + MediaRecorder buffer); clicking **Stream** starts a long-session stream (delayed mirror only). After **Stop** is pressed, the recorded clip remains available for replay and save actions.

## Current state (verified in `src/components/analyze/DelayCam.tsx`)
- A single `Start` button begins the camera.
- A segmented toggle chooses `streamOnly` mode (`Replay + Save` vs `Stream only`).
- Save buttons are disabled when `!running || streamOnly`.
- Replay buttons are disabled when `!running || streamOnly`.
- `stop()` calls `cleanup()`, which clears `timedChunksRef`, `initChunkRef`, and `framesRef`, so no clip survives after stopping.
- The existing buffer leak fix and background-tab pause logic from the previous plan are already present.

## What we will build

### 1. Mode-centric state model
- Introduce a `mode` state with values: `"idle" | "streaming" | "recording"`.
- Remove the boolean `streamOnly` state; migrate all references to `mode`.
- `mode` is only `"idle"` before the camera starts; after start it is either `"streaming"` or `"recording"`.

### 2. Record and Stream start buttons
- Replace the segmented toggle with two primary action buttons in the header:
  - **Record** — starts the camera with `MediaRecorder` running. Use `Video` icon.
  - **Stream** — starts the camera without `MediaRecorder`. Use `Eye` icon.
- When the camera is already running, show a **Stop** button (current destructive style) and also display the current mode as a small badge/status text so the user knows which mode is active.
- Allow switching between modes while running: tapping the inactive start button stops the current session and immediately restarts in the other mode. This satisfies the user's "switch freely" preference without leaving a dead buffer behind.

### 3. Preserve recorded clip after Stop
- Refactor `stop()` so that in `"recording"` mode it stops the camera stream and frame loops but **does not** clear `timedChunksRef`, `initChunkRef`, or `framesRef`.
- In `"streaming"` mode, `stop()` can clear the frame ring buffer (no clip exists to preserve).
- Keep `replayUrl` and `replayUrlRef` intact after a recording stop so the replay player remains visible.
- Add a `stopAndKeepClip()` helper or branch in `stop()` that distinguishes the two modes.

### 4. Enable save/replay after Stop
- Change save button `disabled` logic from `!running` to `mode !== "recording" || timedChunksRef.current.length === 0`.
- Save buttons remain available after stopping a recording session, using the preserved buffer.
- Replay buttons similarly become enabled after stopping a recording, using the same buffer.
- Add a clear guard: if the user starts a new stream or recording, clear the old buffer first (so stale clips from the previous session do not accidentally save).

### 5. UI/UX updates
- Update the status badge to show "Recording", "Streaming", or "Stopped (clip ready)" as appropriate.
- Update tooltips on save buttons: explain they require a Record session when disabled, and that they save the most recent clip.
- Keep the camera/draw loop pause-on-background-tab behavior unchanged; it applies equally to both modes.

### 6. Safety checks
- Ensure `cleanup()` is still used as the full teardown path (e.g., on unmount or on mode switch), but a new `stop()` path is used for the normal Stop-after-Record flow.
- Prevent accidental double-click of Record/Stream by disabling those buttons while the camera is already transitioning.
- Maintain all existing error handling and permissions flow.

## Files to edit
- `src/components/analyze/DelayCam.tsx` — state model, button wiring, stop behavior, save/replay enablement, status badges.

## Out of scope
- No backend changes; storage/analysis logic stays the same.
- No changes to `AnalyzeVideo.tsx` or other callers unless `DelayCam` props need adjustment (they should not).

## Success criteria
- A user sees two buttons: **Record** and **Stream**.
- Clicking **Record** starts the camera and the buffer; the status badge says "Recording".
- Clicking **Stop** stops the camera but leaves the recorded buffer available; the status shows "Stopped (clip ready)" and the save/replay buttons are enabled.
- Clicking **Stream** starts the camera without the buffer; save/replay buttons are disabled while streaming and after stopping a stream.
- Switching modes while running restarts cleanly without leaking old buffers.
- Background-tab pause and long-session memory safety remain intact.
