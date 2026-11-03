-- Owner Nov 2 #10: periodization tuning lives in the owner's Coaching Console; the owner role must be able to save it.
CREATE POLICY wk_blocks_owner_write ON public.wk_periodization_blocks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role));
GRANT SELECT, INSERT, UPDATE ON public.wk_periodization_blocks TO authenticated;