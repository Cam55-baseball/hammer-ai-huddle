CREATE OR REPLACE FUNCTION public.folder_owned_by_current_user(p_folder_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.activity_folders f WHERE f.id = p_folder_id AND f.owner_id = auth.uid()); $$;
REVOKE ALL ON FUNCTION public.folder_owned_by_current_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.folder_owned_by_current_user(uuid) TO authenticated, service_role;
ALTER POLICY "Folder owners manage folder permissions" ON public.folder_coach_permissions
USING (granted_by = auth.uid() AND public.folder_owned_by_current_user(folder_id))
WITH CHECK (granted_by = auth.uid() AND public.folder_owned_by_current_user(folder_id) AND (revoked_at IS NOT NULL OR public.is_coach_of(coach_user_id, auth.uid()) OR EXISTS (SELECT 1 FROM public.scout_follows sf WHERE sf.scout_id = folder_coach_permissions.coach_user_id AND sf.player_id = auth.uid() AND sf.status = 'accepted')));
COMMENT ON FUNCTION public.folder_owned_by_current_user(uuid) IS 'Self-scoped folder ownership check; avoids cross-table RLS recursion without changing grant authorization.';