### Problem
- `/analyze/throwing` still shows the old Real-Time Playback card, which is redundant now that DelayCam exists.
- DelayCam currently only previews the camera feed; it does not actually record, delay, or replay footage for users.

### Plan

#### 1. Retire Real-Time Playback surface
- `src/pages/AnalyzeVideo.tsx`
  - Remove the `RealTimePlaybackCard` import and its render.
  - Keep `DelayCam` in place directly beneath the analysis section.
- Delete `src/components/RealTimePlaybackCard.tsx` and `src/components/RealTimePlayback.tsx` (no other references remain).

#### 2. Make DelayCam actually replay E2E
- `src/components/analyze/DelayCam.tsx`
  - Add a real `MediaRecorder`-based capture pipeline: store recorded `Blob` chunks in a rolling buffer with timestamp metadata.
  - Implement a trailing-window buffer that keeps the last 55s of footage (configurable).
  - When the user sets a delay of N seconds, play back the chunk that is N seconds behind the live edge.
  - Add a **Replay last Ns** button that plays the most recent N seconds of buffered footage on demand.
  - Add **Save clip** to export the buffered segment as a downloadable `.webm` file.
  - Ensure the delayed pane updates continuously when delay is active; do not leave it blank.
  - Handle iOS Safari where `MediaSource` is unavailable by using a Blob-URL fallback player.
  - Keep existing camera selection, flip, permission, error surfacing, and cleanup.

#### 3. Clean up
- Verify no other imports reference `RealTimePlaybackCard` or `RealTimePlayback`.

### Acceptance
- `/analyze/throwing` no longer shows the Real-Time Playback card; only DelayCam appears under analysis.
- Pressing Start begins recording; the buffer indicator climbs.
- Pressing **Replay last Ns** plays back the trailing footage on both desktop Chrome/Safari and iPhone Safari.
- Save clip downloads a playable file.
- Stop fully releases the camera and revokes URLs.
