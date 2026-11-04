CREATE TABLE public.baserunning_course_progress (
  user_id uuid NOT NULL,
  sport text NOT NULL CHECK (sport IN ('baseball','softball')),
  step_key text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, sport, step_key)
);
GRANT SELECT, INSERT, UPDATE ON public.baserunning_course_progress TO authenticated;
GRANT ALL ON public.baserunning_course_progress TO service_role;
ALTER TABLE public.baserunning_course_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players read own course progress" ON public.baserunning_course_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Players save own course progress" ON public.baserunning_course_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Players update own course progress" ON public.baserunning_course_progress FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
ALTER TABLE public.mind_item_logs DROP CONSTRAINT mind_item_logs_kind_check;
ALTER TABLE public.mind_item_logs ADD CONSTRAINT mind_item_logs_kind_check CHECK (kind = ANY (ARRAY['situations','film_study','tex_vision','breathing','focus_routine','journaling','owner_mind','baserunning_iq']));