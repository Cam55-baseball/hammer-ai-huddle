CREATE TABLE public.plan_mind_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('situation','advice')),
  builtin_key text,
  title text NOT NULL,
  body text NOT NULL,
  category text,
  season_phases text[] NOT NULL DEFAULT '{}',
  situation_type text,
  sports text[] NOT NULL DEFAULT '{}',
  positions text[] NOT NULL DEFAULT '{}',
  levels text[] NOT NULL DEFAULT '{}',
  programs text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, builtin_key)
);
COMMENT ON TABLE public.plan_mind_content IS 'Owner-authored Game situations (Mind) and Today''s coach advice. Rows with builtin_key override the built-in item with that key; others add new items. Empty tag arrays match everyone.';
GRANT SELECT, INSERT, UPDATE ON public.plan_mind_content TO authenticated;
GRANT ALL ON public.plan_mind_content TO service_role;
ALTER TABLE public.plan_mind_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in players read mind content" ON public.plan_mind_content FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner/admin add mind content" ON public.plan_mind_content FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owner/admin edit mind content" ON public.plan_mind_content FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));