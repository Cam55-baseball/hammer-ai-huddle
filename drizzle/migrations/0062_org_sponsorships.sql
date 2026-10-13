CREATE TABLE public.org_sponsorships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  player_id uuid NOT NULL,
  sponsored_by uuid NOT NULL,
  sport text NOT NULL CHECK (sport IN ('baseball','softball')),
  tier text NOT NULL CHECK (tier IN ('pitcher','5tool','golden2way')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','scheduled','active','paused','canceled','ended')),
  stripe_customer_id text,
  stripe_subscription_id text,
  billing_starts_at timestamptz,
  current_period_end timestamptz,
  paid_through timestamptz,
  grace_until timestamptz,
  player_own_sub_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX org_sponsorships_one_live_per_player ON public.org_sponsorships(player_id) WHERE status IN ('pending','scheduled','active','paused');
CREATE INDEX org_sponsorships_org ON public.org_sponsorships(organization_id);
GRANT SELECT ON public.org_sponsorships TO authenticated;
GRANT ALL ON public.org_sponsorships TO service_role;
ALTER TABLE public.org_sponsorships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "player sees own sponsorship" ON public.org_sponsorships FOR SELECT TO authenticated USING (player_id = auth.uid());
CREATE POLICY "org admins see their sponsorships" ON public.org_sponsorships FOR SELECT TO authenticated USING (public.is_org_admin(organization_id, auth.uid()));