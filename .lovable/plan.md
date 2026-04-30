# Cross-Session Linking — Fixes #1, #2, #6

Make the AB-link flow honest end-to-end: unlinking actually clears the server, attach failures surface to the user with a retry path, and the panel reflects true server state (Pending / Claimed / Linked / Expired) instead of guessing from local React state.

## Scope

1. **Server-side unlink** — clean up `live_ab_links` when a user clicks Unlink.
2. **Attach error surfacing + retry** — never silently swallow `attach_session_to_link` failures; let the user retry.
3. **Real-state badge** — the panel subscribes to the row and shows the actual lifecycle status.

Out of scope for this pass: race conditions in `useLiveRepBroadcast`, expiration warnings, sport-mismatch enforcement (planned separately).

---

## 1. Server-side unlink

Add an RPC and call it from `handleUnlink`. Local-only state reset is the current bug.

**New RPC** `expire_ab_link(p_user_id uuid, p_link_code text)`:
- SECURITY DEFINER, search_path = public.
- Updates the row to `status = 'expired'` only when `link_code = p_link_code` AND the caller is `creator_user_id` or `joiner_user_id` AND status is in `('pending','claimed')`.
- No-op if already `linked` or `expired` (so we don't clobber a finalized link mid-save).
- Does NOT touch `creator_session_id` / `joiner_session_id` / `linked_session_id` to preserve audit history.

**Client** (`LiveAbLinkPanel.handleUnlink`):
- Make async; call `supabase.rpc('expire_ab_link', ...)` before resetting local state.
- Toast on error and keep the linked UI (don't lie about disconnection).
- On success, reset state and call `onUnlink()`.

## 2. Attach error surfacing + retry

`PracticeHub.handleSaveSession` currently `console.error`s and continues to a "Success" summary. Fix end-to-end:

- Store the attach error on a new state slot `linkAttachError: { sessionId, code, message } | null`.
- Wrap the RPC: if it throws OR returns and the row's `creator_session_id`/`joiner_session_id` is still NULL for this user, treat as failure.
- Toast (destructive) immediately: "Couldn't link sessions — your practice was saved, tap Retry to attempt linking again."
- On the `session_summary` step, when `linkAttachError` is set, render an inline alert with a **Retry Link** button that re-invokes `attach_session_to_link` with the stored sessionId + code. Clear the error on success.
- Only mark the saved session "linked" in UI after we confirm attach succeeded.

## 3. Real-state badge in the panel

Replace the local `linked` boolean with server truth.

- New hook `useAbLinkStatus(linkCode)` in `src/hooks/useAbLinkStatus.ts`:
  - Initial fetch: `select status, creator_session_id, joiner_session_id, expires_at from live_ab_links where link_code = ?`.
  - Realtime: subscribe via `supabase.channel` to `postgres_changes` on `live_ab_links` filtered by `link_code=eq.<code>`.
  - Returns `{ status, isCreator, isJoiner, mySessionAttached, partnerSessionAttached, expiresAt }`.
- `LiveAbLinkPanel`:
  - Drive the badge from the hook, not local state. Map:
    - `pending` → "Waiting for partner" (amber)
    - `claimed` → "Partner joined — save to finalize" (blue)
    - `linked` → "Linked" (green)
    - `expired` → "Expired" (muted) + offer Generate New
  - Add a small countdown chip when within 15 min of `expires_at`.
  - Keep Unlink visible whenever status is `pending` or `claimed`.

## Technical details

**Files to change**
- `supabase/migrations/<timestamp>_ab_link_unlink_rpc.sql` — add `expire_ab_link` RPC + grant execute to `authenticated`.
- `src/components/practice/LiveAbLinkPanel.tsx` — async unlink, badge driven by `useAbLinkStatus`.
- `src/hooks/useAbLinkStatus.ts` — new hook (fetch + realtime subscription).
- `src/pages/PracticeHub.tsx` — capture attach failures into state, surface toast, add Retry on summary view; only show "Session Linked" after confirmed attach.

**RLS / realtime**
- `live_ab_links` is already returned by `claim_ab_link`/`create_ab_link`; verify `SELECT` policy lets both `creator_user_id` and `joiner_user_id` read. If not, add it in the same migration.
- Add the table to `supabase_realtime` publication if not already (`ALTER PUBLICATION supabase_realtime ADD TABLE public.live_ab_links;`).

**Failure semantics**
- Unlink RPC failure → keep UI linked, show destructive toast. Do not mutate local state.
- Attach RPC failure → session is saved; Retry button is the recovery path. Practice History still has the session, just unlinked.

## Acceptance

- Clicking Unlink updates the DB row to `expired` (verified via `select status from live_ab_links where link_code=?`).
- Killing the network during save produces a destructive toast and a visible Retry button on the summary; tapping Retry while online finalizes the link.
- Panel badge changes from "Waiting" → "Partner joined" → "Linked" in real time on both devices without a refresh.
- No silent failures; every error path produces a toast.
