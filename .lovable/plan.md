## Problem

In `src/components/GamePlanCard.tsx`, the "Hide" toggle already writes to `localStorage` (`gamePlan.hidden.v1`) and the initial `useState` reads it back correctly. However, the render order is:

```
1. if (loading && tasks.length === 0) → return full skeleton  ← ignores planHidden
2. if (planHidden)                     → return compact hidden card
3. return full plan
```

Every time the Dashboard remounts (route change, tab refocus, background refetch that empties tasks momentarily), the user hits branch 1 and sees the full skeleton — which looks exactly like "Hide" was reset. Once data loads they land in the correct hidden branch, but during the load window (and on cold reload) the plan visibly "comes back".

## Fix

Respect `planHidden` before the skeleton branch, so a hidden user stays hidden through loading and remounts.

### Edit — `src/components/GamePlanCard.tsx`

Move the `if (planHidden) { return <compact hidden card/> }` block above the `if (loading && tasks.length === 0)` skeleton block (around lines 1780–1853). The compact hidden card doesn't depend on `tasks`, so it's safe to render before data loads.

That single reordering makes Hide sticky across:
- initial page load / hard refresh
- Dashboard remounts
- background refetches that transiently empty `tasks`

### Optional hardening (same file, same edit pass)

- Scope the storage key to the current user id (`gamePlan.hidden.v1:<user.id>`) so switching accounts on the same device doesn't inherit the other user's hidden state. Uses `useAuth().user?.id` which is already imported in this file.

No other files, no backend, no business-logic changes.
