
CREATE TABLE public.scheduled_practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_module TEXT NOT NULL,
  session_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  recurring_active BOOLEAN DEFAULT false,
  recurring_days INTEGER[] DEFAULT '{}',
  sport TEXT NOT NULL DEFAULT 'baseball',
  organization_id UUID REFERENCES organizations(id),
  team_id UUID,
  assignment_scope TEXT DEFAULT 'individual',
  coach_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.scheduled_practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scheduled sessions"
  ON public.scheduled_practice_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Users can insert own scheduled sessions"
  ON public.scheduled_practice_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_linked_coach(auth.uid(), user_id));

CREATE POLICY "Users can update own scheduled sessions"
  ON public.scheduled_practice_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Users can delete own scheduled sessions"
  ON public.scheduled_practice_sessions FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR created_by = auth.uid());

CREATE TRIGGER update_scheduled_practice_sessions_updated_at
  BEFORE UPDATE ON public.scheduled_practice_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
