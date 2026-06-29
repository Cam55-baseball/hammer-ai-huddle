# Why analysis failed

Your clip was **320×568** (a compressed phone export). The backend's Phase-1 acceptance gate requires **≥480×480**, so it returned a 422 `reject_low_resolution`. The UI swallowed the structured reason and showed only "Edge Function returned a non-2xx status code".

# Fix (two parts)

### 1. Surface the real reason in the UI
In `src/pages/AnalyzeVideo.tsx` (the `handleUploadAndAnalyze` catch block), parse the structured error payload from `supabase.functions.invoke` (it's on `error.context.response` / `FunctionsHttpError`) and map known reasons to friendly messages:

- `reject_low_resolution` → "This clip is too small (e.g. 320×568). Please upload a higher-resolution version — at least 360×360. Re-exporting from your camera roll instead of sharing from a messaging app usually fixes this."
- `reject_low_fps` → "Video frame rate is too low (need ≥24 fps)."
- `reject_duration_out_of_bounds` → "Clip must be 0.5–60 seconds."
- `reject_excessive_dropped_frames` → "Too many frames couldn't be read. Try re-exporting the clip."
- `missing_video_sha256` / `missing_probe_metadata` → "Upload didn't finish probing — try again."
- fallback → existing generic toast.

Also add the reason to the `AnalysisProgressIndicator` failure card so users see it inline (not just a toast).

### 2. Relax the resolution gate to match phone reality
Both server and client mirror the threshold; lower both from 480 → **320** (still high enough for BlazePose Full to land reliable landmarks; the 480 ceiling was overly defensive). Files:

- `supabase/functions/analyze-video/index.ts` — `PHASE1_MIN_WIDTH` and `PHASE1_MIN_HEIGHT` from `480` → `320`.
- `src/lib/biomech/videoAcceptance.ts` — `MIN_WIDTH` and `MIN_HEIGHT` from `480` → `320`. (Keeps the constitutional invariant that client + server agree.)

No changes to fps/duration/dropped-frame gates. Cache-fingerprint inputs are unaffected (resolution isn't part of the fingerprint).

### 3. Add a one-line preflight on the client
Before invoking the edge function, check `videoWidth`/`videoHeight` against `MIN_WIDTH`/`MIN_HEIGHT` and short-circuit with the same friendly message — saves a server round-trip and a `rejected` audit row when the user could fix it locally.

# What's untouched
- Determinism / replay contract (audit row still written for every outcome).
- Tempo/landmark pipelines.
- All other scorecard logic, prompts, models.

# Verification
- Re-upload the same 320×568 clip → analysis runs to completion.
- Upload a deliberately tiny 240×240 clip → user sees the friendly resolution message inline, not "non-2xx".
- Typecheck passes; existing `videoAcceptance` tests updated to new thresholds.
