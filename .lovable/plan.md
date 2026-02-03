
# Add Glowing Effect to Important Message Box

## Overview

Add a glowing animation to the yellow/amber "Important" message box on the Checkout page to draw more attention to the critical post-purchase instructions.

---

## Solution

Create an amber-colored glow animation and apply it to the "Important" message box.

### Files to Modify

| File | Change |
|------|--------|
| `src/App.css` | Add new amber glow keyframes and utility class |
| `src/pages/Checkout.tsx` | Apply the glow animation class to the Important box |

---

## Technical Implementation

### 1. Add Amber Glow Animation (App.css)

Add a new keyframe animation that uses amber colors instead of the primary pink:

```css
@keyframes glow-pulse-amber {
  0%, 100% { 
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4);
  }
  50% { 
    box-shadow: 0 0 16px 6px rgba(245, 158, 11, 0.35);
  }
}

.animate-glow-pulse-amber {
  animation: glow-pulse-amber 2s ease-in-out infinite;
}
```

### 2. Apply Animation to Important Box (Checkout.tsx)

Update the amber "Important" box div (currently at line 322):

**Before:**
```tsx
<div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
```

**After:**
```tsx
<div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6 animate-glow-pulse-amber">
```

---

## Visual Effect

The animation will:
- Create a soft amber/orange glow around the box
- Pulse continuously to attract user attention
- Fade smoothly between no glow and full glow every 2 seconds
- Work in both light and dark modes

---

## Expected Outcome

The yellow "Important" message box will have a subtle but noticeable glowing animation that draws users' attention to the critical instruction about clicking "Back to dashboard" or signing back in after purchase.
