

# Fix Head Coach Button Visibility and Query Error

## Problem
1. The "Set Head Coach" button only appears for coaches with `relationship_type === 'linked'`, but the user's coaches are "Following" type -- so the button never shows.
2. The head-coach query throws `Query data cannot be undefined` when no `athlete_mpi_settings` row exists for the user.

## Changes

### File: `src/components/connections/ConnectionsTab.tsx`

**Fix 1 -- Show "Set Head Coach" for all active coaches, not just linked ones:**
- Remove the `isLinked &&` condition on line 239 so the button appears for any active coach regardless of relationship type.
- Keep the "Linked" / "Following" badge for informational purposes.

**Fix 2 -- Prevent undefined query result:**
- In the head-coach query (line 50), return `null` instead of `undefined` when no row is found:
  ```typescript
  return data?.primary_coach_id ?? null;
  ```
  This ensures the query always returns a defined value (`string | null`), fixing the React Query warning.

### No other files change

## Summary
| File | Change |
|------|--------|
| `src/components/connections/ConnectionsTab.tsx` | Remove `isLinked` gate on "Set Head Coach" button; ensure query returns `null` not `undefined` |

