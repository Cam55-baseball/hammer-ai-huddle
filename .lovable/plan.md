
# Tex Vision Bug Fixes - E2E Stability Plan

## Problems Identified

### 1. Users Getting Locked Out of Tex Vision
**Root Cause:** The `useTexVisionAccess` hook doesn't expose loading states from its dependent hooks (`useSubscription`, `useOwnerAccess`, `useAdminAccess`). When the TexVision page renders, it evaluates `hasAccess` while these hooks are still loading (before roles/subscriptions are fetched), causing the locked state to briefly appear.

**Evidence:** The memory note `features/auth/access-control-loading-state-guard` explicitly documents this pattern must be followed.

**Fix Location:** `src/hooks/useTexVisionAccess.ts` and `src/pages/TexVision.tsx`

---

### 2. Confetti Raining for Extended Periods
**Root Cause:** The confetti cleanup logic in `src/lib/confetti.ts` uses a fixed fallback of 5 seconds (`Math.max(maxAnimationEnd + 500, 5000)`), but individual particle animations can extend longer due to random delays. Additionally, if multiple celebrations trigger rapidly (e.g., during race conditions with personal bests), the `isConfettiActive` lock doesn't properly prevent overlapping containers.

**Evidence:** Console logs show many simultaneous PATCH requests to personal bests, indicating race conditions that could trigger multiple celebrations.

**Fix Location:** `src/lib/confetti.ts`

---

### 3. Completed Drills Not Shown as Complete
**Root Cause:** Multiple race conditions exist:
1. **Personal bests race condition:** The `checkAndUpdatePersonalBest` function in `usePersonalBests.ts` can be called multiple times concurrently (console logs show 10+ simultaneous PATCH requests with duplicate key violations)
2. **Daily drill selection race condition:** Console logs show `duplicate key value violates unique constraint "tex_vision_daily_drill_selecti_user_id_sport_selection_date_key"`
3. **Network failures:** "Failed to fetch" errors during personal best updates can leave the system in an inconsistent state

**Evidence:** Console logs show error code 23505 (duplicate key constraint) and multiple parallel network requests to the same record.

**Fix Location:** 
- `src/hooks/usePersonalBests.ts` - Add completion guard/debounce
- `src/components/tex-vision/ActiveDrillView.tsx` - Prevent multiple onComplete calls
- `src/hooks/useDailyDrillSelection.ts` - Add upsert conflict handling

---

### 4. Finish/End Screen Stuck on Screen
**Root Cause:** The conclusion phase in `ActiveDrillView.tsx` relies on `isCompletingDrill` state and the "Done" button's async `onComplete` call. If this call fails or hangs, the user is stuck. The current error handling calls `onExit()` as fallback, but there's no timeout mechanism.

Additionally, if the `onComplete` callback in `TexVision.tsx` encounters an error during `saveDrillResult`, `updateChecklist`, or `updateStreak`, it doesn't set `activeDrill` to null, leaving the drill view visible.

**Evidence:** The error handling in `handleDrillComplete` (TexVision.tsx) doesn't have try/catch with proper cleanup.

**Fix Location:**
- `src/pages/TexVision.tsx` - Add try/catch with cleanup
- `src/components/tex-vision/ActiveDrillView.tsx` - Add timeout for stuck states

---

## Technical Solution

### File 1: `src/hooks/useTexVisionAccess.ts`

**Changes:**
1. Import loading states from `useSubscription`, `useOwnerAccess`, `useAdminAccess`
2. Compute an aggregate `loading` state
3. Only evaluate access after all hooks have finished loading
4. Export `loading` state for consumers

```typescript
// Add loading awareness
const { modules, loading: subLoading } = useSubscription();
const { isOwner, loading: ownerLoading } = useOwnerAccess();
const { isAdmin, loading: adminLoading } = useAdminAccess();

const loading = subLoading || ownerLoading || adminLoading;

// Only evaluate access when not loading
const hasAccess = useMemo(() => {
  if (loading) return false; // Defer access check until loaded
  return isOwner || isAdmin || hasHittingAccess;
}, [loading, isOwner, isAdmin, hasHittingAccess]);

return { hasAccess, loading, ... };
```

### File 2: `src/pages/TexVision.tsx`

**Changes:**
1. Import and use `loading` from `useTexVisionAccess`
2. Show loading spinner while access is being determined
3. Add try/catch with cleanup to `handleDrillComplete`

```typescript
const { hasAccess, loading: accessLoading } = useTexVisionAccess();

// Guard: wait for access to be determined
if (authLoading || accessLoading) {
  return <Loader2 />;
}

// Defensive error handling
const handleDrillComplete = useCallback(async (result: DrillResult) => {
  try {
    if (sessionId) {
      await saveDrillResult(sessionId, result);
      await updateChecklist(result.drillType, true);
      await updateStreak();
      // ... tier progression check
    }
  } catch (error) {
    console.error('Error completing drill:', error);
    toast.error('Failed to save drill results');
  } finally {
    // ALWAYS clear the active drill to prevent stuck state
    setActiveDrill(null);
  }
}, [...]);
```

### File 3: `src/lib/confetti.ts`

**Changes:**
1. Clear any existing confetti containers before creating new ones
2. Use a more aggressive cleanup timeout
3. Add a maximum duration cap to prevent runaway animations
4. Ensure the cleanup always runs even if errors occur

