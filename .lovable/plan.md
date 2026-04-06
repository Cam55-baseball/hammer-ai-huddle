

# Update render-promo Lambda Timeout and Retry Logic

## Problem
The Lambda invocation times out at 50s during cold starts and immediately marks the job as failed with no retry.

## Changes

### `supabase/functions/render-promo/index.ts`

**1. Switch to async "Event" invocation instead of synchronous "RequestResponse"**

The real fix: change `X-Amz-Invocation-Type` from `"RequestResponse"` to `"Event"`. This makes Lambda return HTTP 202 immediately (fire-and-forget), eliminating the timeout entirely. The `check-render-status` function already polls for completion.

However, "Event" invocation doesn't return a `renderId` in the response body. The Lambda itself must write the renderId somewhere (e.g., back to the queue row or S3). Since the current pipeline depends on getting `renderId` from the response, we keep `RequestResponse` but fix the timeout handling.

**2. Increase timeout to 120s and add retry with exponential backoff**

Replace the current single-attempt block (lines 230-269) with a retry loop:

- `MAX_RETRIES = 3` (initial attempt + 2 retries)
- Timeout per attempt: 120 seconds (edge functions can run up to ~150s on paid plans)
- On `AbortError` (timeout): wait with exponential backoff (5s, then 10s) and retry
- Only mark job as failed after all 3 attempts are exhausted
- Log each retry attempt with attempt number

**3. Remove immediate failure on timeout**

Current code marks the job `failed` on first timeout. New code:
- Attempt 1: timeout at 120s → log warning, wait 5s, retry
- Attempt 2: timeout at 120s → log warning, wait 10s, retry  
- Attempt 3: timeout at 120s → mark job failed

```text
Pseudocode:

const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 120000;
const BACKOFF = [5000, 10000];

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  
  try {
    lambdaResponse = await fetch(lambdaUrl, { ..., signal: controller.signal });
    clearTimeout(timeoutId);
    break; // success
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      if (attempt < MAX_ATTEMPTS) {
        log(`Attempt ${attempt} timed out. Retrying in ${BACKOFF[attempt-1]/1000}s...`);
        await sleep(BACKOFF[attempt - 1]);
        continue;
      }
      // All attempts exhausted — fail job
      failJob(...)
      return 504;
    }
    throw err;
  }
}
```

### Files

| File | Change |
|------|--------|
| `supabase/functions/render-promo/index.ts` | Replace single 50s fetch with 3-attempt retry loop (120s timeout, 5s/10s backoff) |

