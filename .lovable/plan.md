

# Auto-Detect Composition ID in render-promo

## Problem
The render is failing because `composition: "main"` may not match the actual composition ID in the deployed Remotion bundle. There's no diagnostic logging to confirm what compositions exist.

## Solution
Use Remotion's `getCompositionsOnLambda()` to query the deployed site for available compositions before dispatching the render. Log them, return them in the response, and use the first one automatically.

## Changes

### `supabase/functions/render-promo/index.ts`

1. Import `getCompositionsOnLambda` alongside `renderMediaOnLambda` from `npm:@remotion/lambda-client@4.0.445`

2. Before the `renderMediaOnLambda` call (after secrets validation, around line 188), add a composition discovery step:

```typescript
import { renderMediaOnLambda, getCompositionsOnLambda } from "npm:@remotion/lambda-client@4.0.445";

// Discover available compositions
const compositions = await getCompositionsOnLambda({
  region: lambdaRegion,
  functionName: lambdaFunctionName,
  serveUrl: remotionSiteUrl,
  inputProps: { sceneSequence: assembledSequence },
});

const compositionIds = compositions.map((c) => c.id);
console.log(`[render-promo] Available compositions: ${JSON.stringify(compositionIds)}`);

if (compositions.length === 0) {
  await failJob(supabase, queue_id, project.id, "No compositions found in Remotion bundle");
  return error response;
}

const compositionId = compositionIds[0];
console.log(`[render-promo] Using composition: '${compositionId}'`);
```

3. Replace `composition: "main"` with `composition: compositionId` in the `renderMediaOnLambda` call

4. Include `compositionIds` and the selected `compositionId` in the success response for diagnostics

### Error handling
Wrap `getCompositionsOnLambda` in try/catch — if it fails, log the error and fall back to `"main"` so existing behavior isn't broken.

### Single file change
Only `supabase/functions/render-promo/index.ts` is modified.

