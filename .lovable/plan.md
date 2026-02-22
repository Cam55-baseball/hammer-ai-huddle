
# Fix: Show Only the Purchased Tier in the Sidebar

## Problem
Line 182 of `src/components/AppSidebar.tsx` includes `activeTier === 'golden2way'` in the Complete Pitcher visibility check. This causes the Complete Pitcher module to appear in the sidebar when a user has purchased The Golden 2Way, even though they did not buy Complete Pitcher separately.

The Golden 2Way already has its own sidebar entry (line 213) that includes all the sub-modules (hitting, pitching, throwing analysis, The Unicorn, Speed Lab, Tex Vision). So displaying Complete Pitcher alongside it is redundant and confusing.

## Solution
Remove `|| activeTier === 'golden2way'` from the Complete Pitcher condition on line 182.

**Before:**
```
if (showAll || activeTier === 'pitcher' || activeTier === 'golden2way') {
```

**After:**
```
if (showAll || activeTier === 'pitcher') {
```

This ensures each tier module only shows in the sidebar when the user has purchased that exact tier. The Golden 2Way entry already contains all the sub-modules the user needs.

## Expected Behavior After Fix

| Purchased Tier | Complete Pitcher in Sidebar | 5Tool Player in Sidebar | Golden 2Way in Sidebar |
|---|---|---|---|
| Complete Pitcher | Visible | Hidden | Hidden |
| 5Tool Player | Hidden | Visible | Hidden |
| Golden 2Way | Hidden | Hidden | Visible |
| Owner/Admin | Visible | Visible | Visible |

## Technical Details

**File:** `src/components/AppSidebar.tsx`
- **Line 182:** Remove `|| activeTier === 'golden2way'` from the Complete Pitcher visibility condition
- No other files need changes
- The 5Tool Player condition (line 196) is already correct -- it only shows for `activeTier === '5tool'`
- The Golden 2Way condition (line 213) is already correct -- it only shows for `activeTier === 'golden2way'`
