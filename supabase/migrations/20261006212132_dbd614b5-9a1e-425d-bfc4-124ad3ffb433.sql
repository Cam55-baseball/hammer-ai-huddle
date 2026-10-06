DROP POLICY IF EXISTS "Anyone can view public shared templates" ON public.shared_activity_templates;
CREATE POLICY "Anyone can view public shared templates" ON public.shared_activity_templates FOR SELECT
  USING (is_public = true AND NOT public.is_account_paused(user_id) AND NOT COALESCE(public.is_under_13(user_id), false));