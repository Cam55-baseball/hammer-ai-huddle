
CREATE OR REPLACE FUNCTION public.can_edit_folder_item(p_user_id uuid, p_folder_item_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.activity_folder_items afi
    JOIN public.activity_folders af ON af.id = afi.folder_id
    WHERE afi.id = p_folder_item_id
      AND (
        -- Owner
        af.owner_id = p_user_id
        -- Head coach (primary_coach_id) UNLESS explicitly revoked for this folder
        OR (
          EXISTS (
            SELECT 1 FROM public.athlete_mpi_settings ams
            WHERE ams.user_id = af.owner_id
              AND ams.primary_coach_id = p_user_id
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.folder_coach_permissions fcp
            WHERE fcp.folder_id = af.id
              AND fcp.coach_user_id = p_user_id
              AND fcp.revoked_at IS NOT NULL
          )
        )
        -- Explicit folder permission
        OR EXISTS (
          SELECT 1 FROM public.folder_coach_permissions fcp
          WHERE fcp.folder_id = af.id
            AND fcp.coach_user_id = p_user_id
            AND fcp.permission_level IN ('edit', 'view')
            AND fcp.revoked_at IS NULL
        )
        -- Legacy coach_edit mechanism
        OR (af.coach_edit_allowed = true AND af.coach_edit_user_id = p_user_id)
      )
  )
$function$;
