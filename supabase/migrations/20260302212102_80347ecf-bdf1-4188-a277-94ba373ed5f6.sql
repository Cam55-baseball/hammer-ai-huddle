
-- New SELECT policy on activity_folders for coaches with folder permissions or head coach access
CREATE POLICY "Coaches with folder permissions can view"
ON public.activity_folders FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.folder_coach_permissions fcp
    WHERE fcp.folder_id = activity_folders.id
      AND fcp.coach_user_id = auth.uid()
      AND fcp.revoked_at IS NULL
  )
  OR (
    EXISTS (
      SELECT 1 FROM public.athlete_mpi_settings ams
      WHERE ams.user_id = activity_folders.owner_id
        AND ams.primary_coach_id = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.folder_coach_permissions fcp
      WHERE fcp.folder_id = activity_folders.id
        AND fcp.coach_user_id = auth.uid()
        AND fcp.revoked_at IS NOT NULL
    )
  )
);

-- New SELECT policy on activity_folder_items for coaches with folder permissions or head coach access
CREATE POLICY "Coaches with folder permissions can view items"
ON public.activity_folder_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.folder_coach_permissions fcp
    WHERE fcp.folder_id = activity_folder_items.folder_id
      AND fcp.coach_user_id = auth.uid()
      AND fcp.revoked_at IS NULL
  )
  OR EXISTS (
    SELECT 1 FROM public.activity_folders af
    JOIN public.athlete_mpi_settings ams ON ams.user_id = af.owner_id
    WHERE af.id = activity_folder_items.folder_id
      AND ams.primary_coach_id = auth.uid()
      AND NOT EXISTS (
        SELECT 1 FROM public.folder_coach_permissions fcp2
        WHERE fcp2.folder_id = af.id
          AND fcp2.coach_user_id = auth.uid()
          AND fcp2.revoked_at IS NOT NULL
      )
  )
);
