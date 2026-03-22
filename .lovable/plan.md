

# Royal Timing — Timer Reset Bug & Master Control UI Fix

## 1. Timer Reset Bug (Critical)

**Root cause**: In `start()` (line 43-44), when synced, `syncOffsetRef.current` is always overwritten with the current video time. So after pause+resume via Auto mode, `start()` resets the offset to the current video position, making elapsed = 0.

**Fix in `src/hooks/useRoyalTimingTimer.ts`**:

- Track whether the timer has been started at least once with a `hasStartedRef` boolean ref
- In `start()`: only set `syncOffsetRef` on the **first** start (when `hasStartedRef` is false). On subsequent starts (resume), skip the offset update so elapsed continues from where it paused
- Reset `hasStartedRef` in `reset()` and `clear()`

```ts
// start() fix
const start = useCallback(() => {
  if (isRunning) return;
  if (isSynced && videoRef.current?.current) {
    if (!hasStartedRef.current) {
      syncOffsetRef.current = videoRef.current.current.currentTime * 1000;
      hasStartedRef.current = true;
    }
  } else {
    startTimeRef.current = performance.now();
  }
  setIsRunning(true);
}, [isRunning, isSynced]);
```

## 2. Master Control UI Overflow Fix

**Root cause**: The `flex-wrap` on the button row (line 342) combined with the InlineTimer + speed selector causes overflow on 390px viewports.

**Fix in `src/components/royal-timing/RoyalTimingModule.tsx`** (lines 338-373):

- Remove `flex-wrap` from the button container, use `overflow-hidden` with `min-w-0`
- Reduce button gaps and sizes for mobile: `gap-0.5`, buttons `h-6 w-6`
- Make the speed selector narrower: `w-14`
- Use `justify-between` instead of `justify-center` to distribute evenly
- Add `overflow-x-auto` as fallback if content still overflows

## Files

| File | Change |
|------|--------|
| `src/hooks/useRoyalTimingTimer.ts` | Add `hasStartedRef` to prevent offset reset on resume |
| `src/components/royal-timing/RoyalTimingModule.tsx` | Fix master control button container overflow on mobile |

