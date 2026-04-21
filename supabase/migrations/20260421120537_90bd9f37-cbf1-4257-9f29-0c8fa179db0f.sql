CREATE TABLE IF NOT EXISTS public.recap_engine_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'global' UNIQUE,
  input_weights jsonb NOT NULL DEFAULT '{
    "mpi": 1.0,
    "scout_grades": 1.0,
    "performance_sessions": 1.0,
    "hie_snapshot": 1.0,
    "six_week_test": 1.0,
    "workload": 1.0,
    "physical": 1.0,
    "custom_activities": 1.0,
    "nutrition": 1.0,
    "mental_health": 1.0
  }'::jsonb,
  season_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  disabled_sections text[] NOT NULL DEFAULT ARRAY[]::text[],
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.recap_engine_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view recap engine settings"
ON public.recap_engine_settings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can insert recap engine settings"
ON public.recap_engine_settings FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can update recap engine settings"
ON public.recap_engine_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'::app_role));

CREATE TRIGGER update_recap_engine_settings_updated_at
BEFORE UPDATE ON public.recap_engine_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.recap_engine_settings (scope) VALUES ('global')
ON CONFLICT (scope) DO NOTHING;