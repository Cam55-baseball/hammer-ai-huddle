## Root cause (confirmed)

The `public.athlete_context` table has **no GRANTs** to any role (verified via `information_schema.role_table_grants` — empty). RLS policies exist and are correct, but without table-level GRANTs PostgREST returns `permission denied for table athlete_context` before RLS even runs. The upsert in `CategoryGoalsStep.handleSave` fails, and the resulting PostgrestError serializes to `[object Object]` in the toast.

The recent client-side error-stringify tweak can't fix this — the failure is server-side authorization.

## Fix

One migration adding the missing grants:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.athlete_context TO authenticated;
GRANT ALL ON public.athlete_context TO service_role;
```

RLS already restricts rows to `auth.uid() = user_id`, so authenticated grants are safe.

## Sweep

Since this class of bug ("table created without GRANTs") tends to affect siblings from the same migration wave, I'll query `information_schema.role_table_grants` for every `public` table touched by onboarding/goals writes (`athlete_context`, `athlete_mpi_settings`, `athlete_side_preferences`, `profiles`) and add missing grants in the same migration so we don't chase this again next week.

## Verification

- Re-query `role_table_grants` after migration → confirm `authenticated` has INSERT/UPDATE/SELECT/DELETE.
- Ask you to retry Save on the goals step; toast should read "Goals saved."
