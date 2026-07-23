DelayCam Players Club Save — E2E Fix Plan

Root cause (verified by reading code + DB)
- `DelayCam` inserts a `videos` row but never sets `saved_to_library = true`. `get-player-library` filters with `.eq('saved_to_library', true)`, so the saved clip is invisible in Players Club.
- The `videos` row is also missing the Phase 0 metadata fields (`sha256_hex`, `fps_true`, `duration_sec`, `width`, `height`, `orientation`) that the `analyze-video` edge function now requires before it will run.
- The current "Save & Analyze" call only sends `videoId/module/sport/userId`, but `analyze-video` requires `frames` (≥3 data URLs) + `frameExtractions`.
- No side confirmation/stamp for switch hitters or ambidextrous throwers.

What I will build
1. Probe metadata before saving
   - In `saveToPlayersClub`, convert the recorded blob into a `File` and run `probeVideoMetadata()` from the existing analysis pipeline.
   - Validate width, height, fps, and duration against the same thresholds in `src/lib/biomech/videoAcceptance.ts` used by the upload flow.
   - If validation fails, show a specific toast and abort before any storage/database write.

2. Write a complete `videos` row that Players Club can see
   - Add `saved_to_library: true`.
   - Persist `sha256_hex`, `fps_true`, `duration_sec`, `width`, `height`, `orientation`.
   - Keep `library_title` and `thumbnail_url` as-is.

3. Side-aware save gate
   - Pull `useSideContext()` inside `DelayCam` to determine the active discipline (`hit` for `hitting`, `throw` for `pitching`/`throwing`).
   - If the picker should show for that discipline, require an explicit side selection before save and stamp `batting_side` or `throwing_hand` on the insert.
   - If a non-switch/non-ambi athlete saves, the side is derived from their profile and stored as well.

4. Make "Save & Analyze" actually run analysis
   - After the `videos` row is inserted, call `extractKeyFramesDeterministic()` with the probed metadata.
   - Build the `frameExtractions` array and pass it plus the `frames` data URLs to `supabase.functions.invoke('analyze-video', …)`.
   - `landingTime` is not available in DelayCam, so `landingFrameIndex` will be `null` (the edge function accepts this).
   - Show a "Saving…" → "Analysis running…" → success/error toast sequence.

5. Auth/session guard before upload
   - Mirror the `AnalyzeVideo` pre-upload check: call `supabase.auth.getSession()` and verify the live user matches the `user` from the hook before uploading. If not, show the same "Your session expired" toast with a sign-in action instead of silently kicking the user out.

6. UI polish
   - Disable save buttons while saving/analyzing.
   - Add a clear "No clip recorded" state and a "Confirm your side" prompt when needed.

7. Verification
   - Use a Playwright test to record a short DelayCam clip in `/analyze-video/:module`, click "Save to Players Club", and assert the clip appears in the `/players-club` grid.
   - Run a second test for "Save & Analyze" and confirm the video row reaches `status = 'completed'` and `ai_analysis` is populated.

Files to touch
- `src/components/analyze/DelayCam.tsx` (main fix)
- `src/pages/AnalyzeVideo.tsx` (no major change; confirm it still passes `module` and `sport` correctly to `DelayCam`)
- No DB/edge function migrations needed; the existing `videos` table and `analyze-video` function already support these fields.

Risk notes
- Probing + frame extraction for a 55-second clip is CPU-heavy; we will only run it for "Save & Analyze", not for plain "Save to Players Club".
- The recorded blob is typically WebM; the acceptance thresholds already handle WebM/MKV from phone cameras.