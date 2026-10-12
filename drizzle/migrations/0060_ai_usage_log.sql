CREATE TABLE public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  function_name text NOT NULL,
  analysis_type text,
  provider text NOT NULL,
  model text,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  estimated_cost_usd numeric(10,6) NOT NULL DEFAULT 0,
  plan text NOT NULL DEFAULT 'player',
  ok boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_usage_log TO authenticated;
GRANT ALL ON public.ai_usage_log TO service_role;
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads AI usage" ON public.ai_usage_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX ai_usage_log_user_time ON public.ai_usage_log (user_id, created_at DESC);
CREATE INDEX ai_usage_log_time ON public.ai_usage_log (created_at DESC);

CREATE OR REPLACE FUNCTION public.ai_cost_summary(_days integer DEFAULT 30)
RETURNS TABLE(function_name text, analysis_type text, plan text, provider text, model text, calls bigint, avg_input numeric, avg_output numeric, avg_cost numeric, total_cost numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.function_name, l.analysis_type, l.plan, l.provider, l.model, count(*),
    round(avg(l.input_tokens)), round(avg(l.output_tokens)), round(avg(l.estimated_cost_usd),5), round(sum(l.estimated_cost_usd),4)
  FROM ai_usage_log l
  WHERE l.created_at > now() - make_interval(days => greatest(1, least(_days, 365)))
    AND (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  GROUP BY 1,2,3,4,5 ORDER BY 10 DESC
$$;
REVOKE ALL ON FUNCTION public.ai_cost_summary(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ai_cost_summary(integer) TO authenticated;