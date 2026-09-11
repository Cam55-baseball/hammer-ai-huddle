
-- 1. Blocking severs existing links (runs with elevated rights so either side can sever)
CREATE OR REPLACE FUNCTION public.apply_block_severance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.scout_follows
     SET status = 'revoked'
   WHERE (scout_id = NEW.blocker_id AND player_id = NEW.blocked_id)
      OR (scout_id = NEW.blocked_id AND player_id = NEW.blocker_id);

  UPDATE public.parent_athlete_links
     SET status = 'revoked', revoked_at = now()
   WHERE revoked_at IS NULL
     AND ((parent_user_id = NEW.blocker_id AND athlete_user_id = NEW.blocked_id)
       OR (parent_user_id = NEW.blocked_id AND athlete_user_id = NEW.blocker_id));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_block_severance ON public.user_blocks;
CREATE TRIGGER trg_apply_block_severance
AFTER INSERT ON public.user_blocks
FOR EACH ROW EXECUTE FUNCTION public.apply_block_severance();

-- 2. Blocked pairs may never open a new link
CREATE OR REPLACE FUNCTION public.enforce_block_on_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'revoked'
     AND public.is_blocked_pair(NEW.scout_id, NEW.player_id) THEN
    RAISE EXCEPTION 'This connection is not available.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_block_on_follow ON public.scout_follows;
CREATE TRIGGER trg_enforce_block_on_follow
BEFORE INSERT OR UPDATE ON public.scout_follows
FOR EACH ROW EXECUTE FUNCTION public.enforce_block_on_follow();

-- 3. Blocked pairs cannot read each other's profile through relationship pathways
DROP POLICY IF EXISTS "Scouts can view profiles of accepted followed players" ON public.profiles;
CREATE POLICY "Scouts can view profiles of accepted followed players"
ON public.profiles FOR SELECT TO authenticated
USING (
  id IN (SELECT sf.player_id FROM public.scout_follows sf
         WHERE sf.scout_id = auth.uid() AND sf.status = 'accepted')
  AND NOT public.is_blocked_pair(auth.uid(), id)
);

DROP POLICY IF EXISTS "Players can view profiles of scouts who follow them" ON public.profiles;
CREATE POLICY "Players can view profiles of scouts who follow them"
ON public.profiles FOR SELECT TO authenticated
USING (
  id IN (SELECT sf.scout_id FROM public.scout_follows sf WHERE sf.player_id = auth.uid())
  AND NOT public.is_blocked_pair(auth.uid(), id)
);

DROP POLICY IF EXISTS "Scouts and coaches can view all player profiles" ON public.profiles;
CREATE POLICY "Scouts and coaches can view all player profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  public.user_has_role(id, 'player'::app_role)
  AND (public.user_has_role(auth.uid(), 'scout'::app_role) OR public.user_has_role(auth.uid(), 'coach'::app_role))
  AND NOT public.is_blocked_pair(auth.uid(), id)
);

DROP POLICY IF EXISTS "Users can view profiles of scouts with follow requests" ON public.profiles;
CREATE POLICY "Users can view profiles of scouts with follow requests"
ON public.profiles FOR SELECT TO authenticated
USING (
  id IN (SELECT sf.scout_id FROM public.scout_follows sf WHERE sf.player_id = auth.uid())
  AND NOT public.is_blocked_pair(auth.uid(), id)
);
