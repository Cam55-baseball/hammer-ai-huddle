
# Fix: Pre-Lift Check-in Body Map Zoom-Out Issue

## Problem Summary

Users are unable to zoom out on the body map during the pre-workout check-in on mobile devices. Once zoomed in, they're stuck and cannot zoom back out.

## Root Cause Analysis

The current implementation has multiple issues:

1. **Global viewport restriction** (`index.html` line 6): The meta tag `user-scalable=no` and `maximum-scale=1.0` completely blocks native browser zoom - this is intentional for the app overall but requires custom zoom handling in specific components

2. **Pinch-to-zoom math issue** (`BodyMapSelector.tsx` lines 50-59): The current implementation updates `touchRef.current.distance` on every `touchmove` event, making the zoom calculation multiplicative/incremental. While this mostly works, it can cause erratic behavior when quickly pinching out

3. **Missing zoom reset on dialog open**: When the dialog opens, the `zoomLevel` state doesn't reset to 1, so if a user closed the dialog while zoomed in, they reopen it still zoomed

4. **No visible zoom-out UI when stuck**: The "Reset Zoom" button correctly appears when zoomed (line 116-129), but users may not notice it or it may not be responsive enough

---

## Technical Solution

### File 1: `src/components/vault/quiz/BodyMapSelector.tsx`

**Changes:**

1. **Fix pinch-to-zoom calculation** - Store the initial distance at pinch start and calculate zoom relative to it, rather than updating on every move. This provides smoother, more predictable zoom behavior

2. **Add zoom out visual feedback** - Make the Reset Zoom button more prominent and always visible when zoomed

3. **Add pinch visual indicator** - Show current zoom level during pinch gesture

4. **Improve touch handling** - Ensure touchEnd properly resets the touch tracking state

```typescript
// Current problematic code:
const handleTouchMove = (e: React.TouchEvent) => {
  if (e.touches.length === 2 && touchRef.current) {
    const newDistance = getDistance(e.touches[0], e.touches[1]);
    const scale = newDistance / touchRef.current.distance;
    setZoomLevel((prev) => Math.min(Math.max(prev * scale, 1), 3));
    // BUG: Updating distance makes it multiplicative
    touchRef.current = {
      distance: newDistance,
      center: getCenter(e.touches[0], e.touches[1]),
    };
  }
};

// Fixed code:
const handleTouchMove = (e: React.TouchEvent) => {
  if (e.touches.length === 2 && touchRef.current) {
    const newDistance = getDistance(e.touches[0], e.touches[1]);
    // Calculate scale relative to INITIAL distance, not previous frame
    const scale = newDistance / touchRef.current.initialDistance;
    // Apply scale to INITIAL zoom level, not current
    const newZoom = Math.min(Math.max(touchRef.current.initialZoom * scale, 1), 3);
    setZoomLevel(newZoom);
  }
};
```

5. **Store initial zoom at pinch start** - Capture both initial distance AND initial zoom level when pinch begins

6. **Add zoom indicator overlay** - Show zoom percentage during active pinch for user feedback

### File 2: `src/components/vault/VaultFocusQuizDialog.tsx`

**Changes:**

1. No direct changes needed - the BodyMapSelector is already a controlled component that resets when the dialog closes (form state resets in handleSubmit)

---

## Implementation Details

### Updated State & Refs

```typescript
// Before
const touchRef = useRef<{ distance: number; center: { x: number; y: number } } | null>(null);

// After - include initial zoom state
const touchRef = useRef<{ 
  initialDistance: number; 
  initialZoom: number; 
  center: { x: number; y: number };
  isPinching: boolean;
} | null>(null);
```

### Updated Touch Handlers

```typescript
const handleTouchStart = (e: React.TouchEvent) => {
  if (e.touches.length === 2) {
    e.preventDefault(); // Prevent page scroll during pinch
    const distance = getDistance(e.touches[0], e.touches[1]);
    const center = getCenter(e.touches[0], e.touches[1]);
    touchRef.current = { 
      initialDistance: distance, 
      initialZoom: zoomLevel,  // Capture current zoom at pinch start
      center,
      isPinching: true 
    };
  }
};

const handleTouchMove = (e: React.TouchEvent) => {
  if (e.touches.length === 2 && touchRef.current?.isPinching) {
    e.preventDefault();
    const newDistance = getDistance(e.touches[0], e.touches[1]);
    const scale = newDistance / touchRef.current.initialDistance;
    // Apply to initial zoom, clamped 1-3x
    const newZoom = Math.min(Math.max(touchRef.current.initialZoom * scale, 1), 3);
    setZoomLevel(newZoom);
  }
};

const handleTouchEnd = () => {
  if (touchRef.current) {
    touchRef.current = null;
  }
};
```

### Enhanced UI

1. **Always-visible zoom controls when zoomed**:
   - Show current zoom level percentage (e.g., "150%")
   - More prominent "Reset Zoom" button with larger touch target
   - Add a "−" button for manual zoom-out steps

2. **Zoom indicator during pinch**:
   - Floating badge showing current zoom level while pinching
   - Haptic feedback at 1x, 2x, and 3x thresholds

---

## Expected Outcome

1. **Reliable zoom in/out**: Pinch-to-zoom will work smoothly in both directions, calculating relative to the initial pinch distance and zoom level

2. **Clear visual feedback**: Users will see their current zoom level and have multiple ways to zoom out (pinch, reset button, manual step button)

3. **No stuck states**: The pinch gesture properly terminates on touch end, and the reset button provides a guaranteed escape hatch

---

## Files Changed

| File | Changes |
|------|---------|
| `src/components/vault/quiz/BodyMapSelector.tsx` | Fix pinch math, add zoom indicator, enhance UI |
