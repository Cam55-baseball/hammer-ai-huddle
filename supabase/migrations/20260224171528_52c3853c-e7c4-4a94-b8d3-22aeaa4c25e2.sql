
-- =============================================
-- Migration 4: Professional and Verification Tables
-- =============================================

-- verified_stat_profiles: External stat links with admin verification
CREATE TABLE public.verified_stat_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sport text NOT NULL,
  league text NOT NULL,
  team_name text,
  profile_url text NOT NULL,
  screenshot_path text,
  verified boolean DEFAULT false,
  verified_by uuid,
  verified_at timestamptz,
  identity_match boolean DEFAULT false,
  external_metrics jsonb,
  last_synced_at timestamptz,
  sync_frequency text DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.verified_stat_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own verified stats"
  ON public.verified_stat_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.user_has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own verified stats"
  ON public.verified_stat_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all verified stats"
  ON public.verified_stat_profiles FOR UPDATE
  TO authenticated
  USING (public.user_has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_verified_stat_profiles_updated_at
  BEFORE UPDATE ON public.verified_stat_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- athlete_professional_status: Contract status and MLB season tracking
CREATE TABLE public.athlete_professional_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  sport text NOT NULL,
  contract_status text DEFAULT 'none',
  current_league text,
  current_team text,
  mlb_seasons_completed integer DEFAULT 0,
  ausl_seasons_completed integer DEFAULT 0,
  hof_eligible boolean DEFAULT false,
  hof_activated_at timestamptz,
  release_count integer DEFAULT 0,
  last_release_date date,
  last_resign_date date,
  roster_verified boolean DEFAULT false,
  roster_verified_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.athlete_professional_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own pro status"
  ON public.athlete_professional_status FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.user_has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own pro status"
  ON public.athlete_professional_status FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all pro status"
  ON public.athlete_professional_status FOR UPDATE
  TO authenticated
  USING (public.user_has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_athlete_professional_status_updated_at
  BEFORE UPDATE ON public.athlete_professional_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
