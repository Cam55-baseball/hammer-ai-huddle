

# AI Workout Generator — Final Hardening (Stale Response + Retry Safety)

## What's Missing

The current hook has a `generatingRef` lock and `mountedRef` guard but lacks:
1. **Request ID tracking** — a second request can start after the first completes but before its state update commits, letting a late retry overwrite fresh data.
2. **Retry uses no staleness check** — the 1-second retry doesn't verify it's still the active request.
3. **Response validation is loose** — checks `Array.isArray(data.exercises)` but doesn't validate `typeof data === 'object'`.

## Changes — `src/hooks/useBlockWorkoutGenerator.ts`

### 1. Add `requestIdRef`
```typescript
const requestIdRef = useRef(0);
```

### 2. Increment at request start (after the `generatingRef` lock, line 84)
```typescript
const currentRequestId = ++requestIdRef.current;
```

### 3. Stale-response guard before state updates
At line 153, before `setResult`:
```typescript
if (currentRequestId !== requestIdRef.current) return null;
```

### 4. Stale-response guard before retry (line 146)
```typescript
if (!mountedRef.current || currentRequestId !== requestIdRef.current) return null;
```

### 5. Strict response validation (replace lines 102-122)
```typescript
if (!data || typeof data !== 'object') {
  throw new Error('No response from server');
}
if (data.error) { /* existing error handling */ }
if (!data.exercises || !Array.isArray(data.exercises)) {
  throw new Error('Invalid response format');
}
```

### 6. Clean state reset in `finally`
Already correct — `generatingRef.current = false` and `setIsGenerating(false)` run at all exit points. No change needed.

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useBlockWorkoutGenerator.ts` | Add `requestIdRef`, stale-response guards before retry and before `setResult`, strict `typeof` validation on response |

## Result
- **No stale responses**: only the latest `requestId` can write to state
- **No double execution**: `generatingRef` lock unchanged
- **No invalid data reaches UI**: strict object + array validation before use
- **Retry is safe**: checks `requestId` before executing

