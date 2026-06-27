## Phase 53 — Authentication Proof Authority

### Objective
Prove via execution evidence whether an authenticated athlete can complete the full upload→analysis pipeline, or identify the exact remaining blocker. Deliverable: `.lovable/phase-53-authentication-proof.md`.

### Execution sequence (single Playwright session, evidence captured at every stage)

1. **Environment probe**
   - Read `LOVABLE_BROWSER_AUTH_STATUS` and the injected `LOVABLE_BROWSER_SUPABASE_*` vars. Record which path applies (`injected`, `signed_out`, `external_unmanaged`, `no_supabase`).
   - Confirm dev server port via `ss -tlnp`.
   - Generate a 2-second 720×720 H.264 mp4 fixture under `/tmp/browser/phase53/fixture.mp4` with ffmpeg.

2. **Auth restore + assertion** (only if status = `injected`)
   - `page.goto("http://localhost:<port>")`, write `LOVABLE_BROWSER_SUPABASE_SESSION_JSON` into localStorage under `LOVABLE_BROWSER_SUPABASE_STORAGE_KEY`.
   - Navigate to `/analyze`. In-page evaluate:
     - `supabase.auth.getSession()` → capture `session.user.id`, `expires_at`.
     - `supabase.auth.getUser()` → capture `user.id`, validation result.
   - Confirm both ids match and `expires_at > now`. Screenshot the analyze page.

3. **RLS uid() proof**
   - Run an authenticated round-trip query from the page: `supabase.from('profiles').select('id').eq('id', user.id).single()` and a `select auth.uid()` via an RPC if available, otherwise infer `auth.uid()` from a successful `videos` insert (step 4).

4. **Upload pipeline — stage-by-stage PASS/FAIL**
   - Attach fixture to the file input, click Analyze.
   - Capture network for each stage with predicates:
     - `storage/v1/object/videos/...` POST (storage upload)
     - `rest/v1/videos` POST (videos insert) — record returned row id
     - `functions/v1/analyze-video` POST — record status + JSON body
     - downstream `video_landmark_runs` / `video_event_runs` / `video_metric_runs` / `video_analysis_runs` inserts
   - Capture console errors and the final toast text via DOM.
   - Screenshot after each major stage.

5. **Server-side persistence proof**
   - Via `supabase--read_query`, SELECT the inserted `videos` row by id, then the lineage rows in `video_landmark_runs`, `video_event_runs`, `video_metric_runs`, `video_analysis_runs` keyed off the video id. Capture row counts and `tempo_sec` value if present.
   - Pull `supabase--edge_function_logs` for `analyze-video` filtered to the invocation timestamp.

6. **Failure-mode forensics (only if any stage fails)**
   - For each failure, classify exact cause from evidence: HTTP status, Supabase error code (e.g. 42501 RLS, 401 JWT), CORS, missing env var, edge-function exception, model asset 404, etc.
   - For an auth-class failure, enumerate the eight specific sub-causes the user listed (origin, cookies, restore, callback, expiry, localStorage key mismatch, URL mismatch, publishable-key mismatch) and prove which one applies by inspecting the exact value that diverges.

7. **Human-action walkthrough (only if Lovable provably cannot proceed)**
   - Concrete URL, account, post-login screen, localStorage key to verify (`sb-wysikbsjalfvjwqzkihj-auth-token`), next action, expected outcome. Written only if step 1 returned `signed_out` or `external_unmanaged`, or if step 2 proved the injected session is invalid for reasons outside code.

8. **Determination**
   - **YES — READY FOR LIMITED BETA** iff steps 2–5 all PASS with persisted lineage rows.
   - **NO — SPECIFIC BLOCKER IDENTIFIED** otherwise, with the exact failing stage, exact error, exact remediation owner (code change vs. human action vs. external dependency).

### Deliverable
Single file `.lovable/phase-53-authentication-proof.md` containing: env probe output, session/user JSON (with access_token redacted), RLS uid proof, per-stage PASS/FAIL table with HTTP evidence, screenshots referenced by path under `/tmp/browser/phase53/screenshots/`, edge-function log excerpt, SELECT proofs, root-cause analysis (if any failure), human-action walkthrough (only if justified), and the binary final determination.

### Out of scope
No new metrics, no Phase 49 trust-lock reversals, no schema changes unless step 6 proves an existing policy is wrong (in which case a single targeted migration is the only DB change).
