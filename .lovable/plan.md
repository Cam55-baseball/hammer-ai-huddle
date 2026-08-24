# Six-function authorization fix — remaining gap

Five of the six functions are already hardened from the previous pass. Only one change remains.

## Current state (verified)

- `approve-scout-application` — `verify_jwt = true`, owner/admin role guard in place.
- `delete-library-session` — `verify_jwt = true`, active-subscription gate, caller-scoped queries.
- `update-library-session` — `verify_jwt = true`, active-subscription gate, caller-scoped update.
- `download-session-video` — `verify_jwt = true`, active-subscription gate, access check.
- `unfollow-player` — `verify_jwt = true`, scout/coach role guard.
- `migrate-to-tiers` — checks `user_roles` for `owner` internally and rejects otherwise, but `verify_jwt = false`.

## Change to make

In `supabase/config.toml`, set `migrate-to-tiers` to `verify_jwt = true`, matching the other admin-only functions. Its in-function owner check against `user_roles` stays as-is.

Nothing else is touched — no engine-*/cron functions, no other config entries, no function source edits.

## Verification

Confirm the function still reads the `Authorization` header and resolves the caller before the owner lookup, so gateway-level JWT verification does not break the existing flow.
