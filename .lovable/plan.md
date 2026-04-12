

# Enhance Daily Decision with Pressure Mechanics

## Summary
Add three dynamic status messages above the DailyDecision component: streak-lost alert, pre-miss warning, and perfect-day celebration. All derived from existing hook data — no database changes.

## State Logic

Using data already available from `useBaserunningDaily`:

| State | Condition | Message |
|-------|-----------|---------|
| **Streak Lost** | `streak === 0 && attempts.length > 0 && !completedToday` | "Streak Lost. Start Again." |
| **Pre-Miss Warning** | `streak > 0 && !completedToday` | "Complete today to keep your {streak}-day streak alive" |
| **Perfect Day** | `completedToday && all today's attempts correct` | "Perfect Read Day" |
| **No message** | `completedToday && not all correct`, or first-time user | Nothing shown |

## New Hook Export

Add `streakLost` boolean to `useBaserunningDaily` return: `true` when user has past attempts but streak is 0 and hasn't completed today. This avoids showing "Streak Lost" to brand-new users.

## New Component: `src/components/baserunning-iq/PressureBanner.tsx`

A small alert-style banner rendered above DailyDecision. Three visual variants:
- **Streak Lost**: Red/destructive styling, `AlertTriangle` icon
- **Pre-Miss Warning**: Amber/warning styling, `Flame` icon, pulsing subtle animation
- **Perfect Day**: Green/success styling, `Crown` icon, celebratory feel

## Files Changed

| File | Change |
|------|--------|
| `src/components/baserunning-iq/PressureBanner.tsx` | New — dynamic status banner |
| `src/hooks/useBaserunningDaily.ts` | Add `streakLost` + `isPerfectDay` to return |
| `src/pages/BaserunningIQ.tsx` | Render `PressureBanner` above `DailyDecision` |

No database changes.

