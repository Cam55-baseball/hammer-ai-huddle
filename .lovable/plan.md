

# Per-Athlete Insight History Isolation

## Change Summary
Update `useInsightHistory` to accept an optional `userId` parameter and scope the localStorage key to `insight_history_${userId}`. Two files changed.

## Changes

### 1. `src/hooks/useInsightHistory.ts`
- Accept `userId?: string` parameter in `useInsightHistory(userId?)`
- Compute storage key: `userId ? \`insight_history_${userId}\` : 'insight_history'` (fallback for missing userId)
- Pass dynamic key to `readHistory(key)` and `writeHistory(key, entries)`
- On first call with a userId, attempt to migrate old shared `insight_history` data: read it, write to new scoped key, delete old key. One-time backward compatibility.
- Reset `historyRef` when userId changes (add to deps)

### 2. `src/components/practice/PostSessionSummaryV2.tsx`
- Already fetches `supabase.auth.getUser()` indirectly via the session query. Instead, use the existing `useAuth()` hook to get `user.id`.
- Pass `user?.id` to `useInsightHistory(user?.id)`

## Behavior

| Scenario | Result |
|----------|--------|
| Athlete A logs session | Writes to `insight_history_abc123` |
| Athlete B on same device | Writes to `insight_history_def456` — completely independent |
| No authenticated user | Falls back to `insight_history` (offset=0, safe) |
| Old `insight_history` key exists | Migrated to scoped key on first use, then deleted |
| localStorage unavailable | Silent fail, offset=0 |

## Files Modified
| File | Change |
|------|--------|
| `src/hooks/useInsightHistory.ts` | Accept userId, scope key, migrate old data |
| `src/components/practice/PostSessionSummaryV2.tsx` | Import `useAuth`, pass `user?.id` |

