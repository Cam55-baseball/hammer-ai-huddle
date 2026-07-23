# Plan: Migrate remaining AI functions to Google AI Studio direct, with Lovable fallback

## Goal
Route every remaining AI call in the app through the existing shared `googleAi.ts` helper so Google AI Studio is the primary provider and Lovable AI Gateway is the automatic fallback on failure. This preserves the current user experience while moving runtime AI spend to the Google account.

## Already migrated (no changes needed)
- Video analysis: `analyze-video`, `analyze-video-description`, `analyze-base-stealing-rep`, `analyze-realtime-playback`
- Ask Hammer chat: `hammer-chat`, `hammer-recall`, `ai-chat`
- Hammers Today plan: `generate-warmup`, `prescription-engine`, `coach-hammer-next-step`
- Discovery: `reanalyze-videos-for-new-tag`, `recommend-workout`

## Remaining functions that can be migrated

### Wave 1 — Text-only / chat / high-volume
Fast wins with no image/video payload.
- `ai-helpdesk`
- `parse-food-text`
- `suggest-meals`
- `get-daily-tip`
- `get-daily-lesson`
- `session-insights`
- `calculate-regulation`
- `translate-content`
- `translate-video-content`
- `get-owner-profile`
- `classify-league`
- `hie-team-plan`
- `generate-follower-reports`

### Wave 2 — Structured generation (tool calls) / training blocks
Use `chatCompletion` with OpenAI-style tool schemas that the helper translates to Google function calling.
- `generate-training-block`
- `generate-block-workout`
- `generate-drills`
- `populate-drill-instructions`
- `generate-vault-recap`

### Wave 3 — Game Hub / multimodal
Contain image/video/document payloads and complex JSON extraction.
- `gp-pregame-plan`
- `gp-analyze-ab-swing`
- `gp-ingest-document`
- `gp-ingest-dossier-asset`
- `parse-season-schedule`

### Wave 4 — Nutrition / vision
Photo-based food and beverage analysis.
- `analyze-food-photo`
- `analyze-hydration-beverage`
- `analyze-hydration-text`

## Out of scope (not AI-gateway callers)
- Deterministic functions: `generate-monthly-report`, `suggest-adaptation`, `generate-interventions`, `predict-hammer-state`, most `engine/*` helpers
- Video rendering: `render-promo` (Remotion/Lambda)

## Implementation pattern
For each function:
1. `import { chatCompletion } from "../_shared/googleAi.ts";` (or `streamChatCompletion` if streaming).
2. Replace the raw `fetch("https://ai.gateway.lovable.dev/v1/chat/completions", ...)` block with `await chatCompletion({ model, messages, tools, tool_choice, response_format, temperature, max_tokens })`.
3. Switch from `await response.json()` to `const aiResult = ...; if (!aiResult.ok) { ... } else { aiResult.data }`.
4. Preserve existing 429/402/500 handling and fallback response shapes.
5. Leave model names unchanged; the helper aliases unsupported preview ids to stable Google AI Studio equivalents.

## Shared helper updates
- Add aliases in `googleAi.ts` `toGoogleModel()` for any preview ids not yet mapped, e.g. `gemini-3.1-flash-lite` -> `gemini-2.5-flash`.
- Confirm 60s default timeout works for heavy generators; raise for `generate-vault-recap`, `session-insights`, or `populate-drill-instructions` if logs show timeouts.

## Secrets
- Verify `GOOGLE_AI_API_KEY` is set as a runtime secret (it should already be from the earlier migrations). If missing, add it.
- Keep `LOVABLE_API_KEY` in place; `googleAi.ts` uses it automatically when Google fails or is absent.

## Verification
- Deploy each function and send a representative request (UI flow or `curl` to the Supabase function URL).
- Inspect function logs for `provider: "google"` on success and `provider: "lovable"` only during fallback.
- Watch for 400s caused by unsupported tool schemas and adjust the helper’s schema sanitizer or the alias map if needed.

## Decision for you
Should we migrate all four waves in a single build, or start with Wave 1 (text-only) and validate provider routing before moving to the heavier multimodal functions?

If you approve, I will begin with Wave 1 and roll forward wave by wave, deploying and testing each group before the next.