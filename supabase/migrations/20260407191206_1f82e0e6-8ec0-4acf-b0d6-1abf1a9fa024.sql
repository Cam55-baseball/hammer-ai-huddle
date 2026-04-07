
-- Phase 1a: Extend drills table
ALTER TABLE public.drills
  ADD COLUMN IF NOT EXISTS sport text NOT NULL DEFAULT 'baseball',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS ai_context text,
  ADD COLUMN IF NOT EXISTS premium boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Phase 1b: Create drill_tag_category enum
CREATE TYPE public.drill_tag_category AS ENUM (
  'skill', 'body_part', 'equipment', 'intensity', 'phase', 'position'
);

-- Phase 1c: Create drill_tags table
CREATE TABLE public.drill_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category public.drill_tag_category NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.drill_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read drill tags"
  ON public.drill_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owner manages drill tags"
  ON public.drill_tags FOR ALL
  TO authenticated
  USING (public.user_has_role(auth.uid(), 'owner'::public.app_role))
  WITH CHECK (public.user_has_role(auth.uid(), 'owner'::public.app_role));

-- Phase 1d: Create drill_tag_map junction table
CREATE TABLE public.drill_tag_map (
  drill_id UUID NOT NULL REFERENCES public.drills(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.drill_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (drill_id, tag_id)
);

ALTER TABLE public.drill_tag_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tag map"
  ON public.drill_tag_map FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owner manages tag map"
  ON public.drill_tag_map FOR ALL
  TO authenticated
  USING (public.user_has_role(auth.uid(), 'owner'::public.app_role))
  WITH CHECK (public.user_has_role(auth.uid(), 'owner'::public.app_role));

-- Phase 1e: Add owner write policy on drills table
CREATE POLICY "Owner can manage drills"
  ON public.drills FOR ALL
  TO authenticated
  USING (public.user_has_role(auth.uid(), 'owner'::public.app_role))
  WITH CHECK (public.user_has_role(auth.uid(), 'owner'::public.app_role));
