

# Fix: Royal Timing Video Controls Not Working

## Root Cause

The `VideoPlayer` component receives `videoRef` as a prop (`RefObject<HTMLVideoElement>`) from the parent. The control buttons use `videoRef.current?.play()`, `videoRef.current?.pause()`, etc. The issue is that the parent's ref (`useRef<HTMLVideoElement>(null)`) and the child's usage can have timing/reference mismatches — particularly when React's reconciliation re-renders the child, the prop ref may not reliably point to the current DOM element for inline click handlers.

## Fix

**File: `src/components/royal-timing/VideoPlayer.tsx`**

Switch to using a **local ref** inside `VideoPlayer` for the `<video>` element, and sync the parent's ref using a callback ref pattern:

1. Create a local `localVideoRef = useRef<HTMLVideoElement>(null)`
2. Use a callback ref on the `<video>` element that sets BOTH the local ref and the parent's ref
3. All control button handlers use `localVideoRef.current` (guaranteed local, no prop indirection)
4. The parent still gets the ref value for master controls and timer sync

```tsx
const localVideoRef = useRef<HTMLVideoElement>(null);

const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
  localVideoRef.current = el;
  // Sync parent ref
  if (typeof videoRef === 'object' && videoRef !== null) {
    (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
  }
}, [videoRef]);
```

Then replace `ref={videoRef}` with `ref={setVideoRef}` on the video element, and change all handlers to use `localVideoRef.current`.

This ensures the control buttons always have a reliable reference to the video DOM element.

