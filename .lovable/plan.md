

# Fix: Save Session Button Not Working in Base Stealing

## Root Cause Analysis

Traced through the save flow:
1. `SessionSummary.tsx` button calls `onSave` → `handleSave` in `BaseStealingTrainer.tsx`
2. `handleSave` calls `createSession` from `usePerformanceSession`
3. `createSession` has a check `if (!user) throw new Error('Not authenticated')` **BEFORE** the try/catch block
4. **Critical**: `handleSave` has NO try/catch, so when `createSession` throws, the error is silently swallowed as an unhandled promise rejection

This means if:
- User isn't logged in → silent failure with no toast
- Any early validation fails → silent failure

Additionally, confirmed in database: **zero base_stealing sessions exist** — saves have never worked.

## Fix Plan

### 1. Add Error Handling to `handleSave` (BaseStealingTrainer.tsx)

Wrap the `createSession` call in try/catch to show meaningful errors:
- If user not authenticated → show login prompt
- If other error → show toast with error message

### 2. Check Authentication Earlier (BaseStealingTrainer.tsx)

Add authentication gate at session start to prevent wasted training time:
- In `handleStart`, check if user is logged in
- If not, show toast prompting login before starting

### 3. Fix Session Return Type (BaseStealingTrainer.tsx)

Currently checks `if (sessionId)` but `createSession` returns the full session object, not just ID. While this works (object is truthy), rename variable for clarity.

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/BaseStealingTrainer.tsx` | Add try/catch in `handleSave`, auth check in `handleStart`, show login prompt if needed |
| `src/hooks/usePerformanceSession.ts` | Move auth check inside try block so toast shows |

## Technical Details

```typescript
// BaseStealingTrainer.tsx - handleSave fix
const handleSave = async () => {
  if (!config || reps.length === 0) return;
  
  try {
    const session = await createSession({...});
    if (session) {
      toast({ title: 'Session saved!' });
      setPhase('analysis');
    }
  } catch (error: any) {
    if (error.message === 'Not authenticated') {
      toast({ 
        title: 'Sign in required', 
        description: 'Please sign in to save your session.',
        variant: 'destructive' 
      });
    }
    // Error already toasted in createSession for other cases
  }
};
```

```typescript
// usePerformanceSession.ts - Move auth check inside try
const createSession = async (data) => {
  setSaving(true);
  try {
    if (!user) throw new Error('Not authenticated');
    // ... rest of logic
  } catch (error) {
    toast({ title: 'Error', description: error.message });
    throw error;
  } finally {
    setSaving(false);
  }
};
```

