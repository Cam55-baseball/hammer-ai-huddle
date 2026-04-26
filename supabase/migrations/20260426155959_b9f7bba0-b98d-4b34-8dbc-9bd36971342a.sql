-- 1. Add tier_rank column
ALTER TABLE public.library_videos
  ADD COLUMN IF NOT EXISTS tier_rank smallint NOT NULL DEFAULT 2;

CREATE INDEX IF NOT EXISTS idx_library_videos_tier_rank
  ON public.library_videos (tier_rank DESC, confidence_score DESC, created_at DESC);

-- 2. Update recompute function to also write tier_rank
CREATE OR REPLACE FUNCTION public.recompute_library_video_tier(p_video_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_format text;
  v_domains text[];
  v_desc text;
  v_assignment_count int;
  v_unique_layers int;
  v_score int := 0;
  v_tier text;
  v_rank smallint;
  v_desc_len int;
  v_missing int := 0;
BEGIN
  SELECT video_format, skill_domains, ai_description
    INTO v_format, v_domains, v_desc
  FROM public.library_videos
  WHERE id = p_video_id;

  IF NOT FOUND THEN RETURN; END IF;

  SELECT COUNT(*)::int,
         COUNT(DISTINCT t.layer)::int
    INTO v_assignment_count, v_unique_layers
  FROM public.video_tag_assignments vta
  JOIN public.video_tag_taxonomy t ON t.id = vta.tag_id
  WHERE vta.video_id = p_video_id;

  IF v_format IS NOT NULL THEN v_score := v_score + 15; ELSE v_missing := v_missing + 1; END IF;

  IF v_domains IS NOT NULL AND array_length(v_domains, 1) > 0 THEN
    v_score := v_score + 15;
  ELSE
    v_missing := v_missing + 1;
  END IF;

  IF v_desc IS NULL OR length(trim(v_desc)) = 0 THEN
    v_missing := v_missing + 1;
  ELSE
    v_desc_len := length(trim(v_desc));
    IF v_desc_len >= 140 THEN v_score := v_score + 25;
    ELSIF v_desc_len >= 60 THEN v_score := v_score + 20;
    ELSIF v_desc_len >= 20 THEN v_score := v_score + 10;
    END IF;
  END IF;

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

  IF v_unique_layers > 0 THEN
    v_score := v_score + LEAST(25, 1 + v_unique_layers * 6);
  END IF;

  v_score := LEAST(100, GREATEST(0, v_score));

  IF v_missing = 4 THEN
    v_tier := 'blocked';   v_rank := 0;
  ELSIF v_missing > 0 OR v_score < 70 THEN
    v_tier := 'throttled'; v_rank := 1;
  ELSIF v_score >= 95 THEN
    v_tier := 'featured';  v_rank := 4;
  ELSIF v_score >= 90 THEN
    v_tier := 'boosted';   v_rank := 3;
  ELSE
    v_tier := 'normal';    v_rank := 2;
  END IF;

  UPDATE public.library_videos
  SET confidence_score = v_score,
      distribution_tier = v_tier,
      tier_rank = v_rank,
      updated_at = now()
  WHERE id = p_video_id;
END;
$function$;

-- 3. Backfill tier_rank for existing rows
UPDATE public.library_videos
SET tier_rank = CASE distribution_tier
  WHEN 'featured' THEN 4
  WHEN 'boosted'  THEN 3
  WHEN 'normal'   THEN 2
  WHEN 'throttled' THEN 1
  WHEN 'blocked'  THEN 0
  ELSE 2
END;

-- 4. Lock public view: blocked OR null-confidence are invisible
DROP VIEW IF EXISTS public.public_library_videos;
CREATE VIEW public.public_library_videos
WITH (security_invoker = on) AS
SELECT *
FROM public.library_videos
WHERE distribution_tier <> 'blocked'
  AND confidence_score IS NOT NULL;