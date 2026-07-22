## Current state

DelayCam (`src/components/analyze/DelayCam.tsx`) is client-only:
- Records live camera via `MediaRecorder` into a rolling buffer.
- Renders a 1–55s delayed mirror on a canvas.
- Offers "Save clip" which downloads the buffer as a local `.webm`/`.mp4` file.
- Does **not** upload to backend, insert into `public.videos`, or trigger analysis.

Players Club (`src/pages/PlayersClub.tsx`) and the video analysis flow (`src/pages/AnalyzeVideo.tsx`) already use the `videos` storage bucket and the `public.videos` table with `status`, `ai_analysis`, `mocap_data`, etc.

## Goal

Make DelayCam clips first-class library assets:
- Save to Players Club (storage + `videos` row).
- Analyze the saved clip with Hammer via a separate "Save & Analyze" action.
- Keep the existing local download-to-phone option.
- Infer the correct module (hitting / pitching / throwing) from the context in which the user opened DelayCam.

## Plan

### 1. Make DelayCam context-aware
- Add a `module` prop to `DelayCam` that accepts `'hitting' | 'pitching' | 'throwing'`.
- In `AnalyzeVideo.tsx`, pass the module that corresponds to the current analysis context (e.g., hitting analysis → `'hitting'`).
- In `HammerDailyPlan.tsx`, if DelayCam is rendered there, pass a module derived from the current card/discipline context.
- Default fallback remains `'hitting'` only when no context is available.

### 2. Add Save and Save & Analyze actions to DelayCam
- Add two new buttons next to the existing "Save clip" button:
  - **"Save to Players Club"** — uploads the clip and inserts the row, then sets `status = 'completed'`.
  - **"Save & Analyze"** — uploads the clip, inserts the row, then triggers the same analysis job used by `AnalyzeVideo.tsx` and sets `status = 'processing'`.
- Both buttons build the same decodable blob from the rolling buffer (`buildDecodableBlob`).
- Upload the blob to the `videos` storage bucket under `{userId}/delaycam/{uuid}.{ext}`.
- Generate a thumbnail via the existing `generateVideoThumbnail` helper.
- Insert a `public.videos` row with:
  - `sport`: current user's selected sport (from `SportThemeContext` / profile default).
  - `module`: the `module` prop passed to DelayCam.
  - `status`: `'completed'` for Save, `'processing'` for Save & Analyze.
  - `video_url`, `thumbnail_url`, `library_title`: auto-generated like "DelayCam replay — {timestamp}".
- Show progress toast and success/error feedback.

### 3. Implement the analysis trigger path
- Reuse the same analysis invocation used by the normal video upload flow in `AnalyzeVideo.tsx` (edge function or DB RPC).
- After Save & Analyze, poll or subscribe to the `videos` row for `status` transitions (`processing` → `completed`/`failed`).
- Surface results in Players Club like any other analyzed video.
- If analysis fails, leave the clip in the club with a clear "Analysis failed" badge and retry action.

### 4. Preserve local download
- Keep the existing **"Save clip"** button unchanged so users can still save the raw delayed video directly to their phone / desktop.

### 5. UX hardening
- Disable the save-to-club and save-and-analyze buttons until the buffer has enough content.
- Add a confirmation/dialog before saving to let the user edit the auto-generated title and confirm the inferred module/sport.
- Ensure camera permission errors and upload failures are surfaced with toast messages, not silent failures.
- Reuse existing side-context / handedness data if relevant, matching the recent side-aware profile split.

### 6. Verification
- Manual end-to-end check: open DelayCam in a hitting context → start → wait for buffer → "Save to Players Club" → confirm row appears in `/players-club`.
- Test "Save & Analyze" → confirm status moves to `processing` and then `completed` with `ai_analysis` populated.
- Verify local download still works.
- Confirm no regressions in the existing AnalyzeVideo upload flow.

## Outcome

Users will be able to:
- Record a delayed replay in DelayCam.
- Save it directly to their Players Club library with the correct module tag.
- Save and analyze it with Hammer, then view the results in Players Club.
- Download the raw clip to their phone as before.