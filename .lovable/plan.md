

# Replace Manual AWS Signing with @remotion/lambda Client

## Problem
The manual AWS Signature V4 implementation in both `render-promo` and `check-render-status` edge functions is failing, preventing Lambda dispatch and status polling.

## Solution
Replace all manual AWS signing code with the official `@remotion/lambda-client` package, which Remotion specifically built for Deno/Supabase Edge Functions. This package exports `renderMediaOnLambda` and `getRenderProgress` — exactly the two operations we need.

## Changes

### 1. `supabase/functions/render-promo/index.ts`

**Remove:** All AWS SigV4 helpers (`sha256Hex`, `hmacSha256`, `hmacHex`, `getSignatureKey`), manual Lambda URL construction, manual header signing, and the retry loop around the raw fetch.

**Add:** Import `renderMediaOnLambda` and `speculateFunctionName` from `npm:@remotion/lambda-client@4.0.261`.

Replace lines 190-337 (the Lambda dispatch block) with:

```typescript
import { renderMediaOnLambda, speculateFunctionName } from "npm:@remotion/lambda-client@4.0.261";

// Inside the Lambda dispatch block:
const { renderId, bucketName } = await renderMediaOnLambda({
  region: lambdaRegion,
  functionName: lambdaFunctionName,
  serveUrl: remotionSiteUrl,
  composition: "main",
  codec: "h264",
  inputProps: { sceneSequence: assembledSequence },
  imageFormat: "jpeg",
  maxRetries: 1,
  privacy: "public",
  outName: `promo-${queue_id}.mp4`,
  ...(s3Bucket ? { forceBucketName: s3Bucket } : {}),
});
```

This call returns immediately with a `renderId` — no timeout issues since it's an async dispatch by design. The 120s retry loop becomes unnecessary.

Keep the existing error handling: wrap in try/catch, call `failJob` on error.

### 2. `supabase/functions/check-render-status/index.ts`

**Remove:** The `checkLambdaProgress` function and all AWS SigV4 crypto helpers.

**Add:** Import `getRenderProgress` from `npm:@remotion/lambda-client@4.0.261`.

Replace the `checkLambdaProgress` call with:

```typescript
import { getRenderProgress } from "npm:@remotion/lambda-client@4.0.261";

const progress = await getRenderProgress({
  renderId: job.render_id,
  functionName: lambdaFunctionName,
  bucketName: s3Bucket || undefined,
  region: lambdaRegion,
});
```

Map the response fields: `progress.done`, `progress.outputFile`, `progress.fatalErrorEncountered`, `progress.overallProgress`.

### 3. Environment Variables

The `@remotion/lambda-client` reads `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` from the environment automatically — no changes needed to secrets.

`REMOTION_S3_BUCKET` is passed as `bucketName` to `getRenderProgress` (required for status checks). Ensure this secret is set.

## Files

| File | Change |
|------|--------|
| `supabase/functions/render-promo/index.ts` | Replace manual SigV4 + fetch with `renderMediaOnLambda()`. Remove retry loop (async dispatch doesn't timeout). Remove all crypto helpers. |
| `supabase/functions/check-render-status/index.ts` | Replace `checkLambdaProgress()` + manual SigV4 with `getRenderProgress()`. Remove all crypto helpers. |

## Why This Fixes the Problem

`renderMediaOnLambda` uses the Remotion Lambda wire protocol correctly — it sends a `type: "start"` payload and the Lambda function returns a `renderId` immediately (within 1-3 seconds). The actual rendering happens asynchronously on Lambda. There's no cold-start timeout issue because the initial dispatch is fast; the heavy rendering happens after the response.

