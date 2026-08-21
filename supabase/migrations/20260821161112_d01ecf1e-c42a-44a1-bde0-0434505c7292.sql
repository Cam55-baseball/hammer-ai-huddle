ALTER TABLE public.video_tag_taxonomy
  ADD COLUMN IF NOT EXISTS sport text NOT NULL DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS position_scope text[] NULL;

ALTER TABLE public.video_tag_taxonomy
  DROP CONSTRAINT IF EXISTS video_tag_taxonomy_sport_check;
ALTER TABLE public.video_tag_taxonomy
  ADD CONSTRAINT video_tag_taxonomy_sport_check CHECK (sport IN ('baseball','softball','both'));

ALTER TABLE public.video_tag_rules
  ADD COLUMN IF NOT EXISTS sport text NOT NULL DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS position_scope text[] NULL;

ALTER TABLE public.video_tag_rules
  DROP CONSTRAINT IF EXISTS video_tag_rules_sport_check;
ALTER TABLE public.video_tag_rules
  ADD CONSTRAINT video_tag_rules_sport_check CHECK (sport IN ('baseball','softball','both'));

CREATE INDEX IF NOT EXISTS idx_video_tag_taxonomy_domain_sport
  ON public.video_tag_taxonomy (skill_domain, sport, layer);
CREATE INDEX IF NOT EXISTS idx_video_tag_rules_domain_sport
  ON public.video_tag_rules (skill_domain, sport);