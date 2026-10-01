CREATE TABLE public.owner_drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  overrides_drill_id text,
  placements text[] NOT NULL DEFAULT '{}',
  sports text[] NOT NULL DEFAULT '{}',
  name text NOT NULL,
  fault_keys text[] NOT NULL DEFAULT '{}',
  phase text,
  level text,
  dosage text,
  setup text,
  steps text[] NOT NULL DEFAULT '{}',
  cue text,
  feel text,
  feel_wrong text,
  common_mistake text,
  equipment text[] NOT NULL DEFAULT '{}',
  video_url text,
  active boolean NOT NULL DEFAULT true,
  pinned boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.owner_drills TO authenticated;
GRANT ALL ON public.owner_drills TO service_role;
ALTER TABLE public.owner_drills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read active owner drills" ON public.owner_drills FOR SELECT TO authenticated
  USING (active OR public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Staff insert owner drills" ON public.owner_drills FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Staff update owner drills" ON public.owner_drills FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'));
CREATE UNIQUE INDEX owner_drills_override_uniq ON public.owner_drills(overrides_drill_id) WHERE overrides_drill_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.owner_drills_touch() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER owner_drills_touch BEFORE UPDATE ON public.owner_drills FOR EACH ROW EXECUTE FUNCTION public.owner_drills_touch();

CREATE TABLE public.fault_key_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis text NOT NULL,
  description text NOT NULL,
  requested_by uuid,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.fault_key_requests TO authenticated;
GRANT ALL ON public.fault_key_requests TO service_role;
ALTER TABLE public.fault_key_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage fault requests" ON public.fault_key_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.drill_engagement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  drill_id text NOT NULL,
  event text NOT NULL CHECK (event IN ('served','opened','completed','returned')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.drill_engagement TO authenticated;
GRANT ALL ON public.drill_engagement TO service_role;
ALTER TABLE public.drill_engagement ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users log own drill engagement" ON public.drill_engagement FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own engagement, staff read all" ON public.drill_engagement FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'));
CREATE INDEX drill_engagement_user_idx ON public.drill_engagement(user_id, drill_id);
CREATE INDEX drill_engagement_drill_idx ON public.drill_engagement(drill_id, event);

CREATE OR REPLACE FUNCTION public.drill_usage_totals()
RETURNS TABLE(drill_id text, completed bigint, returned bigint, served bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT drill_id,
    count(*) FILTER (WHERE event='completed'),
    count(*) FILTER (WHERE event='returned'),
    count(*) FILTER (WHERE event='served')
  FROM public.drill_engagement GROUP BY drill_id
$$;
GRANT EXECUTE ON FUNCTION public.drill_usage_totals() TO authenticated;