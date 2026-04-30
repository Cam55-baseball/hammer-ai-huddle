
# AB Link — Long-practice support

Two changes that work together:

1. **Extend button + 10-min toast warning** — never lose a link silently mid-practice.
2. **Expired-recovery banner** on the session summary — when an attach fails because the link expired, the session still saves and the user gets a clear path forward.

## 1. `extend_ab_link` RPC

New SECURITY DEFINER function:

```sql
CREATE OR REPLACE FUNCTION public.extend_ab_link(p_user_id uuid, p_link_code text)
RETURNS SETOF live_ab_links
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  UPDATE public.live_ab_links
  SET expires_at = now() + interval '2 hours'
  WHERE link_code = p_link_code
    AND status IN ('pending', 'claimed')
    AND (creator_user_id = p_user_id OR joiner_user_id = p_user_id)
  RETURNING *;
END;
$$;
GRANT EXECUTE ON FUNCTION public.extend_ab_link(uuid, text) TO authenticated;
```

Idempotent. Won't touch `linked` or `expired` rows. Realtime push delivers the new `expires_at` to the partner's panel automatically.

## 2. Always-on escalating countdown

Replace the current 15-min gate in `LiveAbLinkPanel.useCountdown` with continuous output:

| Time left | Tone | Text |
|---|---|---|
| > 30 min | muted | `1h 23m left` |
| ≤ 30 min | amber | `27m left` |
| ≤ 5 min | destructive (pulse) | `4m left` |
| ≤ 0 | destructive | `Expired` |

Chip lives next to the status badge for the entire link lifetime, not just the last 15 min.

## 3. One-time 10-min "expiring soon" toast

Inside `LiveAbLinkPanel`, when minutes-left transitions from `> 10` to `≤ 10` for the first time per `link_code`, fire one persistent toast:

- Title: "AB Link expiring soon"
- Description: "Your link AB-XXXXX expires in 10 minutes."
- Action button: **Extend 2h** → calls `supabase.rpc('extend_ab_link', ...)`
- `duration: 0` (persistent until dismissed or extended)
- Tracked in `useRef<Set<string>>` so it can't fire twice for the same code.

A second one-time toast at `≤ 1 min` with the same Extend action.

## 4. Inline Extend button on the panel

When status is `pending` or `claimed` AND minutes-left ≤ 30, show a small "Extend 2h" button next to Unlink. Clicking it calls `extend_ab_link`, toast on success/failure, no other state mutation needed (realtime updates the row).

## 5. Expired-recovery banner on session summary

In `PracticeHub.tsx`, when `attachAndVerify` throws and the verification read returned `status = 'expired'`, set a new `linkExpired: true` flag on `linkAttachError`. The summary then renders a different banner:

- Title: "Link expired before save"
- Body: "Your practice was saved. The AB link AB-XXXXX expired before both partners could finalize. Generate a new code from your next session if you want to link with this partner again."
- No Retry button (extending an expired link is not allowed by the RPC by design — surfaces "Generate New" path instead).

For the *non-expired* failure case (slot conflict, RPC error, etc.), the existing destructive banner with **Retry Link** stays as-is.

## Files

- `supabase/migrations/<timestamp>_ab_link_extend.sql` — `extend_ab_link` RPC + GRANT.
- `src/components/practice/LiveAbLinkPanel.tsx` — rewrite `useCountdown`, add Extend button, fire 10-min and 1-min toasts.
- `src/pages/PracticeHub.tsx` — surface `linkExpired` flag on the summary error banner; differentiate copy + actions.

No edge function changes. No client-side polling — all driven by realtime + the existing 30s tick in `useCountdown`.

## Acceptance

- A link generated 1h 50m ago shows `10m left` in amber and triggers a persistent toast with **Extend 2h**. Tapping it bumps `expires_at` by 2h and the chip resets to `2h 0m left`. Both creator and partner see the update without refresh.
- A link allowed to expire and then attached at save time shows the Expired-recovery banner — no Retry button, just guidance.
- A link that fails to attach for any other reason (slot taken, RPC error) still shows the original Retry banner.
- `extend_ab_link` is a no-op on `linked` or `expired` rows (verified by manual SQL).
