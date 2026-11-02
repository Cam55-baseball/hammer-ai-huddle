ALTER TYPE public.skill_domain_enum ADD VALUE IF NOT EXISTS 'speed_conditioning';
ALTER TYPE public.skill_domain_enum ADD VALUE IF NOT EXISTS 'lifting';
ALTER TYPE public.skill_domain_enum ADD VALUE IF NOT EXISTS 'jumps';
ALTER TYPE public.skill_domain_enum ADD VALUE IF NOT EXISTS 'bat_speed';
ALTER TYPE public.skill_domain_enum ADD VALUE IF NOT EXISTS 'tissue_care';
ALTER TYPE public.skill_domain_enum ADD VALUE IF NOT EXISTS 'mobility';
ALTER TYPE public.skill_domain_enum ADD VALUE IF NOT EXISTS 'mind';
ALTER TYPE public.skill_domain_enum ADD VALUE IF NOT EXISTS 'vision';
ALTER TYPE public.skill_domain_enum ADD VALUE IF NOT EXISTS 'recovery_education';

CREATE TABLE IF NOT EXISTS public.video_tag_dimension_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension text NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  sort smallint NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dimension, key)
);
GRANT SELECT ON public.video_tag_dimension_values TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.video_tag_dimension_values TO authenticated;
GRANT ALL ON public.video_tag_dimension_values TO service_role;
ALTER TABLE public.video_tag_dimension_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dimension values readable by signed-in users" ON public.video_tag_dimension_values FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner manages dimension values" ON public.video_tag_dimension_values FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'owner'::public.app_role));
CREATE TRIGGER trg_vtdv_updated_at BEFORE UPDATE ON public.video_tag_dimension_values FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Signed-in users read tags of shown videos" ON public.video_tag_assignments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.library_videos lv WHERE lv.id = video_tag_assignments.video_id
    AND lv.distribution_tier <> 'blocked' AND lv.moderation_removed_at IS NULL));