

# Fix ai-helpdesk Edge Function "Unauthorized" Error

## Root Cause

The `ai-helpdesk` function fails on every call with "Unauthorized" because:

1. **Missing `persistSession: false`** — The Supabase client is created without `{ auth: { persistSession: false } }`, causing the edge runtime to cache/leak auth state between invocations. The working `check-subscription` function includes this option and works fine.

2. **Old serve pattern** — Uses `import { serve } from "https://deno.land/std@0.168.0/http/server.ts"` instead of the native `Deno.serve()` used by all other working functions.

## Fix

Update `supabase/functions/ai-helpdesk/index.ts`:

- Replace `serve()` import + usage with `Deno.serve()`
- Add `{ auth: { persistSession: false } }` to `createClient()` call (line 23)
- Match the exact pattern used by `check-subscription` which works correctly

## Changes

| File | Change |
|------|--------|
| `supabase/functions/ai-helpdesk/index.ts` | Fix Supabase client config + use `Deno.serve()` |

