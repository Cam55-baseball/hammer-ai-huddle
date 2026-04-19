

## Plan — Make Adapt always replace, never conflict

### Root cause
Adapt regen path archives old block client-side, but:
- Race: archive may not commit before `generate-training-block` checks for active block → `active_block_exists` from RPC.
- Idempotency key may be reused if the edge function derives it deterministically from user/sport.
- Errors from `supabase.functions.invoke` get swallowed into generic toast — no diagnostic.

Fix is split across **client** (already archives, needs error clarity) and **edge function** (must accept and honor `archive_block_id`, generate fresh idempotency key per call, surface clean error).

### Files to change

**1. `src/hooks/useTrainingBlock.ts`** — `adaptBlock` regen branch:
- Pass `archive_block_id: oldId` and `force_new: true` in invoke body so the edge function archives server-side (atomic with RPC).
- Keep client-side archive as belt-and-suspenders, but log it: `console.log("ARCHIVED OLD BLOCK:", oldId)`.
- Catch invoke errors, log full payload: `console.error("ADAPT RPC ERROR FULL:", error)`.
- If error message contains `active_block_exists` → toast `"Existing active block prevented adaptation"` (no generic fallback).
- On success, `setQueryData(['training-block','active', user.id], newBlock)` (already in place — confirm replacement, not merge).

**2. `supabase/functions/generate-training-block/index.ts`** — accept new params:
- Read `archive_block_id` and `force_new` from request body.
- If `archive_block_id` present: `await serviceClient.from('training_blocks').update({ status: 'archived' }).eq('id', archive_block_id).eq('user_id', user.id)` BEFORE any active-block check or RPC call. Log `ARCHIVED OLD BLOCK (server): <id>`.
- Always generate fresh idempotency key: `crypto.randomUUID()` per invocation when `force_new` is true (do not derive from user+sport).
- On RPC error, log `console.error("ADAPT RPC ERROR FULL:", rpcErr)` and if message includes `active_block_exists`, return 409 with `{ error: "active_block_exists", message: "Existing active block prevented adaptation" }` so client can surface the exact text.

### Out of scope
- No DB/RPC signature changes (`insert_training_block_atomic` already supports `p_idempotency_key`).
- No changes to `adapt-training-block` (volume-tuning path stays as-is).
- No UI changes beyond toast text routing.

### Verification
1. Generate initial block → succeeds.
2. Change goal → click Adapt → console shows `ARCHIVED OLD BLOCK` (client + server), new blockId in state, workouts replaced.
3. Click Adapt again immediately (second attempt) → succeeds, no `active_block_exists` error.
4. If RPC ever returns `active_block_exists`, toast reads `"Existing active block prevented adaptation"` (not generic).
5. Confirm in DB: only one `active` block per user after each adapt; previous blocks marked `archived`.

