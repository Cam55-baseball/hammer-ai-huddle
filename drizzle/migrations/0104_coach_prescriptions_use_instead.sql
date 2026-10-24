CREATE TABLE public.coach_prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  category text NOT NULL CHECK (category IN ('hitting','pitching','throwing','fielding','baserunning','lift','speed','conditioning','warmup','mobility','recovery','vision')),
  plan_date date NOT NULL,
  title text NOT NULL,
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  gear_labels jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_template_id uuid NULL,
  team_send_id uuid NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','used_instead','added_alongside','saved_for_later','declined')),
  safety_result jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.coach_prescriptions TO authenticated;
GRANT ALL ON public.coach_prescriptions TO service_role;
ALTER TABLE public.coach_prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sender can insert prescriptions" ON public.coach_prescriptions FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Sender can view own sends" ON public.coach_prescriptions FOR SELECT TO authenticated USING (sender_id = auth.uid());
CREATE POLICY "Recipient can view own prescriptions" ON public.coach_prescriptions FOR SELECT TO authenticated USING (recipient_id = auth.uid());
CREATE POLICY "Recipient can update status" ON public.coach_prescriptions FOR UPDATE TO authenticated USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());
ALTER TABLE public.wk_prescriptions ADD COLUMN replaced_by_coach_rx uuid NULL;
COMMENT ON COLUMN public.wk_prescriptions.replaced_by_coach_rx IS 'Set when the player chose a coach prescription with Use instead; the card shows replaced by coach workout and never counts as missed.';