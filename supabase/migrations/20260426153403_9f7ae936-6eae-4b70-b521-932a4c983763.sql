-- ============================================================
-- Phase 6: Distribution tier + monetization layer
-- ============================================================

-- 1. Cached columns on library_videos
ALTER TABLE public.library_videos
  ADD COLUMN IF NOT EXISTS confidence_score smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS distribution_tier text NOT NULL DEFAULT 'blocked'
    CHECK (distribution_tier IN ('blocked','throttled','normal','boosted','featured'));

CREATE INDEX IF NOT EXISTS idx_library_videos_tier ON public.library_videos(distribution_tier);

-- 2. Trigger function — recompute confidence + tier from current state
CREATE OR REPLACE FUNCTION public.recompute_library_video_tier(p_video_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_format text;
  v_domains text[];
  v_desc text;
  v_assignment_count int;
  v_unique_layers int;
  v_score int := 0;
  v_tier text;
  v_desc_len int;
  v_missing int := 0;
BEGIN
  SELECT video_format, skill_domains, ai_description
    INTO v_format, v_domains, v_desc
  FROM public.library_videos
  WHERE id = p_video_id;

  IF NOT FOUND THEN RETURN; END IF;

  -- assignment count + unique layer count via taxonomy join
  SELECT COUNT(*)::int,
         COUNT(DISTINCT t.layer)::int
    INTO v_assignment_count, v_unique_layers
  FROM public.video_tag_assignments vta
  JOIN public.video_tag_taxonomy t ON t.id = vta.tag_id
  WHERE vta.video_id = p_video_id;

  -- ===== Confidence breakdown (mirrors src/lib/videoConfidence.ts) =====
  -- Format (15)
  IF v_format IS NOT NULL THEN v_score := v_score + 15; ELSE v_missing := v_missing + 1; END IF;

  -- Skill domain (15)
  IF v_domains IS NOT NULL AND array_length(v_domains, 1) > 0 THEN
    v_score := v_score + 15;
  ELSE
    v_missing := v_missing + 1;
  END IF;

  -- Description (0–25). Verb floor is approximated DB-side.
  IF v_desc IS NULL OR length(trim(v_desc)) = 0 THEN
    v_missing := v_missing + 1;
  ELSE
    v_desc_len := length(trim(v_desc));
    IF v_desc_len >= 140 THEN v_score := v_score + 25;
    ELSIF v_desc_len >= 60 THEN v_score := v_score + 20;
    ELSIF v_desc_len >= 20 THEN v_score := v_score + 10;
    END IF;
  END IF;

  -- Tag count (0–20) — over-tagging penalty above 6
  IF v_assignment_count <= 0 THEN
    v_missing := v_missing + 1;
  ELSIF v_assignment_count = 1 THEN
    v_score := v_score + 5;
  ELSIF v_assignment_count = 2 THEN
    v_score := v_score + 12;
  ELSIF v_assignment_count <= 6 THEN
    v_score := v_score + 20;
  ELSE
    v_score := v_score + 15;
  END IF;

  -- Tag layer diversity (0–25)
  IF v_unique_layers > 0 THEN
    v_score := v_score + LEAST(25, 1 + v_unique_layers * 6);
  END IF;

  v_score := LEAST(100, GREATEST(0, v_score));

  -- ===== Distribution tier =====
  IF v_missing = 4 THEN
    v_tier := 'blocked';
  ELSIF v_missing > 0 OR v_score < 70 THEN
    v_tier := 'throttled';
  ELSIF v_score >= 95 THEN
    v_tier := 'featured';
  ELSIF v_score >= 90 THEN
    v_tier := 'boosted';
  ELSE
    v_tier := 'normal';
  END IF;

  UPDATE public.library_videos
  SET confidence_score = v_score,
      distribution_tier = v_tier,
      updated_at = now()
  WHERE id = p_video_id;
END;
$$;

-- 3. Triggers — fire on library_videos field changes and on assignment changes
CREATE OR REPLACE FUNCTION public.trg_recompute_tier_on_video()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only recompute when a relevant field changes (or on insert)
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recompute_library_video_tier(NEW.id);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.video_format IS DISTINCT FROM OLD.video_format
       OR NEW.skill_domains IS DISTINCT FROM OLD.skill_domains
       OR NEW.ai_description IS DISTINCT FROM OLD.ai_description THEN
      PERFORM public.recompute_library_video_tier(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS library_videos_recompute_tier ON public.library_videos;
CREATE TRIGGER library_videos_recompute_tier
AFTER INSERT OR UPDATE OF video_format, skill_domains, ai_description
ON public.library_videos
FOR EACH ROW
EXECUTE FUNCTION public.trg_recompute_tier_on_video();

CREATE OR REPLACE FUNCTION public.trg_recompute_tier_on_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_library_video_tier(OLD.video_id);
    RETURN OLD;
  ELSE
    PERFORM public.recompute_library_video_tier(NEW.video_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS assignments_recompute_tier ON public.video_tag_assignments;
CREATE TRIGGER assignments_recompute_tier
AFTER INSERT OR UPDATE OR DELETE
ON public.video_tag_assignments
FOR EACH ROW
EXECUTE FUNCTION public.trg_recompute_tier_on_assignment();

-- 4. Backfill all existing rows
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.library_videos LOOP
    PERFORM public.recompute_library_video_tier(r.id);
  END LOOP;
END $$;

-- 5. Public view — athletes never see blocked videos
CREATE OR REPLACE VIEW public.public_library_videos
WITH (security_invoker = on)
AS
  SELECT * FROM public.library_videos WHERE distribution_tier <> 'blocked';

GRANT SELECT ON public.public_library_videos TO authenticated;

-- 6. Monetization table (Phase 6 — metadata only; no Stripe yet)
CREATE TABLE IF NOT EXISTS public.library_video_monetization (
  video_id uuid PRIMARY KEY REFERENCES public.library_videos(id) ON DELETE CASCADE,
  cta_type text CHECK (cta_type IN ('program','bundle','consultation') OR cta_type IS NULL),
  cta_url text,
  linked_program_id uuid,
  series_slug text,
  conversion_score smallint NOT NULL DEFAULT 0 CHECK (conversion_score BETWEEN 0 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.library_video_monetization ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view monetization" ON public.library_video_monetization;
CREATE POLICY "Authenticated users can view monetization"
  ON public.library_video_monetization
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Owner can manage monetization" ON public.library_video_monetization;
CREATE POLICY "Owner can manage monetization"
  ON public.library_video_monetization
  FOR ALL
  TO authenticated
  USING (public.user_has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (public.user_has_role(auth.uid(), 'owner'::app_role));

-- updated_at trigger
DROP TRIGGER IF EXISTS monetization_updated_at ON public.library_video_monetization;
CREATE TRIGGER monetization_updated_at
BEFORE UPDATE ON public.library_video_monetization
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();