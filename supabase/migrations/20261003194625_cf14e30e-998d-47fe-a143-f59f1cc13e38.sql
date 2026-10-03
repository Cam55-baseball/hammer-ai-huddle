-- Snapshot current privileges
CREATE TABLE IF NOT EXISTS public._snapshot_videos_acl_20261003 (
  taken_at timestamptz NOT NULL DEFAULT now(),
  relacl text NOT NULL
);
INSERT INTO public._snapshot_videos_acl_20261003 (relacl)
SELECT relacl::text FROM pg_class WHERE oid = 'public.videos'::regclass;
REVOKE ALL ON public._snapshot_videos_acl_20261003 FROM anon, authenticated;
GRANT ALL ON public._snapshot_videos_acl_20261003 TO service_role;
ALTER TABLE public._snapshot_videos_acl_20261003 ENABLE ROW LEVEL SECURITY;

-- Lock scored columns from direct reads
REVOKE SELECT ON public.videos FROM anon, authenticated;
DO $$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position) INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'videos'
    AND column_name NOT IN ('efficiency_score', 'ai_analysis');
  EXECUTE format('GRANT SELECT (%s) ON public.videos TO authenticated, anon', cols);
END $$;

-- Owner/admin-only score read
CREATE OR REPLACE FUNCTION public.get_staff_video_scores(p_video_ids uuid[])
RETURNS TABLE(id uuid, efficiency_score numeric, ai_analysis jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT v.id, v.efficiency_score::numeric, v.ai_analysis::jsonb
  FROM public.videos v WHERE v.id = ANY(p_video_ids);
END $$;

CREATE OR REPLACE FUNCTION public.get_staff_report_card_trend(p_user_id uuid, p_module text, p_limit int DEFAULT 8)
RETURNS TABLE(id uuid, created_at timestamptz, sport text, module text, ai_analysis jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT v.id, v.created_at, v.sport::text, v.module::text, v.ai_analysis::jsonb
  FROM public.videos v
  WHERE v.user_id = p_user_id AND v.module::text = p_module AND v.ai_analysis IS NOT NULL
  ORDER BY v.created_at DESC LIMIT LEAST(GREATEST(p_limit, 1), 100);
END $$;

-- Daily-plan side bias: summary only, never scores
CREATE OR REPLACE FUNCTION public.get_my_side_split_inputs()
RETURNS TABLE(discipline text, favored text, diff_pct double precision, left_n int, right_n int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH recent AS (
    SELECT module::text AS m, batting_side::text AS bs, throwing_hand::text AS th, efficiency_score::double precision AS s
    FROM public.videos WHERE user_id = auth.uid()
    ORDER BY created_at DESC LIMIT 200
  ), pts AS (
    SELECT 'hit'::text AS d, upper(left(trim(bs), 1)) AS side, s FROM recent
      WHERE s IS NOT NULL AND lower(coalesce(m,'')) IN ('hitting','bp','tee','soft_toss')
    UNION ALL
    SELECT 'throw', upper(left(trim(th), 1)), s FROM recent
      WHERE s IS NOT NULL AND lower(coalesce(m,'')) IN ('throwing','pitching','long_toss','bullpen')
  ), agg AS (
    SELECT d,
      count(*) FILTER (WHERE side='L')::int AS ln, count(*) FILTER (WHERE side='R')::int AS rn,
      avg(s) FILTER (WHERE side='L') AS lm, avg(s) FILTER (WHERE side='R') AS rm
    FROM pts GROUP BY d
  )
  SELECT d,
    CASE WHEN abs(rm-lm) < 1e-6 THEN 'even' WHEN rm-lm > 0 THEN 'R' ELSE 'L' END,
    (rm-lm) / CASE WHEN abs(lm) > 1e-9 THEN abs(lm) ELSE 1 END,
    ln, rn
  FROM agg WHERE ln >= 3 AND rn >= 3 AND auth.uid() IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.get_staff_video_scores(uuid[]) FROM public, anon;
REVOKE ALL ON FUNCTION public.get_staff_report_card_trend(uuid, text, int) FROM public, anon;
REVOKE ALL ON FUNCTION public.get_my_side_split_inputs() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_staff_video_scores(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_report_card_trend(uuid, text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_side_split_inputs() TO authenticated;