# Plan: Migrate Ask Hammer to Google AI Studio Direct

## Goal
Move every Ask Hammer conversational backend (`hammer-chat`, `ai-chat`, `hammer-recall`) from Lovable AI Gateway to direct Google AI Studio calls, keeping Lovable Gateway as a transparent fallback only on failure. Preserve the streaming experience in the Progress Dashboard Ask Hammer panel.

## Current state
- `hammer-chat` (`supabase/functions/hammer-chat/index.ts`) — unified Coach Hammer chat, non-streaming, calls `https://ai.gateway.lovable.dev/v1/chat/completions` with `google/gemini-3-flash-preview`.
- `ai-chat` (`supabase/functions/ai-chat/index.ts`) — legacy general coaching chat, supports both streaming (`stream: true`) and non-streaming. Used by `ChatWidget`, `AnalysisCoachChat`, `AskHammerPanel` (streaming), and `RoyalTimingModule` (non-streaming).
- `hammer-recall` (`supabase/functions/hammer-recall/index.ts`) — recall/clarity chat, non-streaming, calls `https://ai.gateway.lovable.dev/v1/chat/completions` with `google/gemini-3-flash-preview`.
- `supabase/functions/_shared/googleAi.ts` exists and already handles direct Google → Lovable fallback for non-streaming, multimodal chat completions. It does not yet expose a streaming helper.
- `GOOGLE_AI_API_KEY` was added in the earlier workout-AI migration and is available to edge functions.

## Proposed implementation

### Phase 1 — Extend `googleAi.ts` for streaming
- Add a new `streamChatCompletion` export in `supabase/functions/_shared/googleAi.ts`.
- It mirrors the same request shape as `chatCompletion` but targets Google's `streamGenerateContent` endpoint.
- On success, return a `ReadableStream`/`Response` shaped as OpenAI-style SSE (`data: {...}\n\n`).
- On non-2xx from Google, fall back to Lovable Gateway's streaming endpoint (`stream: true`).
- If neither provider succeeds, return a response with the final provider's status and body so the caller can surface the right error (429, 402, etc.).
- Keep the existing `chatCompletion` non-streaming API unchanged so `hammer-chat` and `hammer-recall` continue to work with a simple swap.
- Standardize on `google/gemini-3.6-flash` as the Ask Hammer model across all three functions (fallback to the direct model name where Google requires it). The helper's `toGoogleModel` alias table already handles older aliases; it will strip `google/` for the live request.

### Phase 2 — Migrate `hammer-chat`
- Replace the raw `fetch` to Lovable Gateway with `chatCompletion` from `googleAi.ts`.
- Keep the same `messages`, system prompt builder, `temperature`, and CORS headers.
- Parse `result.data.choices[0].message.content` and return `{ reply }` as before.
- Preserve `startHeartbeat` logging: `hb.success()` / `hb.fail()` with the provider used and status.
- Handle `result.ok === false` by returning the same JSON error envelope with status propagation (e.g., 429/402 where applicable).

### Phase 3 — Migrate `hammer-recall`
- Replace the internal `askLLM` fetch with `chatCompletion`.
- Keep the retrieval logic (`retrieveContext`), thread creation/ownership, and message persistence unchanged.
- Return the same `{ threadId, answer, sources }` envelope.
- Maintain the existing `SYSTEM_PROMPT` and `temperature: 0.5`.

### Phase 4 — Migrate `ai-chat` and preserve streaming
- Use `streamChatCompletion` when `stream === true`.
- In the streaming path:
  - On success, return the provider's stream body directly with CORS headers and `Content-Type: text/event-stream`.
  - On failure, return the same 429/402/500 JSON errors the client currently expects.
- In the non-streaming path (`stream === false` or omitted), use `chatCompletion` and return `{ message: ... }` exactly as today.
- Keep all auth, owner-bio lookup, subscription/progress context, season-phase prompt, and hitting doctrine injection unchanged.
- Ensure the CORS `Access-Control-Allow-Headers` still includes the headers sent by the Supabase client (`x-supabase-client-*`).

### Phase 5 — Deploy and verify
- Deploy the three edge functions (`hammer-chat`, `ai-chat`, `hammer-recall`).
- End-to-end smoke tests across the user-facing surfaces:
  - `HammerChat` (dashboard, today plan, report-card dialog) → `hammer-chat`
  - `ChatWidget` → `ai-chat` non-streaming
  - `AnalysisCoachChat` → `ai-chat` non-streaming
  - `AskHammerPanel` (Progress / The General) → `ai-chat` streaming
  - `RoyalTimingModule` → `ai-chat` non-streaming
  - `HammerRecall` page → `hammer-recall`
- Verify structured JSON response shape and streaming word-by-word appearance.
- Verify fallback behavior in edge-function logs: a deliberate or observed Google failure should route to Lovable Gateway and still produce a valid response.

## Out of scope
- Video analysis functions (`analyze-video`, `analyze-video-description`, etc.) were already migrated in the previous turn.
- Workout/generation functions (`wk-generate-daily`, `prescription-engine`, etc.) were already migrated earlier.
- Game-plan / pregame dossier functions (`gp-pregame-plan`, etc.) are not part of the Ask Hammer conversational surface.

## Expected result
Every Ask Hammer chat surface calls Google AI Studio first. Lovable AI credits are used only when Google fails, and only for building. User-facing behavior remains the same, including the streaming dashboard panel.