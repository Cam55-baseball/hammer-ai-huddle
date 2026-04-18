

## Plan — Enforce unique sequential dates before RPC

### Root cause hypothesis
The AI-generated `scheduled_date` values for the 18 workouts in a 6-week block are not guaranteed unique/ordered. The `uq_block_workouts_date` constraint on `(block_id, scheduled_date)` aborts the atomic insert.

### Fix (single file)
`supabase/functions/generate-training-block/index.ts`

1. After AI generation produces `scheduledWorkouts`, build `normalizedWorkouts` with deterministic sequential dates derived from `startDate + dayOffset` — one day apart per workout in array order. This guarantees uniqueness regardless of what the AI returned.
2. Replace every downstream reference (RPC payload + `calendar_events` insert) to use `normalizedWorkouts` instead of `scheduledWorkouts`.
3. Pre-RPC guard: log the date array, detect duplicates, throw before RPC if any exist.

### Note on density
Sequential `+1 day` overrides the season-aware density logic (`pickOptimalSchedule`) for the actual date assignment. That's acceptable for V1 — fixing the failing path is the priority. Users can reschedule individual workouts via the existing per-row date picker. We'll add a follow-up note in the file comment.

### Files touched
| File | Change |
|---|---|
| `supabase/functions/generate-training-block/index.ts` | Insert normalization block + duplicate guard, swap variable usage downstream |

### Verification
Generate a 6-week block end-to-end. Logs should show 18 strictly increasing unique dates and the atomic insert should succeed.

### Out of scope
- No DB migration.
- No client changes.
- Smarter conflict-aware scheduling (defer to follow-up; current per-row reschedule already covers manual adjustment).

