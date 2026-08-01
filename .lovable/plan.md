## Goal

Runtime AI = Google Gemini (primary) → OpenAI (fallback). Lovable AI Gateway is removed from all runtime paths, so Lovable credits are spent only on building.

## Current state (verified)

- `supabase/functions/_shared/googleAi.ts` is the single AI client: `chatCompletion()` tries Google with `GOOGLE_AI_API_KEY`, then falls back to `callLovable()` using `LOVABLE_API_KEY` against `ai.gateway.lovable.dev`. It has a matching streaming path with the same Google → Lovable fallback.
- 42 edge functions import this helper; 36 of them also reference `LOVABLE_API_KEY` (mostly credential-presence checks / legacy error text).
- `exercise-log-coach/index.ts` still calls the Lovable Gateway URL directly, bypassing the helper.
- No embeddings or gateway image-generation calls exist, so only chat + streaming need repointing.

## Changes

1. **Add `OPENAI_API_KEY` secret.** You'll get a key from platform.openai.com and paste it into the secure form; it stays server-side.

2. **Rewrite the fallback in `googleAi.ts`.**
   - Replace `callLovable()` with `callOpenAI()` hitting `https://api.openai.com/v1/chat/completions` with `Authorization: Bearer $OPENAI_API_KEY`. The helper already speaks OpenAI's request/response shape, so the body passes through nearly unchanged.
   - Add a model translator `toOpenAIModel()` mapping the Gemini ids callers pass (`google/gemini-*-flash`, `*-pro`) to OpenAI equivalents — Flash workloads → `gpt-4o-mini` (cheapest capable), Pro/report workloads → `gpt-4o`. Unknown/`openai/`-prefixed ids pass through.
   - Same swap on the streaming path: fall back to OpenAI's SSE stream, which is already the wire format the helper emits.
   - `provider` field becomes `"google" | "openai" | "none"`; error path returns `no_ai_credentials` only when both keys are missing.

3. **Repoint `exercise-log-coach`** to use `chatCompletion()` from the shared helper instead of its direct gateway fetch.

4. **Purge `LOVABLE_API_KEY` from the 36 edge functions** — remove the presence checks and rewrite the error messages to reference the Google/OpenAI credentials instead. No behavior change beyond the credential names.

5. **Verify**: run the type/lint check, then invoke a representative function (e.g. `get-daily-tip`) twice — once normally (Google path) and once with the Google key forced to fail — to confirm the OpenAI fallback returns a valid completion. Confirm via AI Gateway logs that no new runtime requests appear.

## Notes

- Nothing about how features behave changes; only which provider serves a request when Google errors out.
- If you'd rather use a different OpenAI tier than `gpt-4o-mini`/`gpt-4o` for the fallback, say so and I'll set that instead.
