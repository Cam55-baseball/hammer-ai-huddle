
-- Foundation video class: long-form A-Z philosophy videos
ALTER TABLE public.library_videos
  ADD COLUMN IF NOT EXISTS video_class text NOT NULL DEFAULT 'application',
  ADD COLUMN IF NOT EXISTS foundation_meta jsonb;

ALTER TABLE public.library_videos
  DROP CONSTRAINT IF EXISTS library_videos_video_class_check;
ALTER TABLE public.library_videos
  ADD CONSTRAINT library_videos_video_class_check
  CHECK (video_class IN ('application','foundation'));

CREATE INDEX IF NOT EXISTS idx_library_videos_video_class ON public.library_videos(video_class);
CREATE INDEX IF NOT EXISTS idx_library_videos_foundation_meta ON public.library_videos USING GIN (foundation_meta);

-- Update tier recompute to handle foundation videos by foundation completeness
CREATE OR REPLACE FUNCTION public.recompute_library_video_tier(p_video_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_class text;
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
  v_fmeta jsonb;
  v_fdomain text;
  v_fscope text;
  v_faudience jsonb;
  v_ftriggers jsonb;
BEGIN
  SELECT video_class, video_format, skill_domains, ai_description, foundation_meta
    INTO v_class, v_format, v_domains, v_desc, v_fmeta
  FROM public.library_videos
  WHERE id = p_video_id;

  IF NOT FOUND THEN RETURN; END IF;

  -- FOUNDATION videos: scored on foundation chip completeness, not per-rep taxonomy
  IF v_class = 'foundation' THEN
    v_fdomain   := COALESCE(v_fmeta->>'domain', '');
    v_fscope    := COALESCE(v_fmeta->>'scope', '');
    v_faudience := COALESCE(v_fmeta->'audience_levels', '[]'::jsonb);
    v_ftriggers := COALESCE(v_fmeta->'refresher_triggers', '[]'::jsonb);

    IF v_fdomain <> '' THEN v_score := v_score + 25; ELSE v_missing := v_missing + 1; END IF;
    IF v_fscope <> ''  THEN v_score := v_score + 20; ELSE v_missing := v_missing + 1; END IF;
    IF jsonb_typeof(v_faudience) = 'array' AND jsonb_array_length(v_faudience) > 0 THEN
      v_score := v_score + 15;
    ELSE v_missing := v_missing + 1;
    END IF;
    IF jsonb_typeof(v_ftriggers) = 'array' AND jsonb_array_length(v_ftriggers) > 0 THEN
      v_score := v_score + LEAST(25, 5 + jsonb_array_length(v_ftriggers) * 5);
    ELSE v_missing := v_missing + 1;
    END IF;
    IF v_desc IS NOT NULL AND length(trim(v_desc)) >= 40 THEN v_score := v_score + 15; END IF;

    v_score := LEAST(100, GREATEST(0, v_score));

    IF v_missing >= 3 THEN
      v_tier := 'blocked';   v_rank := 0;
    ELSIF v_missing > 0 OR v_score < 60 THEN
      v_tier := 'throttled'; v_rank := 1;
    ELSIF v_score >= 90 THEN
      v_tier := 'featured';  v_rank := 4;
    ELSIF v_score >= 80 THEN
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
    RETURN;
  END IF;

  -- APPLICATION videos: legacy per-rep taxonomy completeness
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