```typescript
export function triggerConfetti() {
  if (isConfettiActive) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Force cleanup any stale containers first
  stopConfetti();
  
  isConfettiActive = true;
  
  // ... particle creation ...
  
  // Cap maximum duration at 5 seconds regardless of calculations
  const cleanupTime = Math.min(maxAnimationEnd + 500, 5000);
  const cleanupTimeout = setTimeout(() => {
    container.remove();
    isConfettiActive = false;
  }, cleanupTime);
  
  // Store timeout for potential forced cleanup
  (container as any).__cleanupTimeout = cleanupTimeout;
}

export function stopConfetti() {
  const containers = document.querySelectorAll('[data-confetti-container]');
  containers.forEach(container => {
    const timeout = (container as any).__cleanupTimeout;
    if (timeout) clearTimeout(timeout);
    container.remove();
  });
  isConfettiActive = false;
}
```

### File 4: `src/hooks/usePersonalBests.ts`

**Changes:**
1. Add a completion guard using a ref to prevent concurrent calls for the same drill
2. Use optimistic locking pattern with retry logic
3. Handle duplicate key errors gracefully

```typescript
// Add completion guard ref
const completionInProgressRef = useRef<Set<string>>(new Set());

const checkAndUpdatePersonalBest = useCallback(async (...) => {
  const key = `${drillType}_${tier}`;
  
  // Prevent concurrent calls for same drill/tier
  if (completionInProgressRef.current.has(key)) {
    return { isNewAccuracyRecord: false, ... };
  }
  
  completionInProgressRef.current.add(key);
  
  try {
    // ... existing logic ...
  } catch (error: any) {
    // Handle duplicate key gracefully - record already exists
    if (error?.code === '23505') {
      console.log('Personal best already recorded, skipping duplicate');
      return { isNewAccuracyRecord: false, ... };
    }
    throw error;
  } finally {
    completionInProgressRef.current.delete(key);
  }
}, [...]);
```

### File 5: `src/components/tex-vision/ActiveDrillView.tsx`

**Changes:**
1. Add a ref to prevent multiple `handleDrillComplete` invocations
2. Add a timeout failsafe for the conclusion phase "Done" button
3. Ensure confetti is cleaned up when exiting

```typescript
// Add completion guard
const hasCompletedRef = useRef(false);

const handleDrillComplete = useCallback(async (partialResult) => {
  // Prevent multiple completions (race condition guard)
  if (hasCompletedRef.current) return;
  hasCompletedRef.current = true;
  
  // ... existing logic ...
}, [...]);

// Reset guard when drill changes
useEffect(() => {
  hasCompletedRef.current = false;
}, [drillId]);

// Add timeout for stuck conclusion phase
useEffect(() => {
  if (phase === 'conclusion' && isCompletingDrill) {
    const timeout = setTimeout(() => {
      console.warn('Drill completion timed out, forcing exit');
      stopConfetti();
      onExit();
    }, 10000); // 10 second failsafe
    return () => clearTimeout(timeout);
  }
}, [phase, isCompletingDrill, onExit]);

// Clean up confetti on exit
const handleExit = useCallback(() => {
  stopConfetti();
  onExit();
}, [onExit]);
```

### File 6: `src/hooks/useDailyDrillSelection.ts`

**Changes:**
1. Use proper upsert with conflict handling
2. Add error recovery for duplicate key violations

```typescript
// In saveSelection function - handle race conditions
const saveSelection = useCallback(async (...) => {
  try {
    // Use upsert with proper conflict resolution
    const { error } = await supabase
      .from('tex_vision_daily_drill_selection')
      .upsert({
        user_id: userId,
        sport,
        selection_date: date,
        selected_drills: JSON.parse(JSON.stringify(drills)),
        selection_reasons: JSON.parse(JSON.stringify(selectionReasons)),
      }, {
        onConflict: 'user_id,sport,selection_date',
      });
    
    if (error) throw error;
  } catch (error: any) {
    // Handle duplicate key gracefully
    if (error?.code === '23505') {
      console.log('Selection already exists, using existing');
      return;
    }
    console.error('Error saving daily drill selection:', error);
  }
}, [...]);
```

---

## Summary of Changes

| File | Issue | Fix |
|------|-------|-----|
| `useTexVisionAccess.ts` | Users locked out | Add loading state, defer access check |
| `TexVision.tsx` | Locked out + stuck screen | Guard with loading, add try/finally cleanup |
| `confetti.ts` | Long confetti duration | Force cleanup, cap duration, clear stale |
| `usePersonalBests.ts` | Duplicate updates | Add guard ref, handle 23505 error |
| `ActiveDrillView.tsx` | Stuck screen + race conditions | Add completion guard, timeout failsafe |
| `useDailyDrillSelection.ts` | Duplicate selection errors | Use upsert with conflict handling |

---

## Expected Outcome

1. **No lockouts:** Users will see a loading spinner while access is determined, then the correct content
2. **Controlled confetti:** Confetti will always clear within 5 seconds maximum
3. **Reliable completion tracking:** Race conditions prevented via guards and proper error handling
4. **No stuck screens:** 10-second timeout ensures users can always exit, plus proper try/finally cleanup
