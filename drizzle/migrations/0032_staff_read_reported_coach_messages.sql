CREATE POLICY "staff read reported messages" ON public.coach_messages FOR SELECT TO authenticated
USING ((public.has_role(auth.uid(),'owner'::app_role) OR public.has_role(auth.uid(),'admin'::app_role))
  AND EXISTS (SELECT 1 FROM public.content_reports r WHERE r.content_type='coach_message' AND r.content_id = coach_messages.id::text));