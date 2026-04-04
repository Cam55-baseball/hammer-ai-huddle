

# Cross-Role Session Uniqueness Trigger

## Single Migration

Create a trigger function and attach it to `live_ab_links` to enforce global session uniqueness at the schema level. This closes the last theoretical gap where a session ID could appear as `creator_session_id` in one link and `joiner_session_id` in another — currently only guarded at the function level.

### SQL

```sql
-- Trigger function: reject any insert/update that would reuse a session across links or roles
CREATE OR REPLACE FUNCTION public.enforce_session_global_uniqueness()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.creator_session_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.live_ab_links
      WHERE id != NEW.id
        AND (creator_session_id = NEW.creator_session_id OR joiner_session_id = NEW.creator_session_id)
    ) THEN
      RAISE EXCEPTION 'Session % is already linked to another AB link', NEW.creator_session_id;
    END IF;
  END IF;

  IF NEW.joiner_session_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.live_ab_links
      WHERE id != NEW.id
        AND (creator_session_id = NEW.joiner_session_id OR joiner_session_id = NEW.joiner_session_id)
    ) THEN
      RAISE EXCEPTION 'Session % is already linked to another AB link', NEW.joiner_session_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_enforce_session_global_uniqueness ON public.live_ab_links;
CREATE TRIGGER trg_enforce_session_global_uniqueness
BEFORE INSERT OR UPDATE OF creator_session_id, joiner_session_id
ON public.live_ab_links
FOR EACH ROW
EXECUTE FUNCTION public.enforce_session_global_uniqueness();
```

### What this completes

This is the third and final layer of session uniqueness protection:

| Layer | Protection |
|---|---|
| Unique indexes | Same session can't appear twice in same column |
| RPC `EXISTS` guard | Cross-role check during normal flow |
| **This trigger** | Hard DB-level rejection of ALL cross-row + cross-role reuse |

### Files Changed

| File | Change |
|------|--------|
| New migration | Create trigger function + attach to `live_ab_links` |

### What Does NOT Change
- RPCs (`attach_session_to_link`, `claim_ab_link`, `create_ab_link`) — unchanged
- Client code — unchanged
- No performance impact (index-backed lookups)

