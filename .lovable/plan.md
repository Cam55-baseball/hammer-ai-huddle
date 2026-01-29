
# Fix Plan: 6-Week Training Recap Close Button Hidden Behind Badge

## Problem

The close button (`X`) in the 6-Week Training Recap dialog is hidden behind the "Elite Analysis" badge in the top right corner. This happens because:

1. The dialog's close button is positioned at `absolute right-4 top-4`
2. The `DialogTitle` contains a flex container with the title text and "Elite Analysis" badge
3. On smaller screens or when the content wraps, the badge extends into the close button's area

## Solution

Add right padding to the `DialogTitle` to create space for the close button, ensuring the badge doesn't overlap with the `X`.

## Changes Required

### File: `src/components/vault/VaultStreakRecapCard.tsx`

**Line 506** - Update the `DialogTitle` className to add right padding:

**Current:**
```tsx
<DialogTitle className="flex items-center gap-2 flex-wrap">
```

**Updated:**
```tsx
<DialogTitle className="flex items-center gap-2 flex-wrap pr-8">
```

The `pr-8` (padding-right of 2rem/32px) creates enough space for the close button, which is positioned at `right-4` (1rem/16px) and has an icon size of `h-4 w-4` (1rem/16px).

## Summary

| Change | File | Line |
|--------|------|------|
| Add `pr-8` to DialogTitle | `src/components/vault/VaultStreakRecapCard.tsx` | 506 |

## Expected Outcome

After this fix:
- The close button will always be visible and clickable
- The "Elite Analysis" badge will wrap to a new line if needed rather than overlapping
- Clean, professional appearance on all screen sizes
