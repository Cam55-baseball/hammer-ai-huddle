

# Session Linking — Gold Standard Patches

## Database Migration (single migration with all 4 patches)

### Schema Changes
- Add `claimed_at TIMESTAMPTZ NULL` and `linked_at TIMESTAMPTZ NULL` columns
- Drop `used_at` column (replaced by `claimed_at`/`linked_at`)
- Add status CHECK constraint: `('pending','claimed','linked','expired')`
- Update any existing `status = 'active'` rows to `'linked'` before adding constraint

### Patch 1: Replace `attach_session_to_link` (new RPC)
Create the function exactly as specified — row lock, COALESCE for idempotent assignment, self-healing bidirectional update, status guard.

### Patch 2: Duplicate session attach prevention
```sql
CREATE UNIQUE INDEX one_creator_session_per_link ON live_ab_links (id) WHERE creator_session_id IS NOT NULL;
CREATE UNIQUE INDEX one_joiner_session_per_link ON live_ab_links (id) WHERE joiner_session_id IS NOT NULL;
```

### Patch 3: Replace `create_ab_link` and `claim_ab_link`

**`create_ab_link(p_user_id, p_sport, p_link_code)`**: Expires all existing pending/claimed links for user (including expired ones past `expires_at`), inserts new row with `status='pending'`, `expires_at = now() + 2h`.

**`claim_ab_link(p_code, p_user_id)`**: Atomic UPDATE with `expires_at > now()` guard. Also pre-cleans expired links. Sets `status='claimed'`, `claimed_at=now()`.

### Patch 4: Drop `cancel_pending_links` and `update_link_session_id`
These are superseded by the new RPCs.

## Client Changes

### `LiveAbLinkPanel.tsx`
Already calls `create_ab_link` and `claim_ab_link` — no changes needed (already updated in prior iteration).

### `PracticeHub.tsx`
Already calls `attach_session_to_link` — no changes needed.

### `SessionConfigPanel.tsx` / `usePerformanceSession.ts`
Already correct from prior iteration — `linked_session_id` removed from client payloads.

## Files Changed

| File | Change |
|------|--------|
| New migration | All 4 patches: schema, 3 RPCs, 2 indexes, drop old functions |

## What Does NOT Change
- `LiveAbLinkPanel.tsx` (already correct)
- `PracticeHub.tsx` (already correct)
- Edge functions unchanged
- Lock system unchanged

