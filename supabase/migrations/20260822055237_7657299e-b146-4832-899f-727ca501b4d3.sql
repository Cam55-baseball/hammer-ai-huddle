-- Least-privilege closeout: signed-out callers lose access to privileged routines
-- that no public-facing policy or client path needs.
REVOKE EXECUTE ON FUNCTION public.assert_owns_block(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_authorizing_parent(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_minor(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_org_coach_or_owner(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_org_owner(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_system_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_recruiting_visibility(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_coach_of(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.folder_allows_coach_edit(uuid, uuid) FROM anon;

-- profiles_public is an intentional limited-exposure lookup (name / avatar / position)
-- for scouts and coaches. Signed-in only; signed-out visitors lose it.
REVOKE SELECT ON public.profiles_public FROM anon;

-- Internal-only tables: state the lock instead of implying it.
CREATE POLICY "No client access to hie_execution_locks"
  ON public.hie_execution_locks FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "No client access to launch_events"
  ON public.launch_events FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);