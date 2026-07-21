## Problem

On iPhone / iPad Safari, the DelayCam "Delayed" pane never displays anything. iOS Safari does not support `MediaSource`, so DelayCam takes the Blob-URL fallback path. The current fallback rebuilds a `Blob` from a trailing window of `MediaRecorder` chunks and swaps the `<video src>` every 500ms. On iOS Safari this fails for three reasons:

1. Every `src` swap restarts the `<video>` element (reloads metadata, resets `currentTime`), so it can never play through — it just re-loads and looks blank.
2. `MediaRecorder` on iOS Safari 17+ produces MP4, not WebM. Splicing MP4 fragments by concatenating `Blob`s from `ondataavailable` does not produce a valid MP4 (moov/moof boundaries matter). The resulting Blob is often undecodable, which is why the pane stays empty.
3. There is no "always visible" seed clip, so even before enough buffer accumulates the pane shows nothing (no poster, no first-frame paint).

The user asked for one elite target: **smooth continuous delayed mirror**. The right approach on iOS Safari is not to reconstruct MP4/WebM at runtime — it is to render the delayed image directly from a canvas frame ring buffer, which iOS handles reliably and produces a truly seamless N-second delayed mirror with no flicker and no `<video src>` swaps.

## Goal

- iOS Safari (and every other browser): the "Delayed" pane shows a smooth, continuous, exactly-N-seconds-behind mirror of the live feed with no flicker, no restarts, no black frames after the buffer fills.
- Replay 3/5/10/15s and Save clip continue to work using the existing `MediaRecorder` path.
- No changes to the surrounding page, red dashed border, or module placement.

## Approach

Replace the delayed `<video>` element with a delayed `<canvas>` driven by a frame ring buffer captured from the live `<video>` via `requestVideoFrameCallback` (with a `requestAnimationFrame` fallback). This removes MSE and Blob-swap entirely from the delayed-mirror path.

Keep `MediaRecorder` running only to power **Replay Last Ns** and **Save clip** (which already work with the init-segment fix).

### Design

1. **Frame ring buffer**
   - On `start`, after `getUserMedia`, attach the stream to the hidden live `<video>`.
   - Allocate an offscreen `<canvas>` sized to the video's `videoWidth × videoHeight` (capped at 720p for memory).
   - Use `liveVideo.requestVideoFrameCallback(cb)` when available; otherwise `requestAnimationFrame`.
   - In `cb`: draw the current frame to the offscreen canvas, then copy pixels into a ring buffer entry `{ bitmap: ImageBitmap, t: performance.now() }` created via `createImageBitmap(offscreen)`.
   - Cap ring buffer length by time (`MAX_BUFFER_SEC = 55s`) — evict oldest entries. Also cap by count (safety) at ~55 × 30 = 1650 frames.

2. **Delayed render loop**
   - Replace the delayed `<video>` element with a visible `<canvas ref={delayedCanvasRef}>` sized identically.
   - Every animation frame, compute `targetT = performance.now() - delay * 1000` and pick the ring buffer entry with `t` closest to `targetT` but not greater. `drawImage(bitmap, 0, 0)` onto the delayed canvas.
   - Because we draw directly, there is no `<video src>` swap, no metadata reload, and no flicker. This works identically on iOS Safari, Android Chrome, and desktop.

3. **Buffer readiness UI**
   - Track `bufferedSec = latestT - oldestT`. Reuse the existing "Buffer Xs" indicator.
   - Before `bufferedSec >= delay`, render a small "Filling buffer… Xs / delay Ys" overlay on the delayed canvas instead of leaving it black.

4. **Keep MediaRecorder for replay/save only**
   - Do not remove the current recorder logic — Replay Last Ns and Save clip already use `initChunkRef` + `buildDecodableBlob` and work in Chromium. They will also work on iOS Safari for saved MP4 clips (MP4 written by `MediaRecorder` end-to-end is decodable; only mid-stream splicing was fragile).
   - No changes to the ring-buffer trimming for `timedChunksRef` beyond what already exists.

5. **Cleanup**
   - On `stop`/unmount, cancel the frame callbacks, `close()` each cached `ImageBitmap`, and clear both buffers.

### File to change

- `src/components/analyze/DelayCam.tsx` — replace the delayed `<video>` with a delayed `<canvas>`, add the frame ring buffer + render loop, delete the MSE branch and the Blob-URL fallback interval that swaps `<video src>` (both are obsolete once the canvas mirror is in place). Keep `MediaRecorder` for replay/save.

### Out of scope

- No changes to the analysis pipeline above DelayCam.
- No changes to page layout, header, red dashed border, or delay slider UI.
- No new dependencies.
- No changes to Replay/Save UX beyond ensuring they still work.

## Verification

1. TypeScript passes.
2. Playwright script on `/analyze/throwing`: Start DelayCam, wait 8 seconds, then verify:
   - The delayed canvas is being repainted (non-zero pixel diff between two samples 500ms apart).
   - "Buffer Xs" ≥ 5s.
3. Manual iOS Safari check by the user (headless can't reproduce iOS Safari codec behavior) — confirm the Delayed pane shows a smooth continuous mirror ~N seconds behind the Live pane, with no flicker and no restarts.
