

# Fix: PWA Update Notification Must Persist Until Acknowledged

## Problem

The recent toast auto-dismiss fix added a hard-coded 3-second timeout to ALL toasts in `src/hooks/use-toast.ts`. The PWA update prompt (`PWAUpdatePrompt.tsx`) passes `duration: 0` to indicate it should stay forever, but the auto-dismiss code ignores this.

## Solution

**File: `src/hooks/use-toast.ts`**

In the `toast()` function, wrap the auto-dismiss `setTimeout` in a condition that checks whether `duration` is `0`. If it is, skip the auto-dismiss entirely.

Change:
```typescript
// Auto-dismiss after 3 seconds
setTimeout(() => {
  dismiss();
}, 3000);
```

To:
```typescript
// Auto-dismiss after specified duration (skip if duration is 0 = persistent)
if (props.duration !== 0) {
  setTimeout(() => {
    dismiss();
  }, props.duration || 3000);
}
```

This means:
- `duration: 0` -- toast stays until manually dismissed (used by PWA update prompt)
- `duration: undefined` (default) -- auto-dismiss after 3 seconds
- `duration: 5000` (custom) -- auto-dismiss after 5 seconds

No other files need changes. `PWAUpdatePrompt.tsx` already passes `duration: 0` correctly.

