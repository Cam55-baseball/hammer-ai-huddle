
-- Add elite-catalog taxonomy columns
ALTER TABLE public.wk_movement_catalog
  ADD COLUMN IF NOT EXISTS family text,
  ADD COLUMN IF NOT EXISTS intensity_class text,
  ADD COLUMN IF NOT EXISTS phase_allow text[] NOT NULL DEFAULT ARRAY['os_q1','os_q2','os_q3','os_q4','pre_season','in_season','post_season']::text[],
  ADD COLUMN IF NOT EXISTS source_philosophy text,
  ADD COLUMN IF NOT EXISTS evidence_note text,
  ADD COLUMN IF NOT EXISTS is_eccentric_dominant boolean NOT NULL DEFAULT false;

-- Rationale surface on each prescription (explains WHY)
ALTER TABLE public.wk_prescriptions
  ADD COLUMN IF NOT EXISTS rationale text;

CREATE INDEX IF NOT EXISTS wk_rx_user_date_slot_idx
  ON public.wk_prescriptions (user_id, plan_date, slot);
CREATE INDEX IF NOT EXISTS wk_catalog_family_idx
  ON public.wk_movement_catalog (family);

-- Coach / athlete override token — one session unlock, logged
CREATE TABLE IF NOT EXISTS public.wk_movement_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movement_slug text NOT NULL,
  ack_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text NOT NULL,
  actor_role text NOT NULL DEFAULT 'self',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wk_movement_overrides TO authenticated;
GRANT ALL ON public.wk_movement_overrides TO service_role;

ALTER TABLE public.wk_movement_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wk_override_owner_all"
  ON public.wk_movement_overrides FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS wk_override_lookup_idx
  ON public.wk_movement_overrides (user_id, movement_slug, ack_date, expires_at);
