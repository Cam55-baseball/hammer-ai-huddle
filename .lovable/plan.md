

## Plan — Harden pre-RPC validation in `generate-training-block`

Single file: `supabase/functions/generate-training-block/index.ts`

### Changes (in order, all pre-RPC)

1. **Validate `scheduled_date` before sort** — map `scheduledWorkouts` into `safeWorkouts`, throw on missing/unparseable dates. Feed `safeWorkouts` into the existing sort + forward-shift uniqueness pass.

2. **Recompute exercise ordinals after filtering** — in the `workoutsPayload` mapping, filter out exercises missing a non-empty `name`, then re-index `ordinal` from the post-filter array (don't trust AI-supplied indexes).

3. **Per-workout ordinal uniqueness guard** — after building each workout's `exercises` array, throw if `new Set(ordinals).size !== ordinals.length`.

4. **Numeric integrity guard** — loop each exercise, throw if `sets` or `reps` is not finite.

5. **Final payload sanity** — before RPC: throw if `workoutsPayload.length === 0` or any workout has zero exercises.

### Notes
- All clamps (`sets` 1–10, `reps` 1–30, `rest_seconds` 0–600) already exist — reuse them.
- Existing duplicate-date guard, week_number validation, and structured RPC error logging stay as-is.
- No DB, scheduling-logic, or client changes.

### Verification
Generate a 6-week block. If it still fails, the next surfaced error will be the raw Postgres `code/message/details/hint` from the existing RPC catch block — report that back.

