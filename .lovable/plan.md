

## Real root cause (confirmed from edge logs + DB)

Edge log shows the exact failure:
```
code: "23514"
message: 'new row for relation "block_exercises" violates check constraint "chk_block_exercises_reps"'
Failing row: ... "Barbell Back Squat (Heavy Single/Double)", sets=3, reps=2 ...
```

DB constraints:
- `chk_block_exercises_reps`: `reps >= 3 AND reps <= 30`
- `chk_block_exercises_sets`: `sets >= 1 AND sets <= 10`

The AI generates legitimate strength prescriptions like **heavy singles (1 rep), doubles (2 reps), and triples (3 reps)** — these are core to a strength block — but the DB rejects anything below 3 reps. The atomic insert blows up the entire 18-workout transaction the first time it hits a `reps=1` or `reps=2` exercise. Every 6-week generation fails on the first heavy-strength exercise.

The previous "isolation level" fix was correct but uncovered this deeper bug.

## Fix — two-layer

### 1. DB migration: relax `chk_block_exercises_reps` to allow heavy singles/doubles
- Drop `chk_block_exercises_reps`
- Recreate as `reps >= 1 AND reps <= 30` (1-rep max work is a normal strength prescription)
- Keep `chk_block_exercises_sets` unchanged (1–10 is fine)

### 2. Edge function: defensive clamping in `generate-training-block/index.ts`
Before calling `insert_training_block_atomic`, clamp every exercise to safe bounds so a future schema tweak or rogue AI value can never blow the transaction:
- `sets` → clamp to `[1, 10]`
- `reps` → clamp to `[1, 30]`
- `rest_seconds` → clamp to `[0, 600]`
- Drop exercises missing `name`

Also add the requested defensive logging (just the useful bits — payload size, workout count, first PG error code/message/details/hint) so future failures are diagnosable without digging.

## Files touched

| File | Change |
|---|---|
| New migration | Drop + recreate `chk_block_exercises_reps` with min `1` |
| `supabase/functions/generate-training-block/index.ts` | Clamp exercise values before RPC + structured error logging |

## Verification
After deploy: generate a 6-week block end-to-end. Heavy single/double prescriptions will insert successfully, and the block + 18 workouts + exercises + calendar events all land.

## Out of scope
- No client changes.
- No changes to the daily-plan path (uses a different table flow).

