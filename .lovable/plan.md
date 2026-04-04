

# Production-Grade Session Linking — State Machine Architecture

## Overview

Replace the current ad-hoc linking system with a deterministic, server-owned state machine. All transitions happen through atomic RPCs. The client becomes a thin UI layer that calls 3 RPCs and nothing else.

## Database Migration

### Schema changes to `live_ab_links`

- Add `claimed_at TIMESTAMPTZ NULL` column
- Add `linked_at TIMESTAMPTZ NULL` column  
- Replace `status` check constraint: `pending → claimed → linked → expired → failed`
- Add partial unique index: `UNIQUE(creator_user_id) WHERE status IN ('pending', 'claimed')` — enforces one active link per user
- Drop `used_at` column (replaced by `claimed_at` / `linked_at`)

### New/replaced RPCs

**A. `create_ab_link(p_user_id UUID, p_sport TEXT, p_link_code TEXT)`**
- Expires all existing `pending`/`claimed` links for this user
- Inserts new row with `status = 'pending'`, `expires_at = now() + 2h`
- Returns the new row
- Replaces: client-side `cancel_pending_links` + raw INSERT

**B. `claim_ab_link(p_code TEXT, p_user_id UUID)`** (rewrite)
- Single UPDATE with `WHERE status = 'pending' AND joiner_user_id IS NULL AND creator_user_id != p_user_id AND expires_at > now()`
- Sets `status = 'claimed'`, `joiner_user_id`, `claimed_at = now()`
- Returns the updated row (empty set = invalid/expired/self/already claimed)

**C. `attach_session_to_link(p_user_id UUID, p_link_code TEXT, p_session_id UUID)`** (new, replaces `update_link_session_id`)
- `SELECT ... FOR UPDATE` locks the link row
- Rejects if status not in `('pending', 'claimed')` — idempotent re-entry allowed if status is `'linked'` and session already attached
- Sets `creator_session_id` or `joiner_session_id` based on which user is calling
- Reloads the row; if BOTH session IDs are now present:
  - Updates both `performance_sessions.linked_session_id` to point at each other
  - Sets `status = 'linked'`, `linked_at = now()`
- All within one transaction — no partial state possible

**D. Drop `cancel_pending_links`** (absorbed into `create_ab_link`)
**E. Drop `update_link_session_id`** (replaced by `attach_session_to_link`)

### Cleanup function
- `expire_stale_links()`: `UPDATE ... SET status = 'expired' WHERE status IN ('pending','claimed') AND expires_at < now()`

## Client Changes

### `LiveAbLinkPanel.tsx`
- **Generate**: Call `create_ab_link` RPC instead of raw INSERT + `cancel_pending_links`
- **Join**: Call `claim_ab_link` — status is now `'claimed'` not `'active'`. Remove `linked_session_id` from callback (not available at claim time)
- **onLinkEstablished** signature simplifies to just `(code: string)` — no `linkedSessionId` param

### `PracticeHub.tsx` (post-save)
- Replace `update_link_session_id` RPC call with `attach_session_to_link`
- Remove `linked_session_id` from `createSession()` call — linking is server-side only
- Remove `sessionConfig.linked_session_id` usage entirely

### `usePerformanceSession.ts`
- Remove `linked_session_id` from the insert payload (server handles it via `attach_session_to_link`)
- Keep `link_code` in the insert (stored for reference, not for linking logic)

### `SessionConfig` type (`SessionConfigPanel.tsx`)
- Remove `linked_session_id` property from the interface
- Remove any code setting it

### `useLiveAbSync.ts`
- No changes needed — it already activates when `linkedSessionId` is provided. In the new model, this will be activated after status becomes `'linked'` (future enhancement, not blocking)

### `useLiveRepBroadcast.ts`
- No changes — already correctly uses `link_code` for broadcast channel

## State Machine Summary

```text
  pending ──(claim_ab_link)──→ claimed ──(both attach)──→ linked
     │                            │
     └──(expires_at)──→ expired   └──(expires_at)──→ expired
```

## Files Changed

| File | Change |
|------|--------|
| New migration | Schema updates + 3 RPCs + cleanup function |
| `src/components/practice/LiveAbLinkPanel.tsx` | Use `create_ab_link` RPC; simplify join callback |
| `src/pages/PracticeHub.tsx` | Replace `update_link_session_id` with `attach_session_to_link`; remove `linked_session_id` from session insert |
| `src/hooks/usePerformanceSession.ts` | Remove `linked_session_id` from insert payload |
| `src/components/practice/SessionConfigPanel.tsx` | Remove `linked_session_id` from `SessionConfig` type |

## What Does NOT Change
- `useLiveRepBroadcast.ts` — already correct (broadcast via `link_code`)
- `useLiveAbSync.ts` — unchanged
- Edge functions — unchanged
- Lock system — unchanged
- Analytics/HIE system — unchanged

