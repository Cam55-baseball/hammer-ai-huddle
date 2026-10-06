CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_hidden_account(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT account_paused_at IS NOT NULL
      OR (date_of_birth IS NOT NULL AND date_part('year', age(current_date, date_of_birth))::int < 13)
    FROM public.profiles WHERE id = _user_id), false)
$$;
REVOKE ALL ON FUNCTION private.is_hidden_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_hidden_account(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Rankings hide paused and under-13 players" ON public.mpi_scores;
CREATE POLICY "Rankings hide paused and under-13 players" ON public.mpi_scores FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin') OR NOT private.is_hidden_account(user_id));

DROP POLICY IF EXISTS "Anyone can view public shared templates" ON public.shared_activity_templates;
CREATE POLICY "Anyone can view public shared templates" ON public.shared_activity_templates FOR SELECT
  USING (is_public = true AND NOT private.is_hidden_account(user_id));

DROP FUNCTION public.is_hidden_account(uuid);