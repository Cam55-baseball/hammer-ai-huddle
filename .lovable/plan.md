**Problem:** The replay clip in DelayCam shows a video player but never loads. The root cause is that `MediaRecorder` emits the WebM/MP4 initialization segment (header) only in the very first recorded chunk. The current code (`replayLastN`, the blob fallback, and `saveClip` after trimming) builds a Blob from a tail of the ring buffer without guaranteeing that first header chunk is included, so the browser silently cannot decode the clip.

**Goal:** Make the replay clip (and the delayed blob fallback / save clip) always produce a decodable Blob.

**File to change:** `src/components/analyze/DelayCam.tsx`

### Changes
1. **Preserve the init segment.** Add a `initChunkRef` (ref) to store the first non-empty `MediaRecorder` chunk forever. Never let it be trimmed from the ring buffer.
2. **Fix ring-buffer trimming.** Change the trim loop so it keeps the first (header) chunk and only trims from index 1 onward.
3. **Prepend init segment on every reconstructed Blob:**
   - `replayLastN(n)`: build the replay Blob as `[initChunk, ...selectedTrailingChunks]`.
   - blob-fallback delayed playback: do the same when building the delayed video object URL.
   - `saveClip`: keep the same init-first pattern so the full saved clip is always decodable.
4. **Reset init chunk on cleanup.** When the user stops/restarts, clear the stored init chunk so the next recording starts fresh.
5. **Surface decode errors.** Add an `onError` handler on the replay `<video>` so the user sees a message instead of a silent blank player.

### Out of scope
No changes to recording pipeline, MSE path drift logic, UI layout, or the red dashed border. Pure frontend fix.

### Verification
Run a Playwright script that starts DelayCam on `/analyze/throwing`, waits long enough for the ring buffer to rotate past the first chunk, clicks `Replay 5s`, and confirms the replay `<video>` reaches `readyState >= 2` with a non-zero duration. Screenshot the result.