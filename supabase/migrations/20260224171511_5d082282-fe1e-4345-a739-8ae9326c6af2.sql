
-- =============================================
-- Migration 3: Roadmap and Progression Tables
-- =============================================

-- roadmap_milestones: Progression definitions
CREATE TABLE public.roadmap_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport text NOT NULL,
  module text NOT NULL,
  milestone_name text NOT NULL,
  milestone_order integer,
  requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  badge_name text,
  badge_icon text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.roadmap_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can select milestones"
  ON public.roadmap_milestones FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage milestones"
  ON public.roadmap_milestones FOR ALL
  TO authenticated
  USING (public.user_has_role(auth.uid(), 'admin'));

-- athlete_roadmap_progress: Per-user roadmap state
CREATE TABLE public.athlete_roadmap_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  milestone_id uuid NOT NULL REFERENCES public.roadmap_milestones(id),
  status text DEFAULT 'not_started',
  blocked_reason text,
  progress_pct numeric DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.athlete_roadmap_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own roadmap progress"
  ON public.athlete_roadmap_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.user_has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own roadmap progress"
  ON public.athlete_roadmap_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own roadmap progress"
  ON public.athlete_roadmap_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.user_has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roadmap progress"
  ON public.athlete_roadmap_progress FOR DELETE
  TO authenticated
  USING (public.user_has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_athlete_roadmap_progress_updated_at
  BEFORE UPDATE ON public.athlete_roadmap_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_roadmap_progress_user ON public.athlete_roadmap_progress(user_id);
CREATE INDEX idx_roadmap_milestones_sport ON public.roadmap_milestones(sport, module);
