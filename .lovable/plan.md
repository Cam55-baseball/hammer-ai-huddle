

# Fix: "Rendered more hooks than during the previous render" in CoachDashboard

## Root Cause

In `src/pages/CoachDashboard.tsx`, the `useOrganization()` hook is called on **line 361**, which is AFTER an early return statement on **lines 350-358**. React requires all hooks to be called unconditionally and in the same order on every render. When the component hits the early return (during loading), the hook is skipped, but on the next render it runs -- causing the "more hooks" error.

## Fix

**File: `src/pages/CoachDashboard.tsx`**

Move the `useOrganization()` call to the top of the component (near the other hooks around lines 42-45), before any conditional returns. Then use its data later in the JSX as before.

Specifically:
1. Move `const { myOrgs, members } = useOrganization();` from line 361 up to around line 45 (after `useToast`)
2. Move the derived values (`activeOrg`, `memberCount`) to just after the early return block where they are currently, since they are not hooks and can safely remain there -- or move them up too for clarity

No other files need changes.

