

# Fix: Partner Reps Not Appearing in Live Broadcast

## Root Cause

The `useLiveRepBroadcast` hook calls `channel.subscribe()` but does **not wait for the subscription to be confirmed** before allowing `broadcastRep()` to send messages. Supabase Realtime Broadcast silently drops messages sent before the channel reaches `SUBSCRIBED` status. This means early reps are lost, and if both users aren't perfectly synced, messages never arrive.

## Fix (1 file)

**File: `src/hooks/useLiveRepBroadcast.ts`**

1. Track subscription readiness with a ref (`isSubscribed`).
2. In `subscribe()`, use the status callback to set `isSubscribed = true` only when status is `'SUBSCRIBED'`.
3. In `broadcastRep` / `broadcastRemoveRep`, check `isSubscribed` before sending — optionally queue and retry if not ready yet.
4. Add `console.log` breadcrumbs for channel status changes and incoming messages to aid debugging.

```typescript
// Key changes:
const isSubscribed = useRef(false);

channel.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    isSubscribed.current = true;
    console.log('[LiveRepBroadcast] Channel subscribed:', linkCode);
  }
});

// In broadcastRep:
if (!isSubscribed.current) {
  console.warn('[LiveRepBroadcast] Channel not ready, message queued');
  // retry after short delay
}
```

This ensures messages are only sent once the channel is confirmed active, and incoming messages are properly received.

## Technical Details

| Aspect | Detail |
|--------|--------|
| File | `src/hooks/useLiveRepBroadcast.ts` |
| Issue | `channel.subscribe()` is fire-and-forget; sends before SUBSCRIBED are dropped |
| Fix | Gate sends on subscription confirmation; add retry for early sends |

