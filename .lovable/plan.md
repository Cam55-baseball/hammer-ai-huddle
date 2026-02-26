

# Fix: Coach/Scout Game Plan Not Showing for Owner/Admin Users

## Problem

The Dashboard condition on line 430 prevents the Coach/Scout Game Plan from displaying if the user also has an `owner` or `admin` role:

```typescript
(isScout || isCoach) && !isOwner && !isAdmin
```

Since your account has both scout/coach AND owner/admin roles, it skips the `CoachScoutGamePlanCard` and shows the regular player `GamePlanCard` instead.

## Solution

Show **both** game plan cards when a user has coach/scout roles alongside owner/admin roles. This way:
- Owner/admin users who are also coaches/scouts see their Coach/Scout Game Plan AND the player Game Plan
- Pure coach/scout users (no owner/admin) see only the Coach/Scout Game Plan
- Pure players see only the player Game Plan

## Changes

### File: `src/pages/Dashboard.tsx`

Update the rendering logic (around line 429-434) from:

```text
{(isScout || isCoach) && !isOwner && !isAdmin ? (
  <CoachScoutGamePlanCard ... />
) : (
  <GamePlanCard ... />
)}
```

To:

```text
{(isScout || isCoach) && (
  <CoachScoutGamePlanCard isCoach={isCoach} isScout={isScout} />
)}
{(isOwner || isAdmin || (!isScout && !isCoach)) && (
  <GamePlanCard selectedSport={selectedSport} />
)}
```

This ensures:
- The Coach/Scout Game Plan always renders for scouts and coaches, regardless of other roles
- The player Game Plan renders for owners, admins, or users with no scout/coach role
- Users with dual roles (e.g., owner + coach) see both cards stacked

### Files Modified

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Update conditional rendering to show both game plans for dual-role users |

No database changes needed.
