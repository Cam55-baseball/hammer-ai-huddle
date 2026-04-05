

# Wire Remotion Lambda — Production Connection

## Critical Bugs to Fix

### 1. `render-promo`: Lambda Invocation Type Must Be Async
The current code uses `X-Amz-Invocation-Type: RequestResponse` (synchronous). Remotion renders take 30-120 seconds. Edge functions timeout at 60 seconds. This will **always fail**.

**Fix**: Change to `X-Amz-Invocation-Type: Event` (async fire-and-forget). Lambda runs in background, returns 202 immediately. The `check-render-status` cron handles completion.

Since the invocation is now async (no response body with `renderId`), we need a deterministic `renderId`. Remotion Lambda with `type: "start"` returns the renderId in the synchronous response — but with async invocation we don't get that. 

**Alternative approach**: Keep `RequestResponse` but use a **two-phase** pattern — the Lambda `type: "start"` call itself is fast (returns immediately with a `renderId`, doesn't wait for the render). The render happens asynchronously on Lambda's side. So `RequestResponse` is actually correct here — the Lambda function returns quickly with the render ID. The actual rendering continues in the background on AWS.

After re-examining: Remotion Lambda's `type: "start"` endpoint is designed to return immediately with `{ renderId, bucketName }`. It does NOT block until render completes. So `RequestResponse` is correct. The edge function should complete within a few seconds.

### 2. CORS Import Path
Both functions import from `https://esm.sh/@supabase/supabase-js@2.95.0/cors` — this may not resolve correctly on esm.sh. Replace with inline CORS headers to be safe.

### 3. `check-render-status`: Status field name
Remotion Lambda `getRenderProgress` returns `overallProgress` (0-1), `outputFile`, `fatalErrorEncountered`, and `done`. The current code checks these correctly.

## Secrets to Add
- `REMOTION_LAMBDA_FUNCTION_NAME`: `remotion-render-4-0-445-mem2048mb-disk2048mb-240sec`
- `REMOTION_SITE_URL`: `https://remotionlambda-useast1-u55gl2kp0l.s3.us-east-1.amazonaws.com/sites/y83e0po6rd/index.html`

## Changes

| File | Change |
|------|--------|
| `supabase/functions/render-promo/index.ts` | Fix CORS import to inline headers. Add logging for Lambda dispatch. Ensure `render_id` column (not just `render_metadata`) stores the renderId. |
| `supabase/functions/check-render-status/index.ts` | Fix CORS import to inline headers. Add logging for status checks. |

## Verification After Deploy
1. Add the 2 secrets via tool
2. Deploy both edge functions
3. Trigger a render from admin UI
4. Monitor `check-render-status` logs for Lambda polling
5. Confirm video URL appears in DB and UI

