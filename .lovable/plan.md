Smoke-test results for the four representative Wave functions:

| Wave | Function | Result | Provider actually used |
|------|----------|--------|------------------------|
| 1 | `hie-team-plan` | HTTP 200, valid drill blocks | Lovable Gateway (fallback) |
| 2 | `generate-drills` | HTTP 200, generated count 2 | Lovable Gateway (fallback) |
| 3 | `gp-pregame-plan` | HTTP 401 — no auth header injected | Could not test |
| 4 | `analyze-food-photo` | HTTP 401 — no auth header injected | Could not test |

Root cause: the Google AI Studio direct path is returning 404 for `models/gemini-2.5-flash` with the project's API key. The edge-function logs show:

```
[googleAi] Google call failed status=404 — falling back to Lovable Gateway
{"error":{"code":404,"message":"This model models/gemini-2.5-flash is no longer available to new users..."}}
```

This means the migration is still routing most AI traffic through Lovable Gateway, which defeats the goal of separating build credits from runtime AI spend.

AI Gateway logs confirm two Lovable `chat_completions` calls (model `google/gemini-2.5-flash`) at the exact test timestamps, proving fallback was triggered.

Plan
----
1. Update `supabase/functions/_shared/googleAi.ts` model aliases so the migrated `google/gemini-2.5-*` IDs map to stable models available to the project's key:
   - `gemini-2.5-flash` → `gemini-3.6-flash`
   - `gemini-2.5-flash-lite` → `gemini-3.6-flash`
   - `gemini-2.5-flash-image` → `gemini-3.1-flash-image`
   - `gemini-2.5-pro` → `gemini-3.5-pro`
   - Keep existing `gemini-2.0-flash-exp` and `gemini-3-flash-preview` aliases intact.

2. Deploy the four representative functions to pick up the shared-file change:
   - `hie-team-plan`
   - `generate-drills`
   - `gp-pregame-plan`
   - `analyze-food-photo`

3. Re-run the same four representative smoke tests.

4. Verify the fix by checking:
   - Edge-function logs no longer contain the `Google call failed status=404` warning for these functions.
   - AI Gateway logs show no new Lovable Gateway calls for the tested functions during the test window (proving the Google path is primary and no fallback is triggered).

5. Optional follow-up: if you log in to the preview so auth tokens are injected, I can also validate the authenticated Wave-3 and Wave-4 functions end-to-end with real data.

No code changes have been made yet; this plan requires your approval before implementation.