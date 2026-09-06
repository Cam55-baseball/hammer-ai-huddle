ALTER TABLE public.scout_context ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.coach_context ADD COLUMN IF NOT EXISTS completed_at timestamptz;

UPDATE public.scout_context SET completed_at = COALESCE(completed_at, updated_at, created_at, now()) WHERE completed_at IS NULL;
UPDATE public.coach_context SET completed_at = COALESCE(completed_at, updated_at, created_at, now()) WHERE completed_at IS NULL;

CREATE OR REPLACE FUNCTION public.has_player_module(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.user_id = _user_id
      AND s.status = 'active'
      AND COALESCE(array_length(s.subscribed_modules, 1), 0) > 0
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_player_module(uuid) TO authenticated, service_role;