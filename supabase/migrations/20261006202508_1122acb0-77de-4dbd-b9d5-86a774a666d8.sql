DROP POLICY IF EXISTS "Authenticated users can view all rankings" ON public.mpi_scores;
CREATE POLICY "Rankings hide paused and under-13 players" ON public.mpi_scores FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin')
  OR (NOT public.is_account_paused(user_id) AND NOT coalesce(public.is_under_13(user_id), false))
);