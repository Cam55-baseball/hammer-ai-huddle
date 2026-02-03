
# Enable Scrolling in Nutrition Hub Settings Dialog

## Problem

The Nutrition Hub Settings dialog (`NutritionHubSettings.tsx`) doesn't allow scrolling on smaller screens or when content exceeds the viewport height. This makes the dialog content inaccessible on mobile devices.

---

## Solution

Add `max-h-[90vh]` and `overflow-y-auto` to the `DialogContent` component to enable vertical scrolling when content exceeds the available space.

---

## File to Update

| File | Changes |
|------|---------|
| `src/components/nutrition-hub/NutritionHubSettings.tsx` | Add scrolling classes to DialogContent |

---

## Technical Implementation

### `src/components/nutrition-hub/NutritionHubSettings.tsx`

**Line 97 - Update DialogContent className:**

```typescript
// Before:
<DialogContent className="sm:max-w-md">

// After:
<DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
```

This applies:
- `max-h-[90vh]` - Limits dialog height to 90% of viewport
- `overflow-y-auto` - Enables vertical scrollbar when content overflows

---

## Expected Outcome

- Dialog content will be scrollable on all screen sizes
- Works seamlessly on mobile devices with limited viewport height
- Consistent with the Weekly Wellness Goals dialog scroll fix pattern
