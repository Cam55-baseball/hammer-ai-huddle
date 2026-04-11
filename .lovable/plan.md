

# Complete Drill Instruction Population — Improved Strategy

## Current State
- **32/88** drills have instructions
- **56 remaining** with `instructions IS NULL`
- Edge function is deployed and working (JWT auth confirmed)
- Previous runs timed out at `batch_size: 5` but succeeded at `batch_size: 2, limit: 3`

## Plan

### Step 1: Invoke repeatedly with optimized parameters
- Use `force: false` (never overwrite existing)
- Start with `batch_size: 4, limit: 20` — if timeout, fall back to `batch_size: 3`
- After each call, query `SELECT COUNT(*) FROM drills WHERE is_active = true AND instructions IS NULL` to track remaining
- Continue invoking until remaining = 0

### Step 2: Progress reporting
After each invocation, report:
- `total_drills` (from response)
- `updated` (from response)
- `remaining` (from follow-up DB query)

### Step 3: Quality verification
Once all 88 drills are populated:
- Query 5 random drills: `SELECT name, instructions FROM drills WHERE is_active = true AND instructions IS NOT NULL ORDER BY random() LIMIT 5`
- Print their full instruction payloads for review

### No code changes needed
The edge function already supports `force: false` and `batch_size`. Just need to invoke it repeatedly with the right parameters.

### Execution sequence
```text
Loop:
  1. POST /populate-drill-instructions  { "force": false, "batch_size": 4, "limit": 20 }
  2. SELECT COUNT(*) WHERE instructions IS NULL
  3. If remaining > 0, repeat
  4. If timeout, reduce batch_size by 1 and retry

Done:
  5. SELECT name, instructions FROM drills ... ORDER BY random() LIMIT 5
  6. Print results
```

Estimated: ~3-4 invocations to finish 56 drills at 20/call.

