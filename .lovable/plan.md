

## Plan — Fix "Failed to generate training block" (date overflow)

### Root cause
In `generate-training-block/index.ts` (~line 530), when forward-shifting to resolve date collisions, if the shifted date exceeds the block's `end_date`, the function throws `Workout shifted beyond block end_date`. Logs confirm: `2026-06-01 > 2026-05-31`. With 5 training days/week × 6 weeks, the last workouts have zero forward headroom — any single collision spills past the end and aborts the whole generation.

### Fix (single file)
**`supabase/functions/generate-training-block/index.ts`** — change the overflow handler from throw → backward-shift fallback.

Inside the collision-resolution block:
1. Forward-shift as today, but if `finalDate > endDateObj`, instead of throwing:
   - Reset `d` to the original `parseLocalDate(sw.scheduled_date)`.
   - Walk **backward** (`d.setDate(d.getDate() - 1)`) until an unused date `>= startDateObj` is found.
   - If still no slot (extreme edge: every date in the block window is taken), then log `console.error` and **drop** the workout (skip with `return null`), then `.filter(Boolean)` after the map.
2. Keep the 365-iteration safety guard.
3. Keep all post-shift logic (re-sort, soft validations, RPC payload build) unchanged.

This guarantees:
- No throw on date overflow.
- Cadence is preserved within the block window.
- Worst case, one or two trailing workouts may be dropped rather than failing the entire 6-week generation. Logged for visibility.

### Verification
1. Click Generate with 5 days/week, 6-week block → succeeds; logs show `MODE: CREATE`, no overflow error, block visible in Game Plan.
2. Generate with 3 days/week → no collisions, no backward-shift triggered.
3. Adapt path → unaffected (same code path, but RPC archive logic already stable).

### Out of scope
- No DB migration. No client changes. No edge function CORS/auth changes.

