# Fix "Couldn't reach Hammer" on Ask Hammer

## Root cause
Client throws `FunctionsFetchError: Failed to fetch` when invoking `hammer-recall`. Edge-function logs show **no boot, no request, no error** for `hammer-recall` at all — meaning the function is not deployed / not reachable. All other functions (check-subscription, wk-generate-daily, etc.) show normal boot logs, so the runtime is fine; only this function is missing.

The most probable cause is a deploy-time failure from the imports used in `supabase/functions/hammer-recall/index.ts`:

- `https://deno.land/std@0.168.0/http/server.ts` (old std URL)
- `https://esm.sh/@supabase/supabase-js@2.76.0` (esm.sh floating specifier — known to cause silent deploy failures per Lovable's edge-function-deploy-errors guidance)

Every other working function in this project uses `npm:` specifiers instead.

## Fix

1. Rewrite the top of `supabase/functions/hammer-recall/index.ts` to use the project's standard import pattern:
   - Replace `deno.land/std` `serve` with `Deno.serve` (native).
   - Replace `esm.sh/@supabase/supabase-js@2.76.0` with `npm:@supabase/supabase-js@2`.
   - Import CORS from `npm:@supabase/supabase-js@2/cors` and drop the local `corsHeaders` const to match the house rule.
   - Keep the rest of the retrieval + Gemini logic unchanged.

2. Add an explicit `[functions.hammer-recall]` block to `supabase/config.toml` with `verify_jwt = true` so auth headers are validated the same way as `ai-chat` (the function already reads the user from the Authorization header).

3. If `supabase/functions/deno.lock` exists and still fails after the import swap, delete it so edge-runtime re-resolves cleanly.

4. Verify:
   - `supabase--edge_function_logs` for `hammer-recall` now shows a `booted` line.
   - `supabase--curl_edge_functions` POST to `/hammer-recall` with a small `{ messages: [...] }` body returns a JSON reply (or a clean 4xx) instead of a network failure.
   - In the preview, sending a message from `/hammer/recall` no longer surfaces `Couldn't reach Hammer`.

## Out of scope
- No changes to `HammerRecall.tsx` UI, retrieval SQL, or the recall_threads/recall_messages schema — those are fine; the only failure is the function not being reachable.
