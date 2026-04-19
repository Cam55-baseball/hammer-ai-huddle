

## Plan — Production-readiness fixes for `generate-training-block`

### Files
- `supabase/functions/generate-training-block/index.ts` (edge fn)
- `supabase/migrations/<new>.sql` (RPC dedupe — item 4)

### Context to confirm before editing
Read current state of:
- `parseLocalDate` definition + all call sites
- Forward-shift loop (need access to `endDate` / block end date in scope)
- Pre-RPC validation block (min-exercises + week-distribution guards)
- RPC source (`create_training_block_atomic` or equivalent) to find duplicate `FOR UPDATE`

### Changes

1. **Edge-safe `parseLocalDate`** — replace string-concat form with split-based local Date construction:
   ```ts
   const parseLocalDate = (s: string): Date => {
     const [y, m, d] = s.split('-').map(Number);
     return new Date(y, m - 1, d);
   };
   ```

2. **Relax min-exercise guard** — change `< 2` to `< 1`:
   ```ts
   if (workoutsPayload.some(w => w.exercises.length < 1)) {
     throw new Error("Workout has zero valid exercises");
   }
   ```

3. **Forward-shift overflow guard** — inside the forward-shift uniqueness loop (and/or after `normalizedWorkouts` is built), compare against block `endDate`:
   ```ts
   if (parseLocalDate(finalDate) > endDate) {
     throw new Error("Workout shifted beyond block end_date");
   }
   ```
   Apply per-iteration so we fail fast with the offending date.

4. **Dedupe `FOR UPDATE` in RPC** — open the RPC SQL and remove the redundant `SELECT ... FOR UPDATE`. Keep exactly one lock acquisition on `training_blocks` for the user. Ship via new migration (functions are `CREATE OR REPLACE`).

5. **Strict week 1–6 continuity** — strengthen existing week-distribution guard:
   ```ts
   const weeks = new Set(workoutsPayload.map(w => w.week_number));
   for (let i = 1; i <= 6; i++) {
     if (!weeks.has(i)) throw new Error(`Missing week ${i} in payload`);
   }
   if (weeks.size !== 6) throw new Error("Invalid week_number distribution");
   ```

### Out of scope
- No client changes.
- No scheduler logic changes beyond the overflow guard.
- No new validation surfaces beyond the four listed.

### Verification
Generate a 6-week block end-to-end. Expected: payload passes all guards, RPC succeeds with single lock, all weeks 1–6 present, no date exceeds `end_date`. If RPC fails, the existing structured catch block surfaces the raw Postgres `code/message/details/hint`.

