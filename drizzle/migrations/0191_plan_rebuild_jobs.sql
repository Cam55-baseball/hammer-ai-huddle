CREATE TABLE public.plan_rebuild_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reason text NOT NULL,
  first_date date NOT NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','done','failed')),
  dates_done text[] NOT NULL DEFAULT '{}',
  dates_failed text[] NOT NULL DEFAULT '{}',
  dates_kept text[] NOT NULL DEFAULT '{}',
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX plan_rebuild_jobs_user_created ON public.plan_rebuild_jobs (user_id, created_at DESC);
GRANT SELECT ON public.plan_rebuild_jobs TO authenticated;
GRANT ALL ON public.plan_rebuild_jobs TO service_role;
ALTER TABLE public.plan_rebuild_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players read own plan rebuilds" ON public.plan_rebuild_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);