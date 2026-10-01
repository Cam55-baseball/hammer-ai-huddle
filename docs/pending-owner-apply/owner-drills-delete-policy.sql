-- NOT APPLIED. Waits for owner approval. Lets staff fully delete a drill row.
-- The app only attempts deletion when no athlete was ever served the drill.
CREATE POLICY "Staff delete owner drills" ON public.owner_drills FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
GRANT DELETE ON public.owner_drills TO authenticated;
