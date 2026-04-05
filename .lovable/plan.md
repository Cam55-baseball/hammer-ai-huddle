

# Phase 4 — Fully Automated Render Pipeline

## Critical Architecture Constraint

Fully automated rendering (button click → MP4) requires a compute environment with Chromium + ffmpeg that runs outside edge functions. Edge functions have a 60-second timeout and no browser runtime. There are two viable paths:

**Option A: Remotion Lambda (AWS)**
- Requires AWS account with a deployed Remotion Lambda function
- Edge function calls `renderMediaOnLambda()` → returns S3 URL
- True serverless, parallel rendering, production-grade
- Needs 3 secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `REMOTION_LAMBDA_FUNCTION_NAME`

**Option B: External Render API (Creatomate / Shotstack / custom server)**
- Edge function sends scene data via HTTP POST
- External service renders and returns URL via webhook
- Simpler setup but requires a paid third-party service

Both options require infrastructure you provision outside Lovable. Neither can be fully set up within the sandbox alone.

## What I Will Build Now

Everything needed so that once you provide AWS credentials (or an external render API key), the system is fully autonomous. Zero manual steps after credential setup.

### 1. Render Orchestration Edge Function (`render-promo` rewrite)

Current: validates payload, marks as processing, returns. Nothing renders.

New behavior:
- Validates project (scene_key mapping, sim_data, non-empty sequence)
- Marks job as `processing`
- Calls Remotion Lambda via `@remotion/lambda` client SDK to trigger render
- Stores Lambda `renderId` in `render_metadata`
- Returns immediately (Lambda runs async)

Fallback: If Lambda is not configured, falls back to storing the assembled payload in `render_metadata` and marking as `awaiting_render` (for manual/external trigger).

### 2. Render Status Checker Edge Function (`check-render-status`)

New edge function that:
- Accepts `{ queue_id }` or polls all `processing` jobs
- Calls `getRenderProgress()` from Remotion Lambda SDK
- On completion: downloads output from S3, uploads to `promo-videos` storage bucket, updates `output_url`
- On failure: marks job as `failed` with error message
- Designed to be called via cron (every 30s) or from client polling

### 3. Retry + Timeout Logic

Database changes:
- Add `retry_count` (int, default 0) and `max_retries` (int, default 2) to `promo_render_queue`
- Add `render_id` (text, nullable) for Lambda render tracking

Edge function logic:
- If `status = 'processing'` and `started_at` > 5 minutes ago → mark `failed` (timeout)
- If `status = 'failed'` and `retry_count < max_retries` → reset to `queued`, increment `retry_count`
- If `retry_count >= max_retries` → mark `permanently_failed`

### 4. Automated Queue Trigger

Option: Database webhook (pg_net) on INSERT to `promo_render_queue` that calls `render-promo` edge function automatically. This eliminates the client needing to invoke the edge function after insert.

```sql
-- Trigger render-promo on queue insert via pg_net
CREATE OR REPLACE FUNCTION public.trigger_render_on_queue_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/render-promo',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
    ),
    body := jsonb_build_object('queue_id', NEW.id)
  );
  RETURN NEW;
END;
$$;
```

This means: client inserts a queue row → DB trigger fires → edge function validates + dispatches to Lambda → done. True automation.

### 5. Client-Side Changes

`useQueueRender` simplified:
- Insert queue row only (trigger handles the rest)
- Remove manual `supabase.functions.invoke('render-promo')` call

`useRenderQueue` already has 5s polling — kept as-is for status updates.

ExportManager: no changes needed (already shows video preview + status).

### 6. Scheduled Stale Job Cleanup

Cron job (every 2 minutes) that calls `check-render-status`:
- Times out stuck `processing` jobs
- Retries eligible `failed` jobs
- Finalizes completed Lambda renders

## Files

| File | Change |
|------|--------|
| DB migration | Add `retry_count`, `max_retries`, `render_id` to `promo_render_queue`. Add `trigger_render_on_queue_insert` trigger via pg_net. |
| `supabase/functions/render-promo/index.ts` | Rewrite: validate → call Remotion Lambda → store render_id |
| `supabase/functions/check-render-status/index.ts` | New: poll Lambda progress, finalize completed renders, timeout stuck jobs, retry failed |
| `src/hooks/usePromoEngine.ts` | Simplify `useQueueRender` (insert only, trigger handles dispatch) |

## What Requires Your Action

Before this system is fully autonomous, you need to:

1. **Set up Remotion Lambda on AWS** — deploy the Lambda function and S3 bucket using Remotion's CLI (`npx remotion lambda sites create` + `npx remotion lambda functions deploy`)
2. **Provide 3 secrets**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `REMOTION_LAMBDA_FUNCTION_NAME` (plus optionally `REMOTION_LAMBDA_REGION` and `REMOTION_S3_BUCKET`)
3. **Deploy the Remotion bundle to S3** — the Lambda function renders from a deployed site URL

Once those are in place, the pipeline is fully autonomous: click → render → video URL.

## What Ships Immediately (No AWS Required)

Even before Lambda credentials are added:
- DB trigger auto-invokes `render-promo` on queue insert (no client-side invoke needed)
- Full validation runs automatically
- Retry + timeout logic is active
- Jobs that can't render are marked `failed` with clear message: "Render service not configured"
- The moment AWS credentials are added, rendering activates with zero code changes

