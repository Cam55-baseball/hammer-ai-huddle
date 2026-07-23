Goal
Move the AI usage that powers the Hammers Today Plan workout pipeline from Lovable AI Gateway to your own Google AI Studio key (`gemini-2.5-flash`). Lovable credits will then be used only for building, while Google handles the runtime AI spend. Lovable AI Gateway will remain as a transparent fallback if Google fails.

Current state verified
- `supabase/functions/wk-generate-daily/index.ts` is deterministic; it does not directly call Lovable AI.
- The actual AI calls in the workout chain live in: `generate-warmup`, `prescription-engine`, `recommend-workout`, and `coach-hammer-next-step`.
- Those functions currently POST to `https://ai.gateway.lovable.dev/v1/chat/completions` with models like `google/gemini-2.5-flash`, `google/gemini-3-flash-preview`, etc.

Phase 1 — Secrets & shared Google AI helper
- Add a runtime secret `GOOGLE_AI_API_KEY` via the secure form.
- Create `supabase/functions/_shared/googleAi.ts` with a single helper:
  - `chatCompletion({ model, messages, temperature, responseFormat? })` returning text/JSON.
  - Maps Lovable-style aliases to direct Google model IDs, e.g. `google/gemini-2.5-flash` → `gemini-2.5-flash`.
  - Calls the Google Generative Language API (`https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`).
  - Handles 429, 401, 5xx, malformed JSON, and provider errors.
  - On Google failure, transparently falls back to the existing Lovable Gateway call using `LOVABLE_API_KEY` so the app stays live.
- Leave `LOVABLE_API_KEY` in place for fallback and for other Lovable services (email, connectors, etc.).

Phase 2 — Migrate the workout chain
- Replace every raw Lovable Gateway fetch in:
  - `supabase/functions/generate-warmup/index.ts`
  - `supabase/functions/prescription-engine/index.ts`
  - `supabase/functions/recommend-workout/index.ts`
  - `supabase/functions/coach-hammer-next-step/index.ts`
- If `wk-generate-daily/index.ts` has any direct AI call discovered during migration, replace it too.
- Preserve CORS, auth, heartbeat logging, audit rows, and error response shape so the UI needs no changes.
- Convert response parsing from Lovable/OpenAI shape to Google API shape (or wrap via AI SDK Google provider if Deno compatibility checks pass).

Phase 3 — Client-side cache invalidation
- Bump `WK_GENERATOR_VERSION` in `src/hooks/useWkDailyPrescriptions.ts` so every athlete’s plan regenerates with the new AI source.
- Keep existing error handling; it will now receive clearer provider messages instead of gateway-wrapped errors.

Phase 4 — Verify
- Deploy the migrated functions.
- Run a real plan generation for a test athlete and inspect `supabase--edge_function_logs` for `wk-generate-daily` and `generate-warmup`.
- Confirm the fallback path works by temporarily invalidating the Google key in a non-production test.

Out of scope for this plan
- Video analysis (`analyze-video`, `analyze-realtime-playback`, `analyze-video-description`, `reanalyze-videos-for-new-tag`) and Ask Hammer (`hammer-chat`, `ai-chat`) will be migrated in separate plans after this one is approved and verified.

What you need to do
Approve this plan, then enter your Google AI Studio API key when the secure form appears. I will then switch to build mode and start Phase 1.