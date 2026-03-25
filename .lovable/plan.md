

# Fix: Deduplicate useSubscription Calls

## Problem
`useSubscription()` is used in 22+ components. Each instance independently calls `checkSubscription`, creating a stampede of concurrent edge function calls. When a token is expired, multiple instances race to refresh it simultaneously, causing cascading 401 "missing sub claim" errors.

The console logs show 20+ simultaneous "Auth error detected, attempting token refresh..." messages — all fighting over the same session.

## Solution
Add a **module-level deduplication lock** so that only one `checkSubscription` call runs at a time. All concurrent callers wait for the same in-flight promise.

## Changes

**`src/hooks/useSubscription.ts`**

Add a module-scoped `inflight` promise variable outside the hook:

```typescript
let inflightCheck: Promise<void> | null = null;
```

Inside `checkSubscription`, wrap the logic so if a check is already running, subsequent callers await the same promise instead of starting new ones:

```typescript
const checkSubscription = useCallback(async (silent: boolean = false) => {
  if (inflightCheck) {
    await inflightCheck;
    return;
  }
  inflightCheck = doCheckSubscription(silent).finally(() => {
    inflightCheck = null;
  });
  await inflightCheck;
}, []);
```

Move the current `checkSubscription` body into a `doCheckSubscription` inner function. This ensures only one edge function call + refresh cycle runs at a time across all 22+ component instances.

No other files need changes.

