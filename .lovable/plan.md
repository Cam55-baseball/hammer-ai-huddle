## Phase 53 (continued) — Execute the proof now that the athlete is signed in

The user has signed in on the preview. Re-run the full Phase 53 evidence pipeline end-to-end and replace `.lovable/phase-53-authentication-proof.md` with execution-grade results.

### Steps

1. **Re-probe the harness.** Confirm `LOVABLE_BROWSER_AUTH_STATUS=injected` and that `LOVABLE_BROWSER_SUPABASE_SESSION_JSON` + `LOVABLE_BROWSER_SUPABASE_STORAGE_KEY` are now present. If still `signed_out`, stop and tell the user the session didn't inject (most common cause: signed in on the published origin instead of the preview origin).

2. **Build fixture.** Create `/tmp/browser/phase53/fixture.mp4` — a 2-second 720×720 H.264 mp4 via ffmpeg.

3. **Playwright run** (`/tmp/browser/phase53/run.py`, headless Chromium, viewport 1280×1800):
   - Goto preview origin, write injected session JSON into `localStorage` under the injected storage key.
   - Goto `/analyze`. Evaluate `supabase.auth.getSession()` and `supabase.auth.getUser()`; record both ids (redact access_token).
   - Attach fixture to the file input, click Analyze.
   - Capture every relevant network request: `storage/v1/object/videos/...`, `rest/v1/videos`, `functions/v1/analyze-video`, and lineage inserts (`video_landmark_runs`, `video_event_runs`, `video_metric_runs`, `video_analysis_runs`). Record method, status, response body (truncated), and the returned `videos.id`.
   - Screenshot after auth restore, after file attach, after upload completes, and after analysis completes.
   - Save the inserted video id to `/tmp/browser/phase53/video_id.txt`.

4. **Server-side proof.** With the video id from step 3, run `supabase--read_query` SELECTs against `videos`, `video_landmark_runs`, `video_event_runs`, `video_metric_runs`, `video_analysis_runs`. Pull `supabase--edge_function_logs` for `analyze-video` filtered to the invocation window.

5. **Per-stage PASS/FAIL table** assembled from steps 3–4: storage upload, videos insert, edge invocation, Gemini call (from edge logs), pose execution, tempo execution, lineage persistence, athlete response render.

6. **Failure forensics if any stage fails.** Classify exact cause from HTTP status + Supabase error code + edge logs. Fix the smallest possible code defect within scope (no schema changes unless an existing policy is provably wrong), re-run step 3, and re-evaluate.

7. **Write `.lovable/phase-53-authentication-proof.md`** (replace prior contents). Sections: env probe, session/user evidence (redacted), per-stage PASS/FAIL with HTTP evidence, screenshot paths under `/tmp/browser/phase53/screenshots/`, edge-function log excerpt, SELECT proofs, final binary determination.

### Determination rule

- **YES — READY FOR LIMITED BETA** iff every stage in step 5 is PASS *and* SELECTs in step 4 return the expected lineage rows (at minimum: `videos` row owned by the signed-in user; a `video_metric_runs` row containing `tempo_sec` from the deterministic pipeline).
- **NO — SPECIFIC BLOCKER IDENTIFIED** otherwise, with the exact failing stage and remediation owner.

### Out of scope
No new metrics, no Phase 49 trust-lock reversals, no schema changes unless step 6 proves an existing policy is wrong.
