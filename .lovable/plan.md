

# AI Workout Generator — Production Hardening

## Changes

### File 1: `src/hooks/useBlockWorkoutGenerator.ts` — Full rewrite of the hook

**Fix 1 — Subscription loading guard**
- Import `loading` and `initialized` from `useSubscription()`, `loading` from `useOwnerAccess()`
- Expose `subscriptionReady` = `initialized && !ownerLoading`
- Block `generateExercises` early if `!subscriptionReady` — return null, no toast
- Only then check `!isOwner && modules.length === 0`

**Fix 2 — Request deduplication with AbortController**
- Add `useRef<AbortController | null>(null)` 
- At start of `generateExercises`: abort previous controller, create new one
- Pass `signal` to `supabase.functions.invoke` via the `body` isn't possible — instead use the `isGenerating` state as a hard lock: if `isGenerating` is already true, return null immediately (supabase-js doesn't support AbortController on `functions.invoke`)
- On unmount, abort any in-flight request via cleanup ref

**Fix 3 — Null response hardening**
- After `supabase.functions.invoke`, check `if (!data)` → throw `"No response from server"`
- Then check `if (data.error)` with existing logic

**Fix 4 — Safe parsing**
- Wrap the `data.error` check and `setResult(data)` in a try/catch that catches any property access failures
- Throw `"Failed to generate workout — invalid AI response"`

**Fix 5 — User-facing error UX**  
- No subscription: `"Your plan doesn't include workout generation"`
- Network/fetch error (includes "Failed to fetch", "network"): `"Connection issue — please try again"`
- AI/parse error (everything else): `"We couldn't generate your workout — retry in a moment"`

**Fix 6 — Retry logic**
- On non-auth failure, wait 1 second and retry once automatically
- Track retry count to prevent infinite loops

**Return values**: Add `subscriptionReady` to the returned object

### File 2: `src/components/elite-workout/intelligence/BlockWorkoutGenerator.tsx` — UI guard

- Destructure `subscriptionReady` from `useBlockWorkoutGenerator()`
- Update `canGenerate` to include `subscriptionReady`
- When `!subscriptionReady`, show "Checking access..." on the button instead of "Generate Exercises"
- Button already uses `disabled={isGenerating || !canGenerate}` — this naturally covers the loading state

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useBlockWorkoutGenerator.ts` | Loading guard, dedup lock, null check, safe parse, retry, error UX |
| `src/components/elite-workout/intelligence/BlockWorkoutGenerator.tsx` | Disable button + "Checking access..." while subscription loads |

