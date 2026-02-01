
# Fix Vertical Scrolling for Past Days in Vault

## Problem
When viewing past days in the Vault, users cannot scroll vertically to see all the day's content. The current implementation uses Radix UI's `ScrollArea` component, but this has known touch scrolling issues on mobile devices.

## Root Cause Analysis

**File:** `src/components/vault/VaultDayRecapCard.tsx` (Line 296)
```tsx
<ScrollArea className="max-h-[60vh] sm:max-h-[70vh]">
```

The Radix UI `ScrollArea` component has limitations:
- Touch scrolling on mobile can be unreliable
- The `ScrollAreaPrimitive.Viewport` doesn't enable native scroll behavior
- Parent container context (inside `CollapsibleContent`) may conflict with the scrolling mechanism

## Evidence from Codebase

Other Vault components successfully use native `overflow-y-auto` for scrolling:

| Component | Implementation |
|-----------|---------------|
| `VaultFocusQuizDialog.tsx` | `overflow-y-auto max-h-[90vh]` |
| `VaultRecapCard.tsx` | `max-h-[85vh] overflow-y-auto` |
| `VaultStreakRecapCard.tsx` | `max-h-[85vh] overflow-y-auto` |
| `VaultWorkoutNotesDialog.tsx` | `overflow-y-auto max-h-[90vh]` |

## Solution

Replace `ScrollArea` with a native scrollable `div` using the established pattern in this codebase.

### Changes Required

**File: `src/components/vault/VaultDayRecapCard.tsx`**

1. **Remove ScrollArea import** (line 5):
   - Remove: `import { ScrollArea } from '@/components/ui/scroll-area';`

2. **Replace ScrollArea with native div** (lines 296 and 615):

   Change from:
   ```tsx
   <ScrollArea className="max-h-[60vh] sm:max-h-[70vh]">
     <div className="space-y-4 p-1">
       {/* content */}
     </div>
   </ScrollArea>
   ```

   Change to:
   ```tsx
   <div className="max-h-[60vh] sm:max-h-[70vh] overflow-y-auto">
     <div className="space-y-4 p-1">
       {/* content */}
     </div>
   </div>
   ```

## Why This Works

1. **Native scrolling**: Uses browser-native `overflow-y-auto` which has reliable touch support across all devices
2. **Proven pattern**: Matches the implementation used successfully in 4+ other Vault components
3. **Responsive heights**: Maintains the viewport-relative heights for proper sizing on different screen sizes
4. **Mobile-first**: Native scroll behavior works consistently on iOS Safari, Chrome for Android, and all desktop browsers

## Technical Summary

```text
Before:
  ScrollArea (Radix) → may block touch scroll on mobile
  
After:
  div + overflow-y-auto → native browser scrolling, reliable touch support
```

## Validation Steps

After implementation:
1. Open the Vault on a mobile device
2. Tap "Past Days" to expand the dropdown
3. Select a date with multiple entries
4. **Touch and swipe up/down** within the content area
5. Verify smooth scrolling through all entries (quizzes, workouts, nutrition, notes, etc.)
6. Confirm action buttons (Save, Export PDF, Close) remain visible below the scrollable area
