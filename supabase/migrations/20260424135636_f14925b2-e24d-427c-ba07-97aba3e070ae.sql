-- Recreate view with security_invoker so it respects caller's RLS, not creator's
DROP VIEW IF EXISTS public.pattern_library_ranked;
CREATE VIEW public.pattern_library_ranked
WITH (security_invoker = true) AS
SELECT
  apl.*,
  (apl.performance_outcome_score * apl.confidence / 100.0) AS rank_score
FROM public.anonymized_pattern_library apl
WHERE apl.confidence >= 30
ORDER BY (apl.performance_outcome_score * apl.confidence / 100.0) DESC;

-- Tighten function-logs INSERT: only service_role (which bypasses RLS anyway) or admins
DROP POLICY IF EXISTS "Service role writes function logs" ON public.engine_function_logs;
CREATE POLICY "Admins can write function logs"
  ON public.engine_function_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));