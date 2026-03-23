

# Fix: Practice Hub Session Linking E2E

## Problem

The `handleSave` function in `PracticeHub.tsx` (line 185) calls `createSession()` but **never passes `link_code` or `linked_session_id`** from `sessionConfig`, even though these values are correctly collected by `SessionConfigPanel` and stored in `sessionConfig.link_code` / `sessionConfig.linked_session_id`.

This means:
- The link code is generated and stored in `live_ab_links` ✅
- The joiner can look up and activate the link ✅
- But the saved `performance_sessions` row has `null` for both `link_code` and `linked_session_id` ❌
- Sessions are never actually cross-referenced in history ❌

## Fix

**File: `src/pages/PracticeHub.tsx`** (line 185-209)

Add the two missing fields to the `createSession()` call:

```typescript
const result = await createSession({
  // ...existing fields...
  link_code: sessionConfig.link_code,           // ADD
  linked_session_id: sessionConfig.linked_session_id, // ADD
  micro_layer_data: reps.length > 0 ? reps : undefined,
});
```

Also, after save succeeds and we have `result.id`, update the `live_ab_links` row to store the session ID:
- If the user is the **creator**: update `creator_session_id = result.id`
- If the user is the **joiner**: update `joiner_session_id = result.id`

This ensures bidirectional linking in the `live_ab_links` table.

## Files

| File | Change |
|------|--------|
| `src/pages/PracticeHub.tsx` | Pass `link_code` and `linked_session_id` to `createSession`; update `live_ab_links` with session ID after save |

