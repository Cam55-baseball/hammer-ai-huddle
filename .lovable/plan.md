

## Plan — Bind `workoutsPayload` to `normalizedWorkouts` + recompute `day_label`

Single file: `supabase/functions/generate-training-block/index.ts`

### Context check first
Before editing, I'll read the current state of the file to locate:
- Where `normalizedWorkouts` is built (end of forward-shift uniqueness pass)
- Where `workoutsPayload` is currently constructed (the `.map(sw => ({...}))` that becomes the RPC arg)
- Where `day_label` is assigned

### Changes

1. **Bind payload to the validated source** — immediately after `normalizedWorkouts` is built, ensure the RPC payload is derived from it (not from the raw `scheduledWorkouts`). Concretely: the existing `workoutsPayload = normalizedWorkouts.map(...)` mapping must reference `normalizedWorkouts` as its input array. If any stray reference to `scheduledWorkouts` remains in the payload-building map, replace it.

2. **Recompute `day_label` inside the payload map** from `scheduled_date` to prevent drift after the forward-shift may have moved a workout to a new weekday:
   ```ts
   day_label: DAY_NAMES[new Date(sw.scheduled_date).getDay()],
   ```
   (Use the same `parseLocalDate` helper already in the file if it exists, to avoid UTC off-by-one — will confirm when reading.)

### No other changes
- Validation guards stay as-is.
- RPC error logging stays as-is.
- Forward-shift uniqueness logic stays as-is.

### Verification
Generate a 6-week block. If it still fails, the existing structured RPC catch block will surface the raw Postgres `code/message/details/hint` — report that back.

