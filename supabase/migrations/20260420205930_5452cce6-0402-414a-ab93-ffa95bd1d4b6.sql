-- Staging table: AI-proposed tags per video
CREATE TABLE public.video_tag_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.library_videos(id) ON DELETE CASCADE,
  layer public.video_tag_layer_enum NOT NULL,
  suggested_key text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  source text NOT NULL DEFAULT 'ai_description' CHECK (source IN ('ai_description','pattern_discovery')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reasoning text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamptz
);

CREATE INDEX idx_vts_status ON public.video_tag_suggestions(status, created_at DESC);
CREATE INDEX idx_vts_video ON public.video_tag_suggestions(video_id);

ALTER TABLE public.video_tag_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view tag suggestions"
ON public.video_tag_suggestions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'owner'::public.app_role));

CREATE POLICY "Owners can update tag suggestions"
ON public.video_tag_suggestions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'owner'::public.app_role));

CREATE POLICY "Owners can insert tag suggestions"
ON public.video_tag_suggestions FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'owner'::public.app_role));

CREATE POLICY "Owners can delete tag suggestions"
ON public.video_tag_suggestions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'owner'::public.app_role));

-- Staging table: AI-discovered rule proposals
CREATE TABLE public.video_rule_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_domain public.skill_domain_enum NOT NULL,
  movement_key text NOT NULL,
  result_key text,
  context_key text,
  correction_key text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  reasoning text,
  source_video_ids uuid[] DEFAULT ARRAY[]::uuid[],
  sample_size int DEFAULT 0,
  avg_improvement numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamptz
);

CREATE INDEX idx_vrs_status ON public.video_rule_suggestions(status, created_at DESC);

ALTER TABLE public.video_rule_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view rule suggestions"
ON public.video_rule_suggestions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'owner'::public.app_role));

CREATE POLICY "Owners can update rule suggestions"
ON public.video_rule_suggestions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'owner'::public.app_role));

CREATE POLICY "Owners can insert rule suggestions"
ON public.video_rule_suggestions FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'owner'::public.app_role));

CREATE POLICY "Owners can delete rule suggestions"
ON public.video_rule_suggestions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'owner'::public.app_role));