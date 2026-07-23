# Plan: Migrate Video Analysis Pipeline to Google AI Studio

## Goal
Move the app's video analysis AI calls from Lovable AI Gateway to **Google AI Studio directly**, so Lovable credits are reserved for building. Keep Lovable Gateway as a transparent fallback when Google fails. The first target is the core video analysis pipeline (`analyze-video` and related functions).

## Current state
- `supabase/functions/analyze-video/index.ts` sends sequential frames via `image_url` blocks to `https://ai.gateway.lovable.dev/v1/chat/completions` using `google/gemini-2.5-flash` and tool-calling for structured output.
- `supabase/functions/analyze-video-description/index.ts` is text-only and also uses Lovable Gateway.
- `supabase/functions/analyze-base-stealing-rep/index.ts`, `analyze-realtime-playback/index.ts`, and `reanalyze-videos-for-new-tag/index.ts` are part of the video/playback analysis surface and also use Lovable Gateway.
- `supabase/functions/_shared/googleAi.ts` already exists for the workout-AI migration and provides a `chatCompletion` helper with **Google primary → Lovable Gateway fallback**, but it currently converts `image_url` blocks into JSON-stringified text instead of real Google image parts.
- `GOOGLE_AI_API_KEY` was already added in the previous workout-AI migration.

## Proposed implementation

### Phase 1 — Upgrade the shared helper for true multimodal support
Edit `supabase/functions/_shared/googleAi.ts` so the direct Google path correctly handles `image_url` blocks:
- Detect data-URI frames (`data:image/...;base64,...`) and inline them as `inlineData` parts in the Google `contents` payload.
- Detect HTTPS image URLs and use `fileData` / URI reference where appropriate, or fetch and inline as a fallback.
- Preserve text parts and system instructions.
- Keep Lovable Gateway fallback unchanged.

### Phase 2 — Migrate `analyze-video` (core video analysis)
Refactor `supabase/functions/analyze-video/index.ts`:
- Replace the raw `retryFetch("https://ai.gateway.lovable.dev/v1/chat/completions", ...)` call with `chatCompletion(...)` from `googleAi.ts`.
- Keep the same `messages`, `tools`, `tool_choice`, `temperature`, `seed`, and structured-output schema.
- Adapt response parsing to the `ChatCompletionResult` shape returned by the helper (`result.data.choices[0].message.tool_calls`).
- Preserve the existing `retryFetch` wrapper for transient network errors if needed, or rely on the helper's internal fallback.
- Maintain existing audit/error paths (429/402 classification, video status updates, `video_analysis_runs` outcomes).

### Phase 3 — Migrate `analyze-video-description`
Refactor `supabase/functions/analyze-video-description/index.ts` to use `chatCompletion` with the same system prompt, tool definition, and tag proposal logic. This is text-only, so it requires no multimodal changes.

### Phase 4 — Migrate remaining video/playback analysis functions
Apply the same `chatCompletion` pattern to:
- `supabase/functions/analyze-base-stealing-rep/index.ts`
- `supabase/functions/analyze-realtime-playback/index.ts`
- `supabase/functions/reanalyze-videos-for-new-tag/index.ts`

These functions are inspected and confirmed to use Lovable Gateway for AI calls. The vision-capable ones will benefit from the multimodal helper updates in Phase 1.

### Phase 5 — Deploy and verify
- Deploy the migrated functions (`supabase/functions/analyze-video`, `analyze-video-description`, and the Phase 4 functions) using the standard edge-function deploy flow.
- Confirm the app still successfully analyzes a video end-to-end and returns the same structured fields (`efficiency_score`, `violations`, `summary`, `feedback`, `positives`, `drills`, `scorecard`, `metrics`, `causal_chains`, `roadmap`, etc.).
- Verify fallback behavior by reviewing logs: a deliberate or observed Google failure should route to Lovable Gateway and still produce a valid response.

## Out of scope for this plan
- Food/photo analysis (`analyze-food-photo`, `analyze-hydration-beverage`) are not video analysis; they can be migrated in a follow-up if requested.
- "Ask Hammer" chat / RAG pipeline is a separate surface and is not included here.
- Workout generation (`wk-generate-daily`) is already deterministic and does not use AI; it remains untouched.

## Expected result
Video analysis calls run through Google AI Studio first, reducing Lovable AI credit usage. If Google's API is unavailable or returns an error, the call falls back to Lovable Gateway transparently. No user-facing behavior changes beyond continued reliable analysis.