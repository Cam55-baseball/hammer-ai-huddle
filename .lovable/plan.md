Wave 1 (text-only functions) is deployed and using Google AI Studio with Lovable Gateway fallback. We now move to the next wave of functions that still call `ai.gateway.lovable.dev` directly.

## Wave 2 scope — Multimodal / vision / document ingestion

Migrate the remaining 8 functions that handle images, video, documents, or external URLs to `supabase/functions/_shared/googleAi.ts`, with Google AI Studio as primary and Lovable Gateway as automatic fallback.

Functions in Wave 2:

1. `analyze-food-photo` — photo of food → macro/nutrition analysis (image + text)
2. `analyze-hydration-beverage` — beverage label/photo → hydration analysis (image + text)
3. `analyze-hydration-text` — typed hydration log → structured hydration feedback (text + JSON)
4. `gp-analyze-ab-swing` — at-bat video clip + pitcher dossier → swing mechanics JSON (video + text + tools)
5. `gp-ingest-dossier-asset` — pitcher/hitter intel from screenshot, CSV, PDF, video frames, or notes (multimodal + JSON)
6. `gp-ingest-document` — document ingestion for game-plan/scouting material (text + structured extraction)
7. `parse-season-schedule` — text or photo of schedule → structured calendar events (text + image + tool calling)
8. `parse-recipe-url` — URL fetch + HTML → structured recipe JSON (text + structured output)

## What changes

- Replace raw `fetch("https://ai.gateway.lovable.dev/v1/chat/completions", ...)` with `chatCompletion(...)` from `../_shared/googleAi.ts`.
- Preserve existing request shapes (messages, tools, tool_choice, response_format, temperature, model strings like `google/gemini-2.5-flash`).
- For image/video/document inputs, pass them as OpenAI-style `content` blocks (`image_url`, `input_audio`, text). `googleAi.ts` already translates these to Google's inline-data / file parts.
- Maintain structured output by keeping `response_format: { type: "json_object" }` or tool-calling schemas; `googleAi.ts` sets `responseMimeType: application/json` when needed.
- Keep existing auth, subscription/role checks, heartbeat wrappers, CORS headers, and Supabase client setup unchanged.
- Add a 45–60 second timeout per call (via `chatCompletion({ timeoutMs: 60_000 })` or `streamChatCompletion` where streaming is already used).

## Validation

After each function is migrated and deployed, test the representative path:

- `analyze-food-photo` — send a base64 image and verify nutrition JSON is returned.
- `parse-season-schedule` — send text schedule and verify `events[]` JSON is returned.
- `gp-analyze-ab-swing` — upload a test video and verify `mechanics_json` + `drills` JSON is returned.
- Confirm in function logs that the provider is `google` when `GOOGLE_AI_API_KEY` is present, and that calls only fall back to `lovable` on a Google failure.
- Confirm no regressions in response shape expected by the React callers.

## Deployment order

1. Update the 8 functions in parallel batches where there are no dependencies.
2. Deploy via `supabase--deploy_edge_functions`.
3. Run targeted tests for each migrated function.
4. Report Wave 2 completion and propose Wave 3 (remaining structured report/plan generators: `generate-drills`, `generate-block-workout`, `generate-training-block`, `populate-drill-instructions`, `recompute-report-card`, `generate-vault-recap`, `gp-pregame-plan`, `hie-analyze`).

## Notes

- `GOOGLE_AI_API_KEY` is already configured; no new secrets are needed.
- The `googleAi.ts` helper already supports multimodal content and function calling, so no new shared code is required for Wave 2.
- If a migrated function uses streaming, it will use `streamChatCompletion` instead of `chatCompletion` to preserve the SSE contract with the browser.