
# Fix Vertical Scrolling for Past Days in Vault

## Problem
When checking past days in the Vault, users cannot scroll vertically to see the whole day's content. The `VaultDayRecapCard` component has a fixed `max-h-[500px]` on its `ScrollArea`, which is too restrictive for days with many entries (quizzes, workouts, nutrition, custom activities, notes, etc.).

## Root Cause

**File:** `src/components/vault/VaultDayRecapCard.tsx` (Line 296)
```tsx
<ScrollArea className="max-h-[500px]">
```

This fixed height of 500px is problematic because:
- On mobile, 500px may be the entire viewport, leaving no room for the header or action buttons
- Days with many entries (10+ items) can easily exceed 500px of content
- The parent `CollapsibleContent` in `VaultPastDaysDropdown.tsx` doesn't have any height constraints or overflow handling

## Solution

### Approach: Dynamic Height with Mobile Optimization

Change the `ScrollArea` to use a dynamic viewport-based height that adapts to the screen size, ensuring users can always scroll to see all content.

**Updated height calculation:**
- Mobile: `max-h-[60vh]` - Uses 60% of viewport height, leaving room for header/actions
- Desktop: `max-h-[70vh]` - Uses 70% of viewport height for more content visibility

### Changes

**File: `src/components/vault/VaultDayRecapCard.tsx`**

Change line 296 from:
```tsx
<ScrollArea className="max-h-[500px]">
```

To:
```tsx
<ScrollArea className="max-h-[60vh] sm:max-h-[70vh]">
```

This change:
1. Uses viewport-relative heights instead of fixed pixels
2. Provides responsive behavior (smaller on mobile, larger on desktop)
3. Ensures content is always scrollable within the visible area
4. Leaves adequate space for the date header and action buttons above/below

## Technical Details

| Screen Size | Old Height | New Height | Benefit |
|-------------|------------|------------|---------|
| Mobile (375px) | 500px (133% of screen!) | ~225px (60% of screen) | Fits in viewport |
| Tablet (768px) | 500px (65% of screen) | ~460px (60% of screen) | Similar |
| Desktop (900px+) | 500px (55% of screen) | ~630px (70% of screen) | More visible |

## Validation

After this change:
- Open the Vault on mobile
- Tap "Past Days"
- Select a date with multiple entries
- Scroll vertically through all entries
- Action buttons (Save, Export PDF, Close) remain visible below the scrollable area
