
# Fix Plan: Tex Vision Drill Issues

## Problems Identified

### 1. Near-Far Sight Drill - Taps Not Being Registered
**Root Cause**: Race condition between auto-hide timeout and user click handler
- When `generateNewTarget()` runs, it schedules an auto-hide timeout (line 42-55)
- When user taps, `handleFocusClick()` also tries to hide the target and generate a new one
- The original timeout continues running in the background, causing double-counting and state corruption
- No timeout cancellation mechanism exists

### 2. Near-Far Sight & Follow the Target - No Completion Indication
**Root Cause**: Drills transition directly to conclusion phase without visual feedback
- Both drills call `onComplete()` which transitions to the conclusion phase in ActiveDrillView
- There's no in-drill "Complete!" message or animation before the transition
- Users see the timer hit 0 but get no immediate feedback within the drill area

### 3. Critical Fatigue Warning - End Session Button Hard to Read
**Root Cause**: Light text color on light background
- `text-tex-vision-text` class uses HSL(40, 25%, 95%) which is nearly white
- The critical state uses a dark background, but the button border/text color appears light green/cream
- Need to use a darker, higher-contrast text color for the End Session button

---

## Technical Solution

### File 1: `src/components/tex-vision/drills/NearFarSightGame.tsx`

**Changes:**
1. Add a `useRef` to track the current timeout ID
2. Cancel pending timeout when user taps a target
3. Add a completion overlay that shows "Complete!" before transitioning
4. Fix the `isPaused` prop not being respected in the auto-hide timeout
5. Add a brief completion state visual before calling `onComplete`

```text
Key code changes:
- Add: const autoHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
- In generateNewTarget(): Store timeout ID and respect isPaused
- In handleFocusClick(): Clear pending timeout with clearTimeout
- Add completion overlay that shows when isComplete = true
- Add 1.5s delay before calling onComplete to show visual feedback
```

### File 2: `src/components/tex-vision/drills/FollowTheTargetGame.tsx`

**Changes:**
1. Add completion overlay that shows when `isComplete = true`
2. Add a brief delay before calling `onComplete` to show visual feedback
3. Ensure the completion message is clearly visible to the user

```text
Key code changes:
- Add completion state visual overlay
- Show "Complete!" message with accuracy when timer ends
- Add 1.5s delay before calling onComplete
```

### File 3: `src/components/tex-vision/shared/FatigueIndicator.tsx`

**Changes:**
1. Change the End Session button text color from light cream to a dark, high-contrast color
2. Use a dedicated dark color class for critical state buttons to ensure readability
3. Update border color to match for consistency

```text
Key code changes (lines 152-160):
- Change: text-tex-vision-text → text-gray-900 dark:text-gray-100
- Change: border-tex-vision-text/50 → border-gray-800 dark:border-gray-200
- This ensures the "End Session" text is dark on light backgrounds and readable
```

---

## Summary of Changes

| File | Issue | Fix |
|------|-------|-----|
| `NearFarSightGame.tsx` | Taps not registering | Add timeout ref, cancel on tap, fix race condition |
| `NearFarSightGame.tsx` | No completion feedback | Add completion overlay before transitioning |
| `FollowTheTargetGame.tsx` | No completion feedback | Add completion overlay before transitioning |
| `FatigueIndicator.tsx` | Button text hard to read | Use dark text color (gray-900) instead of tex-vision-text |

---

## Expected Outcome

1. **Near-Far Sight**: Every tap on a glowing target will be immediately registered, score will increment, and new targets will appear predictably without double-counting

2. **Both Drills**: When timer reaches 0, users will see a clear "Complete!" overlay with their final accuracy for 1.5 seconds before transitioning to the conclusion screen

3. **Fatigue Warning**: The "End Session" button will have dark, easily readable text regardless of the background color
