

# Fix Composition Name in render-promo

## Context

The Remotion bundle in `remotion/src/Root.tsx` registers the composition as `id="main"` (line 42). Using `"MainVideo"` will fail unless the bundle is also updated. The correct fix requires changes in two places.

## Changes

### 1. `remotion/src/Root.tsx`
- Change the `<Composition id="main" ...>` to `<Composition id="MainVideo" ...>` so the bundle registers the composition under the new name.

### 2. `supabase/functions/render-promo/index.ts`
- Change the default composition from `"main"` to `"MainVideo"` (line 190 and the fallback on line 214).
- Keep the existing `getCompositionsOnLambda` discovery logic as a fallback — if discovery succeeds, use the first composition found; if it fails, fall back to `"MainVideo"` instead of `"main"`.

Only two lines change in each file. No database changes needed.

