

# Add Pre-Delay Staleness Guard to Retry Logic

## Current State
Line 146 has the **post-delay** guard (`currentRequestId !== requestIdRef.current`), which is correct. However, there is no **pre-delay** guard — the 1-second `setTimeout` still schedules even if a newer request already started.

## Change — `src/hooks/useBlockWorkoutGenerator.ts`

At line 144, add the pre-delay guard before the `await new Promise`:

```typescript
if (!isAuthError) {
  if (!mountedRef.current || currentRequestId !== requestIdRef.current) return null;  // BEFORE delay
  await new Promise(r => setTimeout(r, 1000));
  if (!mountedRef.current || currentRequestId !== requestIdRef.current) return null;  // AFTER delay
  generatedData = await attemptGenerate();
}
```

This is a single-line insertion at line 145 (before the existing delay line).

## Result
Both guards in place — retry cannot schedule or execute if a newer request exists.

