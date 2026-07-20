
ALTER TABLE public.iq_situations
  ADD COLUMN IF NOT EXISTS difficulty_rung int NOT NULL DEFAULT 1 CHECK (difficulty_rung BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS debrief text;

ALTER TABLE public.iq_concept_tags
  ADD COLUMN IF NOT EXISTS requires_concept_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

CREATE TABLE IF NOT EXISTS public.iq_alignment_combos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sport text NOT NULL CHECK (sport IN ('baseball','softball')),
  base_alignment_id uuid REFERENCES public.iq_defensive_alignments(id) ON DELETE SET NULL,
  layers jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.iq_alignment_combos TO authenticated;
GRANT ALL ON public.iq_alignment_combos TO service_role;

ALTER TABLE public.iq_alignment_combos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "combos readable by authenticated"
  ON public.iq_alignment_combos FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "combos writable by owner role"
  ON public.iq_alignment_combos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.iq_alignment_combos_touch()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_iq_alignment_combos_touch ON public.iq_alignment_combos;
CREATE TRIGGER trg_iq_alignment_combos_touch
BEFORE UPDATE ON public.iq_alignment_combos
FOR EACH ROW EXECUTE FUNCTION public.iq_alignment_combos_touch();
