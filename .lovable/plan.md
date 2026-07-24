Wave 3 — Migrate structured report and plan generators to Google AI Studio

Goal: Move all remaining Wave 3 edge functions from direct Lovable Gateway fetches to direct Google AI Studio calls via the shared `googleAi.ts` helper, keeping Lovable Gateway as a transparent fallback only on failure. This preserves the same request/response parsing logic in each function.

Wave 3 functions (8):
- `generate-drills`
- `generate-block-workout`
- `generate-training-block`
- `populate-drill-instructions`
- `recompute-report-card`
- `generate-vault-recap`
- `gp-pregame-plan`
- `hie-analyze`

Current state:
- All eight functions currently call `https://ai.gateway.lovable.dev/v1/chat/completions` with `Authorization: Bearer <LOVABLE_API_KEY>`.
- `googleAi.ts` already supports OpenAI-shaped `chatCompletion` requests with tools, tool_choice, response_format, and temperature, and transparently falls back to Lovable Gateway if the Google call fails.
- `recompute-report-card` passes `top_p` and `seed` for deterministic scoring, which `googleAi.ts` currently drops before sending to Google.
- `generate-vault-recap` uses `google/gemini-2.5-pro` for the elite recap; `gp-pregame-plan` uses `google/gemini-2.5-flash` with `json_object`.
- `hie-analyze` uses `google/gemini-2.5-flash-lite` (helper maps this alias to `gemini-2.5-flash`).

Plan:

1. Extend `googleAi.ts` to forward `top_p` and `seed`.
   - Map `req.top_p` → `generationConfig.topP`.
   - Map `req.seed` → `generationConfig.seed` when present.
   - This keeps `recompute-report-card` deterministic without requiring any changes in that function.

2. Migrate each Wave 3 function with the same pattern:
   - Add `import { chatCompletion } from "../_shared/googleAi.ts";`.
   - Replace `const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")` / `if (!LOVABLE_API_KEY) ...` checks with a check for either `LOVABLE_API_KEY` or `GOOGLE_AI_API_KEY` (Google is required for the primary path; Lovable is only the fallback).
   - Replace the raw `fetch("https://ai.gateway.lovable.dev/v1/chat/completions", { ... })` block with a `chatCompletion({ ... })` call, preserving the existing `model`, `messages`, `tools`, `tool_choice`, `response_format`, `temperature`, and any new `top_p`/`seed` fields.
   - Replace the existing `response.ok` / `response.text()` error handling with the helper's `ChatCompletionResult` shape: `if (!res.ok) throw new Error(...)` or return the same rate-limit/credit error responses the functions currently emit.
   - Keep the existing response parsing exactly as-is (e.g., `data.choices[0].message.tool_calls[0].function.arguments`, `data.choices[0].message.content`, JSON.parse, regex extraction, fallback builders).

3. Per-function special cases:
   - `generate-drills`: tool-call response → `parsed.drills` loop.
   - `generate-block-workout`: tool-call response → `BlockWorkoutResult` fallback.
   - `generate-training-block`: tool-call response → `GeneratedBlock` validation and scheduling.
   - `populate-drill-instructions`: batched tool-call response → `parsed.instructions` loop with 6-step validation.
   - `recompute-report-card`: tool-call response → `args.metrics` → `validateMetrics`.
   - `generate-vault-recap`: free-form JSON text response → regex parse into `aiContent`.
   - `gp-pregame-plan`: `json_object` response → content strip + JSON parse + save plan.
   - `hie-analyze`: free-form array response → regex parse or fallback week plan.

4. Verify and deploy:
   - Run `supabase--test_edge_functions` on the migrated functions if tests exist.
   - Deploy all 8 functions with `supabase--deploy_edge_functions`.
   - Smoke-test one representative call per function to confirm the Google path returns valid JSON and fallback behavior is never hit under normal conditions.

No UI changes are required; this is purely a backend routing change.