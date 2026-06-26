## Phase 52 — Video Analysis Restoration Plan

### Root cause hypothesis (to confirm during execution)

DB-level facts gathered:
- `videos` INSERT policy is correct: `WITH CHECK (auth.uid() = user_id)`.
- `videos` storage bucket exists and is public with a correct authenticated-INSERT policy keyed on `auth.uid()` folder.
- `AnalyzeVideo.tsx` sets `user_id: user.id` from `useAuth()` and uploads to `${user.id}/...`.

If the storage upload at line 449 succeeded but the `videos` insert failed RLS, then at the moment of the DB call either:
1. **Session was not present at the Supabase client** (`auth.uid()` returns null) — most likely root cause given current console logs show `hasUser:false, hasSession:false` on the preview origin. The user is signed in on the *published* origin (`hammers-modality.lovable.app`) but the preview origin holds no session, so `useAuth().user` is null when the upload button is reachable, OR the session expired between storage upload and insert.
2. `user.id` from `useAuth()` is stale and does not match the current `auth.uid()`.

Storage upload almost certainly *didn't* actually succeed under anon — the public bucket allows public reads but its INSERT policy requires `auth.uid()`. So either the user was authenticated for storage but the JWT expired before insert (unlikely in the same tick) — or the storage upload also failed and the code's `if (uploadError) throw` path is being masked. We will verify by reading the browser session at upload time.

### Execution steps

1. **Repro with Playwright against the running preview**: load `/analyze`, restore the injected Supabase session (`LOVABLE_BROWSER_SUPABASE_*`), attach a tiny synthetic mp4 fixture (generated via ffmpeg into `/tmp/browser/`) to the file input, click Analyze, capture: `await supabase.auth.getSession()` value just before the failing line, console errors, network 401/403 responses, and the actual error toast. Confirm exact failure mode.

2. **Hard pre-insert auth assertion in `AnalyzeVideo.tsx`** (frontend-only — within Phase 49 scope):
   - Before storage upload AND before `videos` insert, call `const { data: { session } } = await supabase.auth.getSession()`. If `session?.user?.id` is missing or `!== user.id`, abort with a clear toast ("Your session expired — please sign in again.") and `navigate('/auth')`. Eliminates the silent RLS rejection class.
   - Log `[upload] session.user.id`, `useAuth user.id` side-by-side so any future divergence is visible.

3. **Repair anything Playwright surfaces** under the same fix scope:
   - If `getSession()` returns null on the preview origin despite the injected token, ensure `AnalyzeVideo` waits for `isAuthStable` before mounting the uploader (already gated — verify the gate works in build).
   - If `videoError.code === '42501'`, surface the auth assertion above; if it is something else, fix that specific cause.
   - If storage upload itself fails (currently masked by ordering — `uploadError` is thrown but the toast may not distinguish it), differentiate the toast messages between "storage upload failed" vs "database insert failed" so the next failure is diagnosable in one pass.

4. **No schema / RLS changes unless Playwright proves the existing policies are wrong.** The current policies are correct for the intended pattern; rewriting them blindly would mask the real bug.

5. **Edge functions out of scope unless reached.** The reported failure is *before* `analyze-video` is invoked, so this phase does not modify edge functions unless step 1 proves invocation also fails. If it does, fix the specific failure (likely the JWT propagation in `supabase.functions.invoke`).

6. **Verification gate** (all must pass before declaring success):
   - `bunx tsgo --noEmit`
   - `bunx vite build`
   - Playwright run: signed-in upload of a 2-second 720×720 30fps mp4 fixture → `videos` row appears → `currentVideoId` set → analysis runs OR completes — capture screenshots + the final SELECT against `videos` keyed by the inserted id.
   - `psql` SELECT showing the new `videos` row owned by the test user, plus the persisted `video_metric_runs` tempo row (Phase 51 lineage).

7. **Deliverable**: `.lovable/phase-52-video-analysis-restoration.md` containing: confirmed root cause(s) from step 1, exact files changed, before/after evidence per repair, Playwright screenshots, SELECT proof, and the final YES / YES — HUMAN ACTION REQUIRED / NO determination. Required-human-actions section only if Playwright proves a repair cannot be made from code (e.g. provider toggle in Cloud → Users → Auth Settings).

### Files expected to change

- `src/pages/AnalyzeVideo.tsx` — pre-insert session assertion + distinguishable error toasts.
- Possibly one targeted migration *only if* Playwright shows the existing INSERT policy is being evaluated against a role other than `authenticated` (the policy is currently `{public}` which evaluates to all roles including `authenticated`, so this should not be needed — but it's the only DB change in scope if proven necessary).

### Out of scope (Phase 49 trust lock still applies)
No new athlete-facing measurement surfaces. No reintroduction of fabricated `/100` scores. No new metrics.