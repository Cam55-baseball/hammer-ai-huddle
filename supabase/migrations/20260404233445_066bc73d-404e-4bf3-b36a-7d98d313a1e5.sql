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