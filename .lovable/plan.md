

## Plan — Defensive post-RPC fetch in `generate-training-block`

Single file: `supabase/functions/generate-training-block/index.ts`

### Context check first
Read the post-RPC section to confirm:
- Variable name holding the returned block id (`blockId` vs `v_block_id`)
- Whether `serviceClient` is already instantiated in scope (it should be — RPC uses it)
- Current `.single()` vs `.maybeSingle()` usage on the return fetch

### Changes (isolation/diagnostic only)

1. **Switch fetch to `serviceClient` + `.maybeSingle()`** — replace the user-client `.single()` fetch with service-client `.maybeSingle()` to bypass RLS as the diagnostic.

2. **Wrap fetch in try/catch with full error logging**:
   ```ts
   const { data: block, error: fetchErr } = await serviceClient
     .from('training_blocks')
     .select('*')
     .eq('id', blockId)
     .maybeSingle();

   if (fetchErr) {
     console.error("BLOCK FETCH FAILED:", {
       message: fetchErr.message,
       details: fetchErr.details,
       hint: fetchErr.hint,
       blockId
     });
   }
   ```

3. **Null-block soft return** — instead of throwing, return 200 with `blockId` + warning so client surfaces a debuggable response:
   ```ts
   if (!block) {
     console.error("BLOCK NULL AFTER CREATION", { blockId });
     return new Response(JSON.stringify({
       blockId,
       warning: "Block created but fetch failed"
     }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
   }
   ```

4. **Explicit success log** before normal return:
   ```ts
   console.log("BLOCK RETURN SUCCESS", { blockId });
   ```

### No other changes
- Validation guards, forward-shift logic, RPC payload, week continuity, infinite-loop guard — all stay as-is.
- No DB or client changes.

### Verification
Generate a 6-week block. Inspect edge function logs for `BLOCK FETCH FAILED` / `BLOCK NULL AFTER CREATION` / `BLOCK RETURN SUCCESS`. If service-client fetch succeeds where user-client failed → confirmed RLS root cause; next pass fixes the SELECT policy on `training_blocks`.

