## Goal
Hammers Today Plan loads no data and generates nothing for users without an active paid module. Free users see the card header plus a short locked message with an upgrade link.

## Access rule
Access = any active subscribed module (`useSubscription().modules.length > 0`), tier-aware helpers already in `src/utils/tierAccess.ts`. Owners/admins bypass via `useOwnerAccess()` (same pattern as `SubscriptionGate`).

## Changes
1. **`src/components/hammer/HammerDailyPlan.tsx`**
   - Add `useSubscription()` + `useOwnerAccess()` at the top of the component (above every existing hook-bearing branch, so hook order stays stable — respecting the earlier React #300 fix).
   - While subscription state is loading, render the existing skeleton.
   - If no access: return a minimal card — title ("Coach Hammer · today's plan"), one line explaining a subscription is needed, and a button linking to `/pricing`. No plan hooks/data rendered.
   - Keep the full plan render for subscribers/owners.

2. **Prevent generation for free users**
   - Gate `HammersTodayProvider` so `useWkDailyPrescriptions` is not invoked without access: render children inside a context whose snapshot is an inert empty snapshot when locked, or simply do not mount the provider subtree from the locked branch in `HammerDailyPlan`. Preferred: the locked branch returns before the provider subtree mounts, so no generation request fires.

3. **Consistency check**
   - Verify no other surface (`Dashboard.tsx`, `AthleteCommand.tsx`) mounts `HammersTodayProvider` or Wk* cards outside `HammerDailyPlan`; if any do, apply the same gate there.

## Verification
- Type/lint check.
- Playwright pass on `/` dashboard confirming: no `wk-generate-daily` network call for a locked state, no console errors, locked card renders.
