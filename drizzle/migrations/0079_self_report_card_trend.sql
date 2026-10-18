CREATE OR REPLACE FUNCTION public.get_my_report_card_trend(p_module text, p_limit integer DEFAULT 8)
 RETURNS TABLE(id uuid, created_at timestamp with time zone, sport text, module text, ai_analysis jsonb)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT v.id, v.created_at, v.sport::text, v.module::text,
         jsonb_build_object('metrics', v.ai_analysis::jsonb -> 'metrics')
  FROM public.videos v
  WHERE auth.uid() IS NOT NULL AND v.user_id = auth.uid()
    AND v.module::text = p_module AND v.ai_analysis IS NOT NULL
  ORDER BY v.created_at DESC LIMIT LEAST(GREATEST(p_limit, 1), 100);
$$;
REVOKE ALL ON FUNCTION public.get_my_report_card_trend(text, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_report_card_trend(text, integer) TO authenticated;