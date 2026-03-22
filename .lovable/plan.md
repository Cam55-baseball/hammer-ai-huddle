

# Fix: InlineTimer Sync Button Overflow

## Problem

On mobile (390px), when the Master timer is synced, the `InlineTimer` row contains too many elements in a single flex row: label, time display, "Synced" badge, Auto toggle, play/pause, reset, and sync/unsync buttons. The last button overflows outside the container (visible in the screenshot — the unlink icon is clipped outside the card).

## Fix

**File: `src/components/royal-timing/InlineTimer.tsx`**

1. **Add `flex-wrap` and `overflow-hidden`** to the outer container so items wrap to a second line instead of overflowing
2. **Reduce gaps**: Change `gap-2` to `gap-1` to reclaim horizontal space
3. **Add `shrink-0`** to all buttons and badges so they don't get crushed
4. **Remove `ml-auto`** from the button group — with wrapping, `ml-auto` can cause odd spacing. Instead, let items flow naturally

Alternatively (and more cleanly): when `compact` is true (which it is for the mobile master timer), **wrap the timer into two rows** — top row for label + time + synced badge, bottom row for controls (auto toggle + buttons). This guarantees no overflow at any width.

**Chosen approach: Two-row layout when `compact`**

When `compact` prop is true:
- **Row 1**: Label, timer value, Synced badge
- **Row 2**: Auto toggle (if synced), Play/Pause, Reset, Sync/Unsync — with `flex-wrap` and small gaps

When `compact` is false (desktop): keep current single-row layout but add `overflow-hidden` as safety.

## Files

| File | Change |
|------|--------|
| `src/components/royal-timing/InlineTimer.tsx` | Split into two rows when `compact`, add overflow protection |

