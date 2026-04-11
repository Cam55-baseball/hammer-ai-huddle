

# Continue Quality Enforcement — Rewrite All 88 Drills

## Current State
- Edge function already has elite prompt + validation (6-step min, banned phrases, etc.)
- **35 drills** fail execution step count (<6)
- **4 drills** contain banned language
- ~39 drills need rewriting minimum, but running `force: true` on all 88 ensures uniform quality

## Execution

### Step 1: Invoke edge function in a loop
- Parameters: `{ "force": true, "batch_size": 1, "limit": 4, "offset": 0 }`
- Increment offset by 4 each call
- Continue until offset >= 88
- Use `batch_size: 1` (proven reliable — avoids timeouts)

### Step 2: Track progress after each call
- Log `updated` count from response
- Query: `SELECT COUNT(*) FROM drills WHERE is_active = true AND jsonb_array_length(instructions->'execution') < 6`
- Stop when that returns 0

### Step 3: Post-audit validation (all 88)
Run these checks:
1. `jsonb_array_length(instructions->'execution') >= 6` — all must pass
2. No banned phrases in `instructions::text`
3. All coaching cues arrays have 3–5 entries
4. All mistakes arrays have 3+ entries
5. All progressions arrays have 3+ entries

### Step 4: Print 5 random upgraded drills (full raw JSON)
For final human quality verification.

## Estimated invocations
~22 calls at limit 4, batch_size 1 (each processes 4 drills sequentially)

## No file changes needed
Edge function is already deployed with the elite prompt.

