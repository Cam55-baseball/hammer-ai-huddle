

# Finish Quality Enforcement — 10 Remaining Drills

## Current State
- **78/88 drills** pass all elite standards
- **10 drills** have exactly 5 execution steps (need 6+): Bare Hand Exchange, Double Play Footwork Series, Timed Transfer Drill, 360 Field Awareness Drill, Quick Transfer Progression, Crow Hop Throwing, Velocity Ladder Drill, Opposite Field Soft Toss, Load/Stride Sync Drill, Take Drill: Off-Speed Only
- **2 of those 10** also contain banned phrases ("practice", "improve")
- Edge function is already deployed with elite validation

## Execution

### Step 1: Invoke edge function with `force: true` to rewrite failing drills
- Use `batch_size: 1, limit: 88, offset: 0` with `force: true`
- The function will reprocess all 88 but the validation gate will ensure only elite-quality outputs get saved
- Alternatively, can do targeted calls at specific offsets if we identify where these 10 drills sit

### Step 2: Verify all 88 pass
After invocation, run:
1. `SELECT COUNT(*) WHERE jsonb_array_length(instructions->'execution') < 6` — must be 0
2. `SELECT COUNT(*) WHERE instructions::text ~* banned phrases` — must be 0

### Step 3: Print 5 random upgraded drills (full raw JSON)
For final human quality verification.

## Risk
If the AI generates 5-step outputs again, the validation gate will reject them and those drills won't be updated. May need multiple retries for stubborn drills.

## No file changes needed
Edge function already has the elite prompt and validation.

