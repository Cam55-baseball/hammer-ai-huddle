

# Fix: Make Adult Wellness Score Values Readable

## Problem
The score values in the Adult Wellness Tracking summary card (e.g., "3/5 -- Moderate") use `text-violet-300`, which is a light purple that's hard to read against the semi-transparent `bg-violet-700/20` background -- particularly in light mode.

## Change

**File: `src/components/physio/PhysioAdultTrackingSection.tsx`** (line 19)

Change the score badge styling from:
```
text-violet-300 bg-violet-700/20
```
to:
```
text-violet-900 dark:text-violet-200 bg-violet-700/20
```

This gives:
- **Light mode**: Very dark purple text (`violet-900`) for strong contrast
- **Dark mode**: Light purple text (`violet-200`) that remains readable on dark backgrounds

Single line change, no other files affected.

