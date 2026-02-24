
-- =============================================
-- Migration 5: Heat Maps, Organizations
-- =============================================

-- heat_map_snapshots: Pre-computed nightly heat map data
CREATE TABLE public.heat_map_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sport text NOT NULL,
  map_type text NOT NULL,
  time_window text NOT NULL,
  context_filter text NOT NULL DEFAULT 'all',
  split_key text NOT NULL DEFAULT 'all',
  grid_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  blind_zones jsonb DEFAULT '[]'::jsonb,
  total_data_points integer DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.heat_map_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own heat maps"
  ON public.heat_map_snapshots FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.user_has_role(auth.uid(), 'admin'));

CREATE INDEX idx_heat_maps_user ON public.heat_map_snapshots(user_id, map_type, time_window);

-- organizations: Team/org registration
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sport text NOT NULL,
  org_type text NOT NULL,
  verified boolean DEFAULT false,
  verified_by uuid,
  owner_user_id uuid NOT NULL,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can select orgs"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owners can insert orgs"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Owners can update own orgs"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_user_id OR public.user_has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- organization_members: Org-player/coach linkage
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role_in_org text NOT NULL DEFAULT 'player',
  status text DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can select own org members"
  ON public.organization_members FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR public.user_has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.organizations o 
      WHERE o.id = organization_id AND o.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Org owners can manage members"
  ON public.organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations o 
      WHERE o.id = organization_id AND o.owner_user_id = auth.uid()
    )
    OR public.user_has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Org owners can update members"
  ON public.organization_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o 
      WHERE o.id = organization_id AND o.owner_user_id = auth.uid()
    )
    OR public.user_has_role(auth.uid(), 'admin')
  );

CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
