ALTER TABLE public.wk_movement_catalog
  ADD COLUMN IF NOT EXISTS jump_class text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS jump_mechanics text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS jump_intensity text,
  ADD COLUMN IF NOT EXISTS jump_direction text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS jump_stance text,
  ADD COLUMN IF NOT EXISTS jump_execution text,
  ADD COLUMN IF NOT EXISTS jump_landing_strategy text,
  ADD COLUMN IF NOT EXISTS jump_load text,
  ADD COLUMN IF NOT EXISTS jump_objectives text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS jump_level text,
  ADD COLUMN IF NOT EXISTS jump_min_readiness numeric,
  ADD COLUMN IF NOT EXISTS contact_method text,
  ADD COLUMN IF NOT EXISTS jump_sport_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS jump_role_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS jump_regressions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS jump_progressions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS jump_rest_seconds integer,
  ADD COLUMN IF NOT EXISTS jump_instructions text,
  ADD COLUMN IF NOT EXISTS jump_common_errors text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS jump_safety text[] NOT NULL DEFAULT '{}';
COMMENT ON COLUMN public.wk_movement_catalog.jump_level IS 'Owner Nov 1 round 6 jump taxonomy; builds on plyo_tier, never replaces it.';

CREATE TABLE public.jump_landing_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prescription_id uuid NOT NULL,
  plan_date date NOT NULL,
  movement_slug text,
  set_index integer NOT NULL,
  rating text NOT NULL CHECK (rating IN ('solid','wobble','sloppy')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prescription_id, set_index)
);
GRANT SELECT, INSERT, UPDATE ON public.jump_landing_ratings TO authenticated;
GRANT ALL ON public.jump_landing_ratings TO service_role;
ALTER TABLE public.jump_landing_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players read own landing ratings" ON public.jump_landing_ratings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Players add own landing ratings" ON public.jump_landing_ratings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Players update own landing ratings" ON public.jump_landing_ratings FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX jump_landing_ratings_user_date ON public.jump_landing_ratings (user_id, plan_date);

CREATE OR REPLACE FUNCTION public.set_jump_tags(_slug text, _tags jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE before jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin')) THEN RAISE EXCEPTION 'not allowed'; END IF;
  IF _tags ? 'jump_level' AND (_tags->>'jump_level') IS NOT NULL AND (_tags->>'jump_level') NOT IN ('introduction','foundation','intermediate','advanced','elite') THEN RAISE EXCEPTION 'unknown level'; END IF;
  SELECT to_jsonb(c) - 'updated_at' INTO before FROM public.wk_movement_catalog c WHERE slug = _slug;
  IF before IS NULL THEN RAISE EXCEPTION 'unknown exercise'; END IF;
  UPDATE public.wk_movement_catalog SET
    jump_class = CASE WHEN _tags ? 'jump_class' THEN ARRAY(SELECT jsonb_array_elements_text(_tags->'jump_class')) ELSE jump_class END,
    jump_mechanics = CASE WHEN _tags ? 'jump_mechanics' THEN ARRAY(SELECT jsonb_array_elements_text(_tags->'jump_mechanics')) ELSE jump_mechanics END,
    jump_intensity = CASE WHEN _tags ? 'jump_intensity' THEN _tags->>'jump_intensity' ELSE jump_intensity END,
    jump_direction = CASE WHEN _tags ? 'jump_direction' THEN ARRAY(SELECT jsonb_array_elements_text(_tags->'jump_direction')) ELSE jump_direction END,
    jump_stance = CASE WHEN _tags ? 'jump_stance' THEN _tags->>'jump_stance' ELSE jump_stance END,
    jump_execution = CASE WHEN _tags ? 'jump_execution' THEN _tags->>'jump_execution' ELSE jump_execution END,
    jump_landing_strategy = CASE WHEN _tags ? 'jump_landing_strategy' THEN _tags->>'jump_landing_strategy' ELSE jump_landing_strategy END,
    jump_load = CASE WHEN _tags ? 'jump_load' THEN _tags->>'jump_load' ELSE jump_load END,
    jump_objectives = CASE WHEN _tags ? 'jump_objectives' THEN ARRAY(SELECT jsonb_array_elements_text(_tags->'jump_objectives')) ELSE jump_objectives END,
    jump_level = CASE WHEN _tags ? 'jump_level' THEN _tags->>'jump_level' ELSE jump_level END,
    jump_min_readiness = CASE WHEN _tags ? 'jump_min_readiness' THEN (_tags->>'jump_min_readiness')::numeric ELSE jump_min_readiness END,
    contact_method = CASE WHEN _tags ? 'contact_method' THEN _tags->>'contact_method' ELSE contact_method END,
    jump_sport_tags = CASE WHEN _tags ? 'jump_sport_tags' THEN ARRAY(SELECT jsonb_array_elements_text(_tags->'jump_sport_tags')) ELSE jump_sport_tags END,
    jump_role_tags = CASE WHEN _tags ? 'jump_role_tags' THEN ARRAY(SELECT jsonb_array_elements_text(_tags->'jump_role_tags')) ELSE jump_role_tags END,
    jump_rest_seconds = CASE WHEN _tags ? 'jump_rest_seconds' THEN (_tags->>'jump_rest_seconds')::int ELSE jump_rest_seconds END,
    updated_at = now()
  WHERE slug = _slug;
  INSERT INTO public.exercise_vault_audit (slug, actor, action, detail) VALUES (_slug, auth.uid(), 'jump_tags', jsonb_build_object('before', before, 'tags', _tags));
END $$;
REVOKE ALL ON FUNCTION public.set_jump_tags(text, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_jump_tags(text, jsonb) TO authenticated;