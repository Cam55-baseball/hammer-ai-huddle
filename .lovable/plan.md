

# Better Active Tab Highlighting for Practice Hub Modules

## Problem
The active module tab (e.g., "Throwing") blends in with the other tabs. The default Radix tab styling only applies a subtle background/shadow change which is hard to distinguish.

## Solution
Add stronger visual distinction to the active `TabsTrigger` in `PracticeHub.tsx`:

**File: `src/pages/PracticeHub.tsx`** — Line 207

Update the `TabsTrigger` className to include active-state styling:
- Add a colored bottom border or ring on the active tab using `data-[state=active]:border-b-2 data-[state=active]:border-primary`
- Make the active icon use the primary color: `data-[state=active]:text-primary`
- Increase font weight on active: `data-[state=active]:font-bold`
- Add a subtle primary background tint: `data-[state=active]:bg-primary/10`

This is a single-line className change — no new files or components needed.

| File | Change |
|------|--------|
| `src/pages/PracticeHub.tsx` | Enhanced `TabsTrigger` active state classes |

