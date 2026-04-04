

# Fix Session Uniqueness Indexes

## Problem
The current indexes are on `(id)` which is already the PK — they provide zero protection. A session could theoretically be attached to multiple links.

## Fix (single migration)

Drop the two broken indexes and create correct ones:

```sql
-- Drop broken indexes
DROP INDEX IF EXISTS public.one_creator_session_per_link;
DROP INDEX IF EXISTS public.one_joiner_session_per_link;

-- Each session can only be attached as creator to ONE link
CREATE UNIQUE INDEX uniq_creator_session_per_link
  ON public.live_ab_links (creator_session_id)
  WHERE creator_session_id IS NOT NULL;

-- Each session can only be attached as joiner to ONE link
CREATE UNIQUE INDEX uniq_joiner_session_per_link
  ON public.live_ab_links (joiner_session_id)
  WHERE joiner_session_id IS NOT NULL;
```

This ensures:
- A given session ID can only appear once as `creator_session_id` across all links
- A given session ID can only appear once as `joiner_session_id` across all links
- Combined with the existing `COALESCE` in `attach_session_to_link`, this makes the system fully airtight

## Files Changed

| File | Change |
|------|--------|
| New migration | Drop 2 broken indexes, create 2 correct unique indexes |

## What Does NOT Change
- `attach_session_to_link` — already has COALESCE protection
- All other RPCs, client code, edge functions unchanged

