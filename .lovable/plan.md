

# Live Rep Sync Between Linked Practice Sessions

## Problem

The `useLiveAbSync` hook exists but is never used in the Practice Hub. When two users link sessions, reps are only saved locally in React state and written to the database on final save. Neither user sees the other's reps in real-time.

## What needs to happen

1. **Integrate `useLiveAbSync` into PracticeHub** — when a session is linked, subscribe to the partner's updates and broadcast local rep changes in real-time.

2. **Create a Supabase Realtime channel for live rep broadcast** — the current hook only listens to `performance_sessions` row changes, which only update on final save. Instead, use a **Broadcast channel** (Supabase Realtime Broadcast, not postgres_changes) keyed by the link code, so reps are pushed instantly without requiring a database write.

3. **Show partner reps in the UI** — display a "Partner Reps" feed alongside the user's own reps during the `build_session` step.

## Technical approach

### A. New hook: `useLiveRepBroadcast`

Create a new hook that uses Supabase Realtime **Broadcast** (not postgres_changes) on a channel named after the link code (`live-reps-{link_code}`).

- `broadcastRep(rep)` — sends a rep event to the channel
- `partnerReps` — state array of reps received from the partner
- Subscribes on mount when `linkCode` is set, unsubscribes on unmount

### B. PracticeHub integration

- Import and call `useLiveRepBroadcast` with `sessionConfig?.link_code`
- When `onRepsChange` fires (new rep added), broadcast the latest rep to the partner
- Pass `partnerReps` to a new `PartnerRepsFeed` component rendered below the rep scorer

### C. PartnerRepsFeed component

- Small card/panel showing partner's reps as they arrive in real-time
- Shows rep count, contact quality, pitch type, and result
- Visually distinct from user's own reps (different border color, "Partner" label)

## Files

| File | Change |
|------|--------|
| `src/hooks/useLiveRepBroadcast.ts` | New hook — Supabase Broadcast channel for real-time rep sync |
| `src/pages/PracticeHub.tsx` | Integrate broadcast hook, wire up rep broadcasting and partner reps display |
| `src/components/practice/PartnerRepsFeed.tsx` | New component — live feed of partner's reps |

