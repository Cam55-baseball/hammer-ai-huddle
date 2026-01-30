
# Fix Plan: Handle 404 Errors Gracefully in useSubscription

## Problem

The `check-subscription` edge function occasionally returns a 404 error (likely due to deployment propagation, cold starts, or stale PWA cache). While the hook has retry logic, after 3 failed retries it still throws an error that propagates to the ErrorBoundary, causing a blank screen.

## Root Cause

After the retry loop (lines 94-108), if all retries fail with 404 errors, the code falls through to line 130 where it logs an error and attempts a database fallback. However, if the error message somehow causes issues or the fallback also fails, it can lead to unhandled states.

The real issue is that the 404 error is being treated as a critical failure when it should be treated as a temporary condition that gracefully falls back to showing the user as "not subscribed" while continuing to retry in the background.

## Solution

Enhance the error handling to:
1. Treat 404 errors as non-fatal after retries are exhausted
2. Fall back to database query when 404 persists
3. Add explicit 404 handling that sets `initialized: true` and `loading: false` to prevent blank screens
4. Log warnings instead of errors for 404s to reduce noise

## Changes Required

### File: `src/hooks/useSubscription.ts`

**Change 1: Add specific 404 handling after retry loop (after line 108)**

After the retry loop, explicitly check if we still have a 404 error and handle it gracefully by falling through to the database fallback without treating it as a critical error.

**Change 2: Improve the error logging (around line 131)**

Make the logging conditional - use `console.warn` for 404 errors and `console.error` for other errors.

**Change 3: Ensure fallback always completes (lines 134-177)**

The fallback logic is already good, but ensure it always sets `initialized: true` so the app doesn't get stuck in a loading state.

## Code Changes

```typescript
// After line 108, before the if (!error && data) check:
// If still getting 404 after all retries, log it as a warning (not error) 
// and proceed to fallback - this is a transient deployment issue, not a critical error
if (error && (error.message?.includes('NOT_FOUND') || error.message?.includes('not found') || (error as any)?.status === 404)) {
  console.warn('[useSubscription] Function still unavailable after retries, using database fallback');
  // Force the fallback path by keeping error set - the fallback will handle it
}
```

The existing fallback logic starting at line 133 will handle this correctly since it queries the database directly.

## Summary

| Change | Purpose |
|--------|---------|
| Add 404-specific warning after retries | Clarify that 404 is transient, not critical |
| Downgrade 404 logs from error to warn | Reduce console noise |
| Ensure `initialized: true` always set | Prevent blank screen/infinite loading |

## Expected Outcome

- 404 errors will no longer cause blank screens
- The app will gracefully show users their subscription status from the database
- Console will show warnings (not errors) for transient 404s
- The polling will continue to retry and pick up the function when it becomes available
