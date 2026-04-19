

## Plan — Return fully nested training block

Single file: `supabase/functions/generate-training-block/index.ts`

### Context check first
Read post-RPC return section to confirm:
- `serviceClient`, `blockId`, `corsHeaders` in scope
- Exact child table/column names (`block_workouts`, `block_exercises`) match schema

### Change
Replace the current diagnostic `.maybeSingle()` fetch + soft-return block with a single nested select returning the full block tree:

```ts
const { data: block, error: fetchErr } = await serviceClient
  .from('training_blocks')
  .select(`
    id, goal, sport, start_date, end_date, status,
    block_workouts (
      id, week_number, day_label, scheduled_date, status, workout_type, estimated_duration,
      block_exercises (
        id, ordinal, name, sets, reps, weight, tempo, rest_seconds,
        velocity_intent, cns_demand, coaching_cues
      )
    )
  `)
  .eq('id', blockId)
  .maybeSingle();

if (fetchErr) {
  console.error("BLOCK FETCH FAILED:", fetchErr);
  throw new Error("Failed to fetch training block after creation");
}
if (!block) {
  console.error("BLOCK NULL AFTER CREATION", { blockId });
  throw new Error("Training block created but not found");
}

console.log("BLOCK RETURN SUCCESS", { blockId });
return new Response(JSON.stringify({ block }), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
```

### Schema verification
Before committing, confirm `block_workouts` and `block_exercises` column names match the select (especially `velocity_intent`, `cns_demand`, `coaching_cues`, `workout_type`, `estimated_duration`, `day_label`, `ordinal`). If any column differs, adjust select to match actual schema — do not invent columns.

### Out of scope
- No validation/guard changes.
- No RLS or RPC changes.
- No client changes.

### Verification
Generate a 6-week block. Expect 200 response with `{ block: { ...workouts: [...exercises] } }`. Confirm `BLOCK RETURN SUCCESS` log fires.

