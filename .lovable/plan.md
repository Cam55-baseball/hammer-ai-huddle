

# Show Only the Purchased Tier as Unlocked on Dashboard

## Problem
When a user buys "The Golden 2Way," all three module cards on the dashboard show "Start Training" because the access check uses feature-level logic (hitting/pitching/throwing). This makes it look like the user purchased all three tiers individually.

## Solution
Change the dashboard module cards to check the user's **actual purchased tier** rather than their feature-level access. Only the card matching the purchased tier will show "Start Training" -- the other two will remain locked with "Unlock Module."

The user still retains full access to all features granted by their tier (navigation, sub-modules, analysis pages all continue to work). This is purely a dashboard card display change.

## How It Works

- Use the existing `getActiveTier()` helper from `tierAccess.ts` which returns the user's purchased tier key (`'pitcher'`, `'5tool'`, or `'golden2way'`)
- On the dashboard, compare each card's tier to the user's active tier instead of checking feature access
- Owners and admins still see all cards as unlocked

### Example behavior after fix:

| Purchased Tier | Complete Pitcher Card | 5Tool Player Card | Golden 2Way Card |
|---|---|---|---|
| Complete Pitcher | Start Training | Locked | Locked |
| 5Tool Player | Locked | Start Training | Locked |
| Golden 2Way | Locked | Locked | Start Training |
| Owner/Admin | Start Training | Start Training | Start Training |

## Technical Details

**File: `src/pages/Dashboard.tsx`**

1. Import `getActiveTier` from `@/utils/tierAccess`
2. Compute the user's active tier: `const activeTier = getActiveTier(subscribedModules, selectedSport)`
3. Create a helper to check if a specific tier card should show as unlocked:
   - `const isTierUnlocked = (tier: string) => isOwner || isAdmin || activeTier === tier`
4. Replace all `hasAccessForSport(...)` calls in the three module cards with the new `isTierUnlocked()` check:
   - Complete Pitcher card: `isTierUnlocked('pitcher')`
   - 5Tool Player card: `isTierUnlocked('5tool')`
   - Golden 2Way card: `isTierUnlocked('golden2way')`

No changes needed to access control, navigation, or any other files. The actual feature access (what the user can open and use) remains unchanged.

