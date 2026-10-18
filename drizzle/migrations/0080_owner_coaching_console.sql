CREATE TABLE public.coaching_principles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  active boolean NOT NULL DEFAULT true,
  current_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.coaching_principles TO authenticated;
GRANT ALL ON public.coaching_principles TO service_role;
ALTER TABLE public.coaching_principles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner/admin read principles" ON public.coaching_principles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner/admin add principles" ON public.coaching_principles FOR INSERT TO authenticated
  WITH CHECK ((public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin')) AND created_by = auth.uid());
CREATE POLICY "Owner/admin switch principles" ON public.coaching_principles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.coaching_principle_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  principle_id uuid NOT NULL REFERENCES public.coaching_principles(id),
  version integer NOT NULL,
  body text NOT NULL,
  sport text NOT NULL DEFAULT 'both',
  area text NOT NULL,
  situation text,
  applies_when text,
  not_when text,
  connected_work text,
  evidence_kind text NOT NULL DEFAULT 'experience',
  evidence_note text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (principle_id, version)
);
GRANT SELECT, INSERT ON public.coaching_principle_versions TO authenticated;
GRANT ALL ON public.coaching_principle_versions TO service_role;
ALTER TABLE public.coaching_principle_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner/admin read versions" ON public.coaching_principle_versions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner/admin add versions" ON public.coaching_principle_versions FOR INSERT TO authenticated
  WITH CHECK ((public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin')) AND created_by = auth.uid());

CREATE OR REPLACE FUNCTION public.coaching_versions_append_only() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'principle versions are append-only'; END $$;
CREATE TRIGGER coaching_versions_no_update BEFORE UPDATE OR DELETE ON public.coaching_principle_versions
  FOR EACH ROW EXECUTE FUNCTION public.coaching_versions_append_only();

ALTER TABLE public.intelligence_recommendations
  ADD COLUMN IF NOT EXISTS principle_version_id uuid REFERENCES public.coaching_principle_versions(id);

CREATE OR REPLACE FUNCTION public.owner_save_principle(
  _principle uuid, _body text, _sport text, _area text, _situation text, _applies_when text,
  _not_when text, _connected_work text, _evidence_kind text, _evidence_note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid := _principle; _v integer;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF coalesce(trim(_body), '') = '' OR coalesce(trim(_area), '') = '' THEN
    RAISE EXCEPTION 'principle text and area are required';
  END IF;
  IF _evidence_kind NOT IN ('experience', 'study', 'hammers_pattern') THEN
    RAISE EXCEPTION 'unknown evidence kind';
  END IF;
  IF _id IS NULL THEN
    INSERT INTO public.coaching_principles (created_by) VALUES (auth.uid()) RETURNING id INTO _id;
    _v := 1;
  ELSE
    SELECT current_version + 1 INTO _v FROM public.coaching_principles WHERE id = _id FOR UPDATE;
    IF _v IS NULL THEN RAISE EXCEPTION 'principle not found'; END IF;
    UPDATE public.coaching_principles SET current_version = _v, updated_at = now() WHERE id = _id;
  END IF;
  INSERT INTO public.coaching_principle_versions (principle_id, version, body, sport, area, situation,
    applies_when, not_when, connected_work, evidence_kind, evidence_note, created_by)
  VALUES (_id, _v, trim(_body), coalesce(_sport, 'both'), trim(_area), _situation, _applies_when,
    _not_when, _connected_work, _evidence_kind, _evidence_note, auth.uid());
  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.owner_save_principle(uuid, text, text, text, text, text, text, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.owner_save_principle(uuid, text, text, text, text, text, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.owner_principle_stats()
RETURNS TABLE(principle_id uuid, advice integer, followed integer, players_followed integer,
  worked integer, no_change integer, got_worse integer, players_worked integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT v.principle_id,
    count(r.id)::int,
    count(r.id) FILTER (WHERE r.followed)::int,
    count(DISTINCT r.user_id) FILTER (WHERE r.followed)::int,
    count(r.id) FILTER (WHERE r.outcome = 'worked')::int,
    count(r.id) FILTER (WHERE r.outcome = 'no_change')::int,
    count(r.id) FILTER (WHERE r.outcome = 'got_worse')::int,
    count(DISTINCT r.user_id) FILTER (WHERE r.outcome = 'worked')::int
  FROM public.intelligence_recommendations r
  JOIN public.coaching_principle_versions v ON v.id = r.principle_version_id
  GROUP BY v.principle_id;
END $$;
REVOKE ALL ON FUNCTION public.owner_principle_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.owner_principle_stats() TO authenticated;