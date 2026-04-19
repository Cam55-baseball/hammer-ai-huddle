

## Plan — Final E2E hardening for `generate-training-block`

Single file: `supabase/functions/generate-training-block/index.ts`

### Context check first
Read current state to confirm:
- Location of forward-shift `normalizedWorkouts` build
- Existing `parseLocalDate` helper signature (already referenced in prior pass)
- Pre-RPC validation block location

### Changes (additive safeguards only)

1. **Re-sort after forward-shift** — append `.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))` to `normalizedWorkouts` after the forward-shift map completes, so chronological order is restored if any collisions pushed dates forward past later entries.

2. **Min 2 exercises per workout** — add to pre-RPC validation block:
   ```ts
   if (workoutsPayload.some(w => w.exercises.length < 2)) {
     throw new Error("Workout has fewer than 2 valid exercises");
   }
   ```
   (Replaces/strengthens existing `length === 0` check.)

3. **Week number distribution guard** — add before RPC:
   ```ts
   const weeks = new Set(workoutsPayload.map(w => w.week_number));
   if (weeks.size > 6 || Math.min(...weeks) !== 1) {
     throw new Error("Invalid week_number distribution");
   }
   ```

4. **Timezone-safe date parsing** — ensure `parseLocalDate` is defined as:
   ```ts
   const parseLocalDate = (s: string) => new Date(s + "T00:00:00");
   ```
   Replace any remaining `new Date(sw.scheduled_date)` calls with `parseLocalDate(sw.scheduled_date)` to prevent UTC off-by-one drift.

### No other changes
- Forward-shift uniqueness logic stays.
- Ordinal/numeric/payload guards stay.
- RPC error logging stays.
- No DB or client changes.

### Verification
Generate a 6-week block. Reply "ready" once deployed and validation passes; if RPC fails, return the structured Postgres error.

