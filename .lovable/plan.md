
# Fix Glowing Animation Not Showing on Important Message

## Problem Identified

The glowing animation on the "Important" message box is **not visible** because `App.css` is never imported in the application.

| File | Status |
|------|--------|
| `src/App.css` | Contains the animation ✓ |
| `src/pages/Checkout.tsx` | Uses the class ✓ |
| `src/main.tsx` | Only imports `index.css` ✗ |
| `src/App.tsx` | Does NOT import `App.css` ✗ |

The CSS file with the animation exists but is orphaned - never loaded by the application.

---

## Solution

Import `App.css` in `App.tsx` to load the custom animation styles.

### File to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add `import "./App.css";` near the top of the file |

---

## Technical Implementation

Add this import near line 2 of `src/App.tsx`:

```typescript
// Line 1
// Force rebuild to clear stale module references - Dec 2025
import { Suspense, lazy, useEffect, ComponentType } from "react";
import "./App.css"; // <-- Add this import
import { Toaster } from "@/components/ui/toaster";
// ... rest of imports
```

---

## Why This Fixes the Issue

1. The `animate-glow-pulse-amber` class is defined in `App.css`
2. Without importing `App.css`, those styles never reach the browser
3. Once imported, the keyframes and animation class become available
4. The Important box will display the amber glowing pulse effect

---

## Expected Outcome

After this fix:
- The amber "Important" message box will have a visible glowing pulse animation
- The glow will pulse every 2 seconds with a soft amber/orange color
- Works in both light and dark modes
