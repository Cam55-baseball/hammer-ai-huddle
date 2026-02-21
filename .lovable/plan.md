
# Fix: Make "Private" Badge Readable

## Problem
The "Private" badge on the Adult Wellness Tracking card uses `text-violet-300`, the same hard-to-read light purple that was just fixed on the score values.

## Change

**File: `src/components/physio/PhysioAdultTrackingSection.tsx`** (line 50)

Change the Badge text color from `text-violet-300` to `text-violet-900 dark:text-violet-200` to match the score value fix.

Before:
```
bg-violet-700/30 border-violet-700/50 text-violet-300 text-[10px]
```

After:
```
bg-violet-700/30 border-violet-700/50 text-violet-900 dark:text-violet-200 text-[10px]
```

Single line change, no other files affected.
