CREATE TABLE public.mind_item_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_date date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('situations','film_study','tex_vision','breathing','focus_routine','journaling')),
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_date)
);
GRANT SELECT, INSERT, DELETE ON public.mind_item_logs TO authenticated;
GRANT ALL ON public.mind_item_logs TO service_role;
ALTER TABLE public.mind_item_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players read own mind logs" ON public.mind_item_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Players log own mind item" ON public.mind_item_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND item_date BETWEEN (now() AT TIME ZONE 'utc')::date - 1 AND (now() AT TIME ZONE 'utc')::date + 1);
CREATE POLICY "Players undo own mind log" ON public.mind_item_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);