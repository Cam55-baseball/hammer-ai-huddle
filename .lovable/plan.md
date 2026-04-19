

## Plan — Add final response logging

Single file: `supabase/functions/generate-training-block/index.ts`

### Change
Just before the final `return new Response(JSON.stringify({ block }), ...)` (right after the existing `BLOCK RETURN SUCCESS` log), add:

```ts
console.log("FINAL BLOCK RESPONSE:", JSON.stringify(block, null, 2));
console.log("BLOCK KEYS:", Object.keys(block || {}));
```

### Out of scope
Nothing else changes.

### Verification
Generate a 6-week block, inspect edge function logs for `FINAL BLOCK RESPONSE` and `BLOCK KEYS`.

