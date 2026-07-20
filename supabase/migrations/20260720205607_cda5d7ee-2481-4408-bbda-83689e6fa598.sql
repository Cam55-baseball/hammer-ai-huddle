
-- Phase 2 additive columns
ALTER TABLE public.iq_situation_actors
  ADD COLUMN IF NOT EXISTS footwork_cue text,
  ADD COLUMN IF NOT EXISTS eyes_target text,
  ADD COLUMN IF NOT EXISTS start_at numeric,
  ADD COLUMN IF NOT EXISTS end_at numeric;

ALTER TABLE public.iq_scenarios
  ADD COLUMN IF NOT EXISTS ball_track jsonb;

-- Concept tag catalog
CREATE TABLE IF NOT EXISTS public.iq_concept_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport text NOT NULL DEFAULT 'both',
  key text NOT NULL,
  label text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sport, key)
);
GRANT SELECT ON public.iq_concept_tags TO anon, authenticated;
GRANT ALL ON public.iq_concept_tags TO service_role;
ALTER TABLE public.iq_concept_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "iq_concept_tags readable by all"
  ON public.iq_concept_tags FOR SELECT USING (true);

-- Situation → concept mapping
CREATE TABLE IF NOT EXISTS public.iq_situation_concepts (
  situation_id uuid NOT NULL REFERENCES public.iq_situations(id) ON DELETE CASCADE,
  concept_id uuid NOT NULL REFERENCES public.iq_concept_tags(id) ON DELETE CASCADE,
  weight integer NOT NULL DEFAULT 1,
  PRIMARY KEY (situation_id, concept_id)
);
GRANT SELECT ON public.iq_situation_concepts TO anon, authenticated;
GRANT ALL ON public.iq_situation_concepts TO service_role;
ALTER TABLE public.iq_situation_concepts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "iq_situation_concepts readable by all"
  ON public.iq_situation_concepts FOR SELECT USING (true);

-- Per-user concept mastery (backed by iq_user_progress rollup + decay)
CREATE TABLE IF NOT EXISTS public.iq_user_concept_mastery (
  user_id uuid NOT NULL,
  concept_id uuid NOT NULL REFERENCES public.iq_concept_tags(id) ON DELETE CASCADE,
  mastery_score numeric NOT NULL DEFAULT 0,
  last_touched_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, concept_id)
);
GRANT SELECT ON public.iq_user_concept_mastery TO authenticated;
GRANT ALL ON public.iq_user_concept_mastery TO service_role;
ALTER TABLE public.iq_user_concept_mastery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "iq_user_concept_mastery owner read"
  ON public.iq_user_concept_mastery FOR SELECT
  USING (auth.uid() = user_id);
