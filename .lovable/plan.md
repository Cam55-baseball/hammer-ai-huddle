

## Plan — Proper availability-aware scheduling with guaranteed uniqueness

### Root cause
Current code flattens dates to `startDate + i` (daily), which breaks training-frequency logic. The original AI/availability scheduling can produce duplicate dates that violate `uq_block_workouts_date`. We need to preserve the intended cadence AND guarantee uniqueness.

### Fix — single file: `supabase/functions/generate-training-block/index.ts`

**1. Remove sequential `startDate + i` override.** Restore availability-based dates from `pickOptimalSchedule` / AI output.

**2. Add forward-shift uniqueness pass:**
```ts
const usedDates = new Set<string>();
const normalizedWorkouts = scheduledWorkouts
  .slice()
  .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
  .map(sw => {
    let d = parseLocalDate(sw.scheduled_date);
    while (usedDates.has(toISO(d))) {
      d.setDate(d.getDate() + 1);
    }
    const finalDate = toISO(d);
    usedDates.add(finalDate);
    return {
      ...sw,
      scheduled_date: finalDate,
      day_label: DAY_NAMES[d.getDay()],
    };
  });
```
Preserves intended spacing; only nudges forward on collision.

**3. Pre-RPC hard validation** (throw before RPC if any fail):
- Duplicate `scheduled_date` check (defense in depth)
- Every workout has `exercises.length >= 1`
- Every workout has `week_number` between 1 and 6
- Log full payload on failure

**4. Full RPC error logging** — wrap `supabase.rpc('insert_training_block_atomic', ...)` in try/catch and log:
- `error.code`, `error.message`, `error.details`, `error.hint`
- Payload size: `workouts.length`, total exercise count
- Snapshot: first 2 workouts + first 2 exercises of each (stringified, truncated)

**5. Update `calendar_events` insert** to use `normalizedWorkouts` (already done, just verify after revert).

### Files touched
| File | Change |
|---|---|
| `supabase/functions/generate-training-block/index.ts` | Replace daily-flatten block with forward-shift uniqueness + validation + structured error logging |

### Verification
After deploy, generate a 6-week block. Logs should show:
- Original cadence preserved (e.g., 3-4 workouts/week, not 7)
- Zero duplicate dates
- If RPC ever fails, exact PG code/message/hint visible

### Out of scope
- DB schema changes
- Client changes
- Daily-plan path

