

## Plan — Final 2 safety fixes for `generate-training-block`

Single file: `supabase/functions/generate-training-block/index.ts`

### Context check first
Read current state to confirm:
- How `endDate` is currently typed/built in scope of the forward-shift loop
- Exact shape of the forward-shift `while` loop (variable names: `d`, `usedDates`, `toISO`, `finalDate`)

### Changes

1. **Normalize `endDate` to `Date` before comparison** — just before the forward-shift loop, coerce:
   ```ts
   const endDateObj = typeof endDate === 'string' ? parseLocalDate(endDate) : endDate;
   ```
   Update the overflow guard to compare against `endDateObj`:
   ```ts
   if (parseLocalDate(finalDate) > endDateObj) {
     throw new Error("Workout shifted beyond block end_date");
   }
   ```

2. **Infinite-loop guard in forward-shift** — wrap the existing `usedDates.has(...)` while loop with a counter that throws after 365 iterations:
   ```ts
   let guard = 0;
   while (usedDates.has(toISO(d))) {
     d.setDate(d.getDate() + 1);
     guard++;
     if (guard > 365) {
       throw new Error("Date collision resolution exceeded safe bounds");
     }
   }
   ```

### No other changes
- Validation guards, week continuity, payload binding, RPC error logging, RPC dedupe — all stay as-is.
- No DB or client changes.

### Verification
Generate a 6-week block end-to-end. Expected: clean RPC success. If it fails, the existing structured catch surfaces raw Postgres `code/message/details/hint`.

