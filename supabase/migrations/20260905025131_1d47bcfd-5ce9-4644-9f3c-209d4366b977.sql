CREATE TABLE public.drill_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_id uuid NOT NULL REFERENCES public.drills(id) ON DELETE CASCADE,
  equipment text NOT NULL,
  required boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (drill_id, equipment)
);

CREATE INDEX idx_drill_equipment_drill ON public.drill_equipment(drill_id);
CREATE INDEX idx_drill_equipment_token ON public.drill_equipment(equipment);

GRANT SELECT ON public.drill_equipment TO authenticated;
GRANT SELECT ON public.drill_equipment TO anon;
GRANT ALL ON public.drill_equipment TO service_role;

ALTER TABLE public.drill_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read drill equipment tags"
ON public.drill_equipment FOR SELECT
USING (true);

CREATE POLICY "Owners and admins manage drill equipment tags"
ON public.drill_equipment FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER update_drill_equipment_updated_at
BEFORE UPDATE ON public.drill_equipment
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();