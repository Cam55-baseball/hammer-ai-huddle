

# Complete Drill Instruction Population — Execution

## Current State
- **56 drills** remaining with `instructions IS NULL`
- User confirmed logged in as owner (JWT will be auto-injected)

## Execution Plan

### Automated Loop
I will invoke the edge function repeatedly with these parameters:
- `force: false` (never overwrite existing)
- `batch_size: 4` (start here, fall back to 3 on timeout)
- `limit: 20` per call

After each call:
1. Check response for success/error
2. Query `SELECT COUNT(*) FROM drills WHERE is_active = true AND instructions IS NULL`
3. Report: total, updated this batch, remaining
4. If remaining > 0, invoke again
5. If timeout, reduce batch_size and retry

### Estimated calls: ~3-4 at limit 20

### After completion
Query 5 random drills and print their full instruction payloads for quality verification.

### No code changes needed
Just repeated invocations of the existing deployed function.

