# Plan: Migrate remaining Wave 1 AI functions to Google AI Studio direct

## Goal
Move the four remaining text-only Wave 1 functions off raw Lovable Gateway fetches and onto the shared `supabase/functions/_shared/googleAi.ts` helper. Google AI Studio becomes the primary provider; Lovable Gateway is used only when Google fails.

## Files to change
- `supabase/functions/_shared/googleAi.ts` — minor alias/schema sanitizer updates if needed
- `supabase/functions/session-insights/index.ts`
- `supabase/functions/get-daily-lesson/index.ts`
- `supabase/functions/hie-team-plan/index.ts`
- `supabase/functions/generate-follower-reports/index.ts`

## Implementation

### 1. Shared helper
- Confirm `toGoogleModel()` covers the model ids used in these files (`google/gemini-2.5-pro`, `google/gemini-2.5-flash`). Add an alias if any preview id appears.
- Verify `sanitizeJsonSchemaForGoogle()` strips fields that would cause a 400 on the `coaching_report` tool schema (it already removes `$schema`, `additionalProperties`, and `$id`).

### 2. `session-insights`
- Import `chatCompletion` from `../_shared/googleAi.ts`.
- Replace the `fetch("https://ai.gateway.lovable.dev/v1/chat/completions", ...)` block with:
  ```ts
  await chatCompletion({
    model: "google/gemini-2.5-pro",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    tools: [coachingReportTool],
    tool_choice: { type: "function", function: { name: "coaching_report" } },
  });
  ```
- Keep the existing tool-call extraction and DB cache logic unchanged.
- Map `!aiResult.ok` statuses: `429` → "Rate limited, try again shortly", `402` → "AI credits exhausted", otherwise `500` → "AI generation failed".

### 3. `get-daily-lesson`
- Import `chatCompletion`.
- Replace the raw Lovable fetch with:
  ```ts
  await chatCompletion({
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: sysPrompt },
      { role: "user", content: userMsg },
    ],
    temperature: 0.7,
  });
  ```
- Preserve existing behavior: if the AI succeeds, insert the generated lesson; if the AI fails (any status), log the failure and continue so the response still returns streak data with `lesson: null`.
- No `response_format` is needed because the output is free-form text.

### 4. `hie-team-plan`
- Import `chatCompletion`.
- Replace the `fetch("https://ai.lovable.dev/api/v1/chat/completions", ...)` call with:
  ```ts
  await chatCompletion({
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: "You are a professional baseball/softball development coach. Return ONLY valid JSON, no markdown." },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
  });
  ```
- Keep the JSON-array parsing from the returned content string (the existing markdown-code-fence cleanup stays).
- Map non-OK responses to the existing `500` "AI generation failed" error.

### 5. `generate-follower-reports`
- Import `chatCompletion`.
- Replace the `callAIWithRetry` implementation with a Google-first retry that calls `chatCompletion` with `timeoutMs: 5_000` and retries up to 2 times, matching the current behavior.
- If `result.ok` is true, extract `text` from `result.data.choices[0].message.content`.
- If all retries fail, return `null` so the deterministic headline fallback still applies.
- Remove the top-level `LOVABLE_API_KEY` read; the helper reads credentials internally.

### 6. Secrets
- Verify `GOOGLE_AI_API_KEY` is set as a runtime secret (it is already required for earlier Wave 1 migrations).
- Keep `LOVABLE_API_KEY` in place so the fallback path continues to work.

## Verification
- Deploy the four functions.
- Send a representative request for each (UI flow or direct curl to the function URL).
- Inspect function logs for `provider: "google"` on success; `provider: "lovable"` should appear only when Google fails.
- Watch for 400s caused by unsupported tool schemas and adjust the helper's schema sanitizer if needed.
- Optionally confirm the fallback path by temporarily removing `GOOGLE_AI_API_KEY` in a dev test.

## Rollout
- After these four functions are verified, proceed to the Wave 2 structured-generation functions (`generate-training-block`, `generate-block-workout`, `generate-drills`, `populate-drill-instructions`, `generate-vault-recap`).