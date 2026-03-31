
-- UDL Phase 3+4: Alerts, Audit Log, and schema extensions

-- 1. UDL Alerts table
CREATE TABLE public.udl_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  dismissed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.udl_alerts ENABLE ROW LEVEL SECURITY;

-- Players see their own alerts
CREATE POLICY "Users can read own alerts"
  ON public.udl_alerts FOR SELECT TO authenticated
  USING (target_user_id = auth.uid());

-- Coaches can read alerts for linked players
CREATE POLICY "Coaches can read linked player alerts"
  ON public.udl_alerts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.scout_follows
      WHERE scout_id = auth.uid()
        AND player_id = udl_alerts.target_user_id
        AND status = 'accepted'
    )
  );

-- Owner can read all alerts
CREATE POLICY "Owner can read all alerts"
  ON public.udl_alerts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

-- Coaches/owner can dismiss alerts
CREATE POLICY "Coaches and owner can dismiss alerts"
  ON public.udl_alerts FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner')
    OR EXISTS (
      SELECT 1 FROM public.scout_follows
      WHERE scout_id = auth.uid()
        AND player_id = udl_alerts.target_user_id
        AND status = 'accepted'
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'owner')
    OR EXISTS (
      SELECT 1 FROM public.scout_follows
      WHERE scout_id = auth.uid()
        AND player_id = udl_alerts.target_user_id
        AND status = 'accepted'
    )
  );

-- 2. UDL Audit Log table
CREATE TABLE public.udl_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  user_id uuid NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.udl_audit_log ENABLE ROW LEVEL SECURITY;

-- Owner can read all audit logs
CREATE POLICY "Owner can read audit logs"
  ON public.udl_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

-- 3. Add feedback_applied and linked_sessions to udl_daily_plans
ALTER TABLE public.udl_daily_plans
  ADD COLUMN IF NOT EXISTS feedback_applied jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS linked_sessions jsonb DEFAULT '[]'::jsonb;

-- 4. Add difficulty_level to udl_drill_completions
ALTER TABLE public.udl_drill_completions
  ADD COLUMN IF NOT EXISTS difficulty_level integer DEFAULT 3;
