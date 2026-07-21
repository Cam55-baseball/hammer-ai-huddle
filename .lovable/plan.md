## Problem

DelayCam crashes on iOS Safari with `Can't find variable: MediaSource`. iPhone Safari historically ships without `window.MediaSource` (only `ManagedMediaSource` on iOS 17.1+), so the current MSE-first path throws immediately on Start. The plan already called for a Blob-URL fallback, but it isn't wired.

## Fix

Update `src/components/analyze/DelayCam.tsx` only.

1. **Feature-detect at Start**, before touching MSE:
   - `const MSE = window.MediaSource ?? (window as any).ManagedMediaSource ?? null;`
   - `const mseOk = !!MSE && MSE.isTypeSupported?.(mimeType);`
2. **If MSE is available** — keep current SourceBuffer path (prefer `ManagedMediaSource` when that's what exists; attach via `srcObject` for ManagedMediaSource, else `URL.createObjectURL`).
3. **If MSE is unavailable (iOS Safari fallback)** — run in Blob-URL mode:
   - Keep the existing `{chunk, t}` ring buffer.
   - Every ~500 ms, take chunks whose age ≥ `delaySeconds`, concatenate into a single `Blob`, set `delayedVideo.src = URL.createObjectURL(blob)`, `play()`, and revoke the previous URL on the next swap.
   - Show a small status note: "Delayed playback (fallback mode)".
4. **MIME selection** — pick the first supported of `video/mp4;codecs=avc1.42E01E` (Safari), `video/webm;codecs=vp9,opus`, `video/webm;codecs=vp8,opus`, `video/webm`. Use `MediaRecorder.isTypeSupported`.
5. **Error surfacing** — wrap Start in try/catch; on failure show the existing inline error card with the actual message + Retry, instead of throwing to the console.
6. **Cleanup** — revoke any active blob URL on Stop/unmount in both modes.

No other files change. Game IQ playback and the analysis pipeline stay untouched.

## Acceptance

- On iPhone Safari, pressing Start no longer throws; live preview shows and delayed video plays ~N seconds behind (fallback mode).
- On Chromium/desktop Safari 17+, MSE path still runs smoothly with continuous playback.
- Slider 1–55 s and presets still adjust delay in both modes.
- Stop fully releases camera and revokes URLs; no console errors.
