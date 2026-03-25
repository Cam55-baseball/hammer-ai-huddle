

# Fix: Modules Not Loading Due to Broken Deduplication

## Root Cause

`useSubscription()` is called in 22+ components. Each call creates an independent `useState` with its own `setSubscriptionData`. The module-level `inflightCheck` deduplication means only the **first** instance that triggers `doCheckSubscription` will have its `setSubscriptionData` called. All other instances `await inflightCheck` and return early — their state is never updated, so `modules` stays `[]`.

## Solution

Store the last successful subscription result in a **module-level shared variable**. When an instance awaits the deduplicated promise, it reads from this shared cache and calls its own `setSubscriptionData` with the cached result.

## Changes

**`src/hooks/useSubscription.ts`**

1. Add a module-level `let lastResult: SubscriptionData | null = null` alongside the existing `inflightCheck`.
2. In `doCheckSubscription`, after every `setSubscriptionData(...)` call, also assign the same value to `lastResult`.
3. In `checkSubscription`, after awaiting an existing `inflightCheck`, read from `lastResult` and call `setSubscriptionData(lastResult)` so the waiting instance gets the data too.
4. On `SIGNED_OUT`, clear `lastResult = null`.

This is a minimal change — roughly 10 lines added — and preserves the deduplication benefit (single network call) while ensuring every hook instance gets the result.

| File | Change |
|------|--------|
| `src/hooks/useSubscription.ts` | Add `lastResult` module-level cache; populate it on every `setSubscriptionData` call; read it after awaiting `inflightCheck` |

