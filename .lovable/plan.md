

# Fix: Allow Coach Role to Use Hammer Workout Recommendations

## Problem
The `recommend-workout` edge function returns 403 "Subscription required" for coach-profile users. The entitlement check only bypasses the subscription requirement for `owner` and `admin` roles, but coaches have the `coach` role -- which falls through to the subscription check, and coaches typically don't have personal subscriptions with modules.

## Solution
Add `coach` to the privileged roles list in the entitlement check. Coaches need AI features to build activities/folders for their players.

## Changes

### File: `supabase/functions/recommend-workout/index.ts` (line 177)

Update the `.in('role', ...)` array to include `'coach'`:

```typescript
// Before
.in('role', ['owner', 'admin'])

// After
.in('role', ['owner', 'admin', 'coach'])
```

This is a single-line change. After editing, the function will be redeployed automatically.

## Why This Is Safe
- Coaches are authenticated users with an assigned role
- The role check still requires `status = 'active'`
- This aligns with the existing pattern in `check-subscription` where owner access is already granted (coaches should have similar AI feature access for building training programs)

