Goal: Allow athletes to leave DelayCam open for extended practice sessions (hours) with only the delayed mirror active, without draining battery or filling memory from an always-on recorder.

Current state
- `src/components/analyze/DelayCam.tsx` starts `MediaRecorder` on every `start()` call and keeps it running (250 ms slices) so "Replay Last N" and "Save clip" work instantly.
- `timedChunksRef` has a memory leak: the init segment at index 0 is never evicted, so the blob array grows forever while the camera is on.
- Frame capture runs at camera frame rate (~30 fps) and stores up to `MAX_FRAMES` ImageBitmaps (up to 720p). This is fine for minutes but heavy for hours.
- No `document.visibilitychange` handling: when the tab is backgrounded, `requestAnimationFrame` throttles and the delayed mirror can freeze or desync.

What we will build
1. **Stream-only toggle**
   - Add a switch/segmented control in the DelayCam header: "Stream only" vs "Replay + Save".
   - In Stream-only mode, `MediaRecorder` is **never started**. The delayed mirror still works; replay and save buttons are disabled until the user switches to Replay+Save mode.
   - This eliminates the continuous blob accumulation and the init-chunk leak.

2. **Power-aware frame capture**
   - In Stream-only mode, drop the capture frame rate to 15 fps by skipping frames via `requestVideoFrameCallback` (counter-based, not timer-based) or a `setInterval` fallback.
   - In Replay+Save mode, capture at the native rate so instant replay is smooth.

3. **Background tab handling**
   - Listen to `document.visibilitychange`.
   - When the tab becomes hidden, **pause the delayed render loop** and reduce the frame capture loop to a minimal keep-alive state (or stop it entirely). When the tab becomes visible again, resume from the current camera feed without requiring a manual restart.
   - Add a small status badge: "Paused (tab hidden)" so the user knows why the mirror stopped.

4. **Fix recorder blob leak**
   - Correct the eviction logic so the init segment is not retained indefinitely. When all chunks older than `MAX_BUFFER_SEC` are gone, also reset `initChunkRef`.
   - Cap the total in-memory blob size to the same 55-second window.

5. **UI/UX updates**
   - Replace the single "Recording" badge with a more descriptive state: "Streaming", "Recording buffer", or "Paused (background)".
   - Disable "Replay", "Save to device", "Save to Players Club", and "Save & Analyze" while in Stream-only mode, with a tooltip explaining they require Replay+Save mode.

Files to edit
- `src/components/analyze/DelayCam.tsx` — add the mode toggle, conditional recorder start, frame-rate decimation, visibility handling, and status badge updates.

Out of scope
- No backend changes; storage/analyze logic remains unchanged.
- No changes to `AnalyzeVideo.tsx` unless we decide to expose the default mode as a prop later.

Success criteria
- A user can start DelayCam in Stream-only mode, leave it open for an hour, and return to a responsive delayed mirror with no memory growth from blobs.
- Switching to Replay+Save mode restores the current instant-replay and save behavior.
- Backgrounding the tab does not crash the camera or desync the delay; foregrounding cleanly resumes.