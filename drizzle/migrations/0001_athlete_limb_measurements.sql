CREATE TABLE public.athlete_limb_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  measured_on date NOT NULL DEFAULT CURRENT_DATE,
  standing_height_in numeric,
  wingspan_in numeric,
  sitting_height_in numeric,
  hand_length_in numeric,
  source text NOT NULL DEFAULT 'self',
  entered_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT limb_ranges CHECK (
    (wingspan_in IS NULL OR wingspan_in BETWEEN 30 AND 100) AND
    (sitting_height_in IS NULL OR sitting_height_in BETWEEN 15 AND 50) AND
    (hand_length_in IS NULL OR hand_length_in BETWEEN 3 AND 12) AND
    (standing_height_in IS NULL OR standing_height_in BETWEEN 30 AND 96))
);
COMMENT ON TABLE public.athlete_limb_measurements IS 'Limb-size history (collection only). Not read by any prescription until the owner approves.';
CREATE INDEX athlete_limb_measurements_user_date ON public.athlete_limb_measurements (user_id, measured_on DESC);
GRANT SELECT, INSERT ON public.athlete_limb_measurements TO authenticated;
GRANT ALL ON public.athlete_limb_measurements TO service_role;
ALTER TABLE public.athlete_limb_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own limb rows read" ON public.athlete_limb_measurements FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own limb rows insert" ON public.athlete_limb_measurements FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "linked coach reads limb rows" ON public.athlete_limb_measurements FOR SELECT TO authenticated USING (public.is_linked_coach(auth.uid(), user_id));