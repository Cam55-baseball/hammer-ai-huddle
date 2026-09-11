
CREATE OR REPLACE FUNCTION public.apply_block_severance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.scout_follows
     SET status = 'rejected'
   WHERE status <> 'rejected'
     AND ((scout_id = NEW.blocker_id AND player_id = NEW.blocked_id)
       OR (scout_id = NEW.blocked_id AND player_id = NEW.blocker_id));

  UPDATE public.parent_athlete_links
     SET status = 'revoked', revoked_at = now()
   WHERE revoked_at IS NULL
     AND ((parent_user_id = NEW.blocker_id AND athlete_user_id = NEW.blocked_id)
       OR (parent_user_id = NEW.blocked_id AND athlete_user_id = NEW.blocker_id));

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_block_on_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'rejected'
     AND public.is_blocked_pair(NEW.scout_id, NEW.player_id) THEN
    RAISE EXCEPTION 'This connection is not available.';
  END IF;
  RETURN NEW;
END;
$$;
