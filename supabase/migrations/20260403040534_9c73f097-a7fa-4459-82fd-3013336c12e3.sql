ALTER TABLE public.drill_prescriptions
  ADD COLUMN IF NOT EXISTS drill_id UUID REFERENCES public.drills(id),
  ADD COLUMN IF NOT EXISTS targeted_metric TEXT;