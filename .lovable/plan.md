

# Quality Enforcement Audit — All 88 Drills

## Current State (from DB analysis)
- **88 drills** with instructions populated
- **60 drills** have fewer than 6 execution steps (FAIL — need upgrade)
- **8 drills** contain banned weak language ("focus on", "work on", "try to", etc.)
- **0 drills** have fewer than 3 coaching cues or fewer than 3 mistakes/progressions
- Setup content exists for all but needs semantic audit for missing distances/reps/equipment

**Bottom line: ~60-65 drills need rewriting.**

## Approach

### Step 1: Update the Edge Function prompt to enforce ELITE standards

Modify `populate-drill-instructions/index.ts` with these changes:

- **Execution minimum raised from 5 → 6 steps** in both the prompt and the validation gate (line 254)
- **Each execution step** must include: specific body movement + direction + timing/sequencing
- **Setup** must explicitly include: distances, equipment, stance, reps AND sets
- **Coaching cues**: 3–5 max, each 3–6 words, coach-yellable
- **Mistakes**: must describe incorrect movement + why it happens + what it causes
- **Progression**: must specify the exact mechanism (speed/reaction/movement/pressure/constraint)
- **Banned phrases list expanded** in the system prompt
- **Required verbs enforced**: drive, explode, snap, rotate, extend, plant, fire

### Step 2: Invoke the function with `force: true` to rewrite ALL 88 drills

Since ~70% fail the new standard, rewrite everything uniformly rather than cherry-picking. Use `force: true` with small batches (`batch_size: 2, limit: 5`) to avoid timeouts.

### Step 3: Automated loop until all 88 are processed

Same batching strategy as before — continue until the function reports 0 remaining.

### Step 4: Post-audit validation queries

Run these checks against all 88 drills:
1. `jsonb_array_length(instructions->'execution') >= 6` — all must pass
2. No banned phrases in `instructions::text`
3. All coaching cues ≤ 6 words
4. All mistakes have 3+ entries
5. All progressions have 3+ entries

### Step 5: Print 5 random upgraded drills (full raw JSON)

For final human verification of quality.

## Files Changed
- `supabase/functions/populate-drill-instructions/index.ts` — upgraded prompt + validation

## No other files change. No database schema changes.

