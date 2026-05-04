
ALTER TABLE public.demo_progress
  ADD COLUMN IF NOT EXISTS interaction_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS dwell_ms jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.demo_video_prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sim_id text NOT NULL,
  severity_band text NOT NULL CHECK (severity_band IN ('minor','moderate','critical')),
  primary_axis text,
  video_refs jsonb NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sim_id, severity_band, primary_axis)
);

ALTER TABLE public.demo_video_prescriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demo_video_prescriptions_public_read" ON public.demo_video_prescriptions;
CREATE POLICY "demo_video_prescriptions_public_read"
  ON public.demo_video_prescriptions
  FOR SELECT USING (is_active);

CREATE INDEX IF NOT EXISTS idx_demo_events_user_created
  ON public.demo_events (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.validate_demo_registry_node()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR length(trim(NEW.slug)) = 0 THEN
    RAISE EXCEPTION 'demo_registry.slug is required';
  END IF;
  IF NEW.title IS NULL OR length(trim(NEW.title)) = 0 THEN
    RAISE EXCEPTION 'demo_registry.title is required';
  END IF;
  IF NEW.node_type NOT IN ('tier','category','submodule') THEN
    RAISE EXCEPTION 'demo_registry.node_type invalid: %', NEW.node_type;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.demo_registry
    WHERE slug = NEW.slug
      AND node_type = NEW.node_type
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'demo_registry slug % already exists for node_type %', NEW.slug, NEW.node_type;
  END IF;

  IF NEW.node_type = 'category' THEN
    IF NEW.parent_slug IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.demo_registry WHERE node_type='tier' AND slug = NEW.parent_slug
    ) THEN
      RAISE EXCEPTION 'category % has invalid parent tier %', NEW.slug, NEW.parent_slug;
    END IF;
  ELSIF NEW.node_type = 'submodule' THEN
    IF NEW.parent_slug IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.demo_registry WHERE node_type='category' AND slug = NEW.parent_slug
    ) THEN
      RAISE EXCEPTION 'submodule % has invalid parent category %', NEW.slug, NEW.parent_slug;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_demo_registry_node ON public.demo_registry;
CREATE TRIGGER trg_validate_demo_registry_node
  BEFORE INSERT OR UPDATE ON public.demo_registry
  FOR EACH ROW EXECUTE FUNCTION public.validate_demo_registry_node();
