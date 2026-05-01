-- Allow taxonomy_expansion as a valid source for Hammer-generated suggestions
-- triggered when a new tag is added to the taxonomy.
ALTER TABLE public.video_tag_suggestions
  DROP CONSTRAINT IF EXISTS video_tag_suggestions_source_check;

ALTER TABLE public.video_tag_suggestions
  ADD CONSTRAINT video_tag_suggestions_source_check
  CHECK (source IN ('ai_description','pattern_discovery','taxonomy_expansion'));