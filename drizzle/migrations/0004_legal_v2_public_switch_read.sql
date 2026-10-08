GRANT SELECT ON public.wk_feature_switches TO anon;
CREATE POLICY "Visitors can read the legal_v2 switch" ON public.wk_feature_switches
  FOR SELECT TO anon USING (feature_key = 'legal_v2');