

# Fix: Render Pipeline Stuck in Timeout Loop

## Root Cause

Two connected bugs prevent renders from completing:

1. **`render-promo/index.ts` line 236**: Uses `"X-Amz-Invocation-Type": "RequestResponse"` (synchronous). Lambda renders take 30-120s but edge functions timeout at 60s. The response is never received, so `render_id` is never stored.

2. **`check-render-status/index.ts`**: When polling, it checks `if (lambdaConfigured && job.render_id)` — since render_id is always null, the job is silently skipped. It sits as "processing" until the 5-minute timeout fires, then retries with the same failure.

## Fix

### 1. Change Lambda invocation to async (render-promo)

In `supabase/functions/render-promo/index.ts`, line 236:

Change:
```
"X-Amz-Invocation-Type": "RequestResponse",
```
To:
```
"X-Amz-Invocation-Type": "Event",
```

With async invocation (`Event`), Lambda returns immediately with a 202 status. The render starts in the background.

However, async invocation does NOT return a `renderId` in the response body. We need a different approach to get the render ID.

### 2. Generate render_id client-side (render-promo)

Since Remotion Lambda's "start" type returns a `renderId` only in synchronous mode, we need to switch to `"RequestResponse"` but with a **shorter composition** approach, OR use the Remotion Lambda `@remotion/lambda` SDK pattern.

**Better approach**: Keep `RequestResponse` but add a **timeout wrapper** — if Lambda responds within 55s (edge function limit), we get the renderId. If not, we fail gracefully.

Actually, the correct fix: Remotion Lambda's `type: "start"` is designed to return quickly (typically 2-5 seconds) with just a `renderId`. The actual rendering happens asynchronously after that. The issue may be that Lambda is cold-starting or the function itself is failing/hanging.

**Plan**:
- Keep `RequestResponse` (needed to get renderId)
- Add a 50-second `AbortController` timeout so the edge function doesn't hang to the 60s limit
- Add detailed logging of the Lambda response status and body
- If timeout occurs, mark job as failed with clear message

### 3. Fix check-render-status to handle null render_id

In `supabase/functions/check-render-status/index.ts`, add handling for processing jobs with null render_id:

- If job is processing AND render_id is null AND started_at is older than 2 minutes → mark as failed (Lambda dispatch never completed)
- This prevents jobs from sitting in limbo for 5 minutes

### 4. Add Lambda response logging

The current logs show `render-promo` invoking Lambda but no response logging appears. The edge function is likely timing out at the `fetch()` call. Add a 50s AbortController timeout and log whatever response (or timeout) occurs.

## Changes Summary

| File | Change |
|------|--------|
| `supabase/functions/render-promo/index.ts` | Add 50s AbortController timeout to Lambda fetch. Log response status and body. Keep RequestResponse to capture renderId. |
| `supabase/functions/check-render-status/index.ts` | Handle processing jobs with null render_id (fail after 2 min instead of 5). Add logging when skipping jobs. |

## Expected Result After Fix

1. `render-promo` invokes Lambda with a 50s timeout
2. If Lambda responds quickly (normal): renderId is stored, status polling works
3. If Lambda times out at 50s: job is marked failed with clear error, retry kicks in
4. `check-render-status` no longer silently skips null-render_id jobs

