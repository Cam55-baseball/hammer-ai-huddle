DROP POLICY IF EXISTS "Users can read blocks involving them" ON public.user_blocks;

CREATE POLICY "Users can read only their own blocks"
  ON public.user_blocks FOR SELECT TO authenticated
  USING (auth.uid() = blocker_id);

CREATE OR REPLACE FUNCTION public.blocked_user_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN b.blocker_id = auth.uid() THEN b.blocked_id ELSE b.blocker_id END
  FROM public.user_blocks b
  WHERE auth.uid() IS NOT NULL
    AND (b.blocker_id = auth.uid() OR b.blocked_id = auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.blocked_user_ids() TO authenticated;