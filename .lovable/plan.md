

# Fix Season Phase Buttons Not Working

## Root Cause

The network requests reveal the problem: the PATCH (update) returns 204 but the subsequent GET returns an **empty array** `[]`. This means:

1. There is no `athlete_mpi_settings` row for this user (or RLS blocks SELECT)
2. The `.update()` call silently matches 0 rows — nothing gets written
3. The query falls back to `'in_season'` every time, so the UI never changes

## Fix

### `src/hooks/useSeasonStatus.ts`

Change the mutation from `.update()` to `.upsert()` so it creates the row if it doesn't exist:

```typescript
const { error } = await supabase
  .from('athlete_mpi_settings')
  .upsert(
    { user_id: user.id, ...updates },
    { onConflict: 'user_id' }
  );
```

Also add **optimistic updates** to the mutation so the UI responds instantly instead of waiting for the refetch.

| File | Change |
|------|--------|
| `src/hooks/useSeasonStatus.ts` | Change `.update()` to `.upsert()` with `user_id` and add optimistic update |

