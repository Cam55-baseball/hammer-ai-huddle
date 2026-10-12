-- Plan 4 D: Coach and Organization plan entitlements. Written only by the server (service role) from Stripe.
CREATE TABLE public.staff_plans (
  user_id uuid PRIMARY KEY,
  plan text NOT NULL CHECK (plan IN ('coach','organization')),
  status text NOT NULL,
  extra_seats integer NOT NULL DEFAULT 0 CHECK (extra_seats >= 0),
  included_seats integer NOT NULL DEFAULT 0,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.staff_plans TO authenticated;
GRANT ALL ON public.staff_plans TO service_role;
ALTER TABLE public.staff_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own staff plan readable" ON public.staff_plans FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_staff_plan(_user uuid, _plan text DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM staff_plans s WHERE s.user_id = _user
    AND s.status IN ('active','trialing') AND (s.current_period_end IS NULL OR s.current_period_end > now())
    AND (_plan IS NULL OR s.plan = _plan OR (_plan = 'coach' AND s.plan = 'organization')))
$$;
REVOKE ALL ON FUNCTION public.has_staff_plan(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_staff_plan(uuid, text) TO authenticated, service_role;