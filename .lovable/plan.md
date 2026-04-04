

# Update `attach_session_to_link` — Gold Version

## Single Migration

Replace the existing function with the user's provided version. Key differences from current:

1. **Status check moved before participant check** — rejects expired/failed links earlier
2. **Accepts `'linked'` status for re-entry** — allows safe retries after completion
3. **New global session uniqueness guard (step 3)** — queries `live_ab_links` to ensure `p_session_id` doesn't exist in ANY other link row, preventing cross-link contamination at the SQL level (defense-in-depth alongside the unique indexes)

## Files Changed

| File | Change |
|------|--------|
| New migration | `CREATE OR REPLACE FUNCTION public.attach_session_to_link` with the exact SQL provided |

## What Does NOT Change
- Client code (already calls this RPC correctly)
- Other RPCs, indexes, schema
- Edge functions, lock system

