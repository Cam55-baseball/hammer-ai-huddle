
Goal

Restore reliable promo render dispatch so `render-promo` returns and stores a `render_id` immediately.

What I found

- The codebase already no longer contains manual AWS Signature V4 or direct `fetch()`-based Lambda invocation logic.
- `render-promo` already calls `renderMediaOnLambda()` and `check-render-status` already calls `getRenderProgress()`.
- Logs show `render-promo` reaches `Calling renderMediaOnLambda...` and then stops; `check-render-status` later reports `no render_id after 120s`.
- The biggest likely issue is Remotion version drift: the edge functions import `4.0.261`, while the configured Lambda function is `remotion-render-4-0-445-...`.
- There is also a queue persistence bug: the code tries to write `render_metadata` to `promo_render_queue`, but that column does not exist in the current schema. So even if Remotion returns a `renderId`, it may still fail to persist.
- There is no `REMOTION_S3_BUCKET` secret configured, so storing the returned `bucketName` on the queue row is important for polling.

Plan

1. Align the Remotion client with the deployed Lambda
   - Change both edge functions to use the documented import path `npm:@remotion/lambda@4.0.445/client` (matching the configured Lambda version), not `npm:@remotion/lambda-client@4.0.261`.
   - Keep using only `renderMediaOnLambda()` and `getRenderProgress()`; no direct AWS request signing or Lambda `fetch()` path will remain.

2. Harden `render-promo`
   - Validate required backend secrets before dispatch: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `REMOTION_LAMBDA_FUNCTION_NAME`, `REMOTION_SITE_URL`, and region.
   - Support `AWS_SESSION_TOKEN` if the AWS credentials are temporary.
   - Improve error capture so if the Remotion client fails, the real error is written back instead of leaving the job stuck in `processing`.

3. Fix render tracking persistence
   - Add a small queue-level metadata field via migration (recommended: `render_metadata jsonb default '{}'::jsonb`) because the code already expects to store `bucketName` on `promo_render_queue`.
   - After `renderMediaOnLambda()` returns, save both `render_id` and `bucketName` immediately.
   - Check and handle backend update errors explicitly so a failed row update cannot silently drop the `renderId`.

4. Tighten `check-render-status`
   - Keep `getRenderProgress()` as the status mechanism.
   - Read `bucketName` from `promo_render_queue.render_metadata` first, then fall back to `REMOTION_S3_BUCKET` if that secret is added later.
   - Keep the existing completed-video download/upload flow; that remaining `fetch()` is only for downloading the finished mp4, not for invoking AWS.

5. Version hygiene
   - Align the local Remotion app version with the same Remotion version used by the configured Lambda/site so future deployments do not drift back out of compatibility.

Files to update

- `supabase/functions/render-promo/index.ts`
- `supabase/functions/check-render-status/index.ts`
- `remotion/package.json`
- one backend migration for `promo_render_queue.render_metadata`

Technical detail

```text
Current failing path:
queue row inserted
-> render-promo marks job processing
-> renderMediaOnLambda() is called
-> no renderId is returned or persisted
-> check-render-status sees a processing job with null render_id after 120s

Expected path after the fix:
queue row inserted
-> renderMediaOnLambda() returns quickly with renderId + bucketName
-> queue row is updated immediately
-> check-render-status polls with getRenderProgress()
-> completed mp4 is copied to promo-videos and URLs are saved
```
