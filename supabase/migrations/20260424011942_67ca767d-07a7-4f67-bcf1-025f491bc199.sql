
-- HIE Dirty Users Queue
CREATE TABLE IF NOT EXISTS public.hie_dirty_users (
  user_id uuid PRIMARY KEY,
  dirtied_at timestamptz NOT NULL DEFAULT now(),
  processing_started_at timestamptz,
  attempt_count int NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_hie_dirty_oldest ON public.hie_dirty_users(dirtied_at ASC);
ALTER TABLE public.hie_dirty_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages dirty queue" ON public.hie_dirty_users FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role') WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Users see own dirty marker" ON public.hie_dirty_users FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.mark_hie_dirty()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.hie_dirty_users (user_id, dirtied_at)
  VALUES (NEW.user_id, now())
  ON CONFLICT (user_id) DO UPDATE SET dirtied_at = now(), processing_started_at = NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_hie_dirty_perf ON public.performance_sessions;
CREATE TRIGGER trg_mark_hie_dirty_perf AFTER INSERT ON public.performance_sessions
  FOR EACH ROW EXECUTE FUNCTION public.mark_hie_dirty();
DROP TRIGGER IF EXISTS trg_mark_hie_dirty_custom ON public.custom_activity_logs;
CREATE TRIGGER trg_mark_hie_dirty_custom AFTER INSERT ON public.custom_activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.mark_hie_dirty();
DROP TRIGGER IF EXISTS trg_mark_hie_dirty_tex ON public.tex_vision_sessions;
CREATE TRIGGER trg_mark_hie_dirty_tex AFTER INSERT ON public.tex_vision_sessions
  FOR EACH ROW EXECUTE FUNCTION public.mark_hie_dirty();
DROP TRIGGER IF EXISTS trg_mark_hie_dirty_focus ON public.vault_focus_quizzes;
CREATE TRIGGER trg_mark_hie_dirty_focus AFTER INSERT ON public.vault_focus_quizzes
  FOR EACH ROW EXECUTE FUNCTION public.mark_hie_dirty();

-- Sleep consistency + mood
ALTER TABLE public.vault_focus_quizzes ADD COLUMN IF NOT EXISTS sleep_consistency_score numeric;

CREATE TABLE IF NOT EXISTS public.session_start_moods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid,
  module text,
  mood int CHECK (mood BETWEEN 1 AND 5),
  energy int CHECK (energy BETWEEN 1 AND 5),
  captured_at timestamptz NOT NULL DEFAULT now(),
  schema_version int NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_session_start_moods_user_time ON public.session_start_moods(user_id, captured_at DESC);
ALTER TABLE public.session_start_moods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own mood" ON public.session_start_moods FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Hammer State Snapshots
CREATE TABLE IF NOT EXISTS public.hammer_state_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  arousal_score numeric,
  arousal_inputs jsonb DEFAULT '{}'::jsonb,
  recovery_score numeric,
  recovery_inputs jsonb DEFAULT '{}'::jsonb,
  motor_state text CHECK (motor_state IN ('acquisition','consolidation','retention','idle')),
  motor_inputs jsonb DEFAULT '{}'::jsonb,
  cognitive_load numeric,
  cognitive_inputs jsonb DEFAULT '{}'::jsonb,
  dopamine_load numeric,
  dopamine_inputs jsonb DEFAULT '{}'::jsonb,
  overall_state text CHECK (overall_state IN ('prime','ready','caution','recover')),
  confidence numeric DEFAULT 0,
  schema_version int NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_hammer_state_user_time ON public.hammer_state_snapshots(user_id, computed_at DESC);
ALTER TABLE public.hammer_state_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own hammer state" ON public.hammer_state_snapshots FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Service role writes hammer state" ON public.hammer_state_snapshots FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role') WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Fuel timing + environment + wearables
ALTER TABLE public.vault_nutrition_logs ADD COLUMN IF NOT EXISTS minutes_since_last_meal int;

CREATE TABLE IF NOT EXISTS public.environment_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid,
  captured_at timestamptz NOT NULL DEFAULT now(),
  weather jsonb,
  temp_f numeric,
  humidity numeric,
  conditions text,
  source text DEFAULT 'auto'
);
CREATE INDEX IF NOT EXISTS idx_environment_user_time ON public.environment_snapshots(user_id, captured_at DESC);
ALTER TABLE public.environment_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own environment" ON public.environment_snapshots FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.wearable_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  source text,
  hrv_ms int,
  rhr_bpm int,
  sleep_min int,
  raw jsonb,
  schema_version int NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_wearable_user_time ON public.wearable_metrics(user_id, captured_at DESC);
ALTER TABLE public.wearable_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wearables" ON public.wearable_metrics FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Schema versioning
ALTER TABLE public.performance_sessions ADD COLUMN IF NOT EXISTS schema_version int NOT NULL DEFAULT 1;
ALTER TABLE public.hie_snapshots       ADD COLUMN IF NOT EXISTS schema_version int NOT NULL DEFAULT 1;
ALTER TABLE public.mpi_scores          ADD COLUMN IF NOT EXISTS schema_version int NOT NULL DEFAULT 1;
ALTER TABLE public.vault_focus_quizzes ADD COLUMN IF NOT EXISTS schema_version int NOT NULL DEFAULT 1;

-- Drill versioning
CREATE TABLE IF NOT EXISTS public.drill_definitions_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_id uuid NOT NULL REFERENCES public.drills(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  definition jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (drill_id, version_number)
);
CREATE INDEX IF NOT EXISTS idx_drill_versions_drill ON public.drill_definitions_versions(drill_id, version_number DESC);
ALTER TABLE public.drill_definitions_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads drill versions" ON public.drill_definitions_versions FOR SELECT USING (true);
CREATE POLICY "Owners write drill versions" ON public.drill_definitions_versions FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

ALTER TABLE public.drills ADD COLUMN IF NOT EXISTS current_version_id uuid REFERENCES public.drill_definitions_versions(id);

CREATE OR REPLACE FUNCTION public.capture_drill_version()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_next int;
  v_new_id uuid;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next
  FROM public.drill_definitions_versions WHERE drill_id = OLD.id;
  INSERT INTO public.drill_definitions_versions (drill_id, version_number, definition, created_by)
  VALUES (OLD.id, v_next, to_jsonb(OLD), auth.uid())
  RETURNING id INTO v_new_id;
  NEW.current_version_id := v_new_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_capture_drill_version ON public.drills;
CREATE TRIGGER trg_capture_drill_version BEFORE UPDATE ON public.drills
  FOR EACH ROW
  WHEN (OLD.name IS DISTINCT FROM NEW.name
     OR OLD.description IS DISTINCT FROM NEW.description
     OR OLD.instructions IS DISTINCT FROM NEW.instructions
     OR OLD.default_constraints IS DISTINCT FROM NEW.default_constraints)
  EXECUTE FUNCTION public.capture_drill_version();

-- Session ledger
CREATE TABLE IF NOT EXISTS public.performance_sessions_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid,
  snapshot jsonb NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ledger_session ON public.performance_sessions_ledger(session_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON public.performance_sessions_ledger(user_id, captured_at DESC);
ALTER TABLE public.performance_sessions_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own ledger" ON public.performance_sessions_ledger FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Service role writes ledger" ON public.performance_sessions_ledger FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role' OR auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.capture_session_ledger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_reason text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_reason := 'insert';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      v_reason := 'soft_delete';
    ELSE
      v_reason := 'update';
    END IF;
  ELSE
    RETURN NULL;
  END IF;
  INSERT INTO public.performance_sessions_ledger (session_id, user_id, snapshot, reason)
  VALUES (NEW.id, NEW.user_id, to_jsonb(NEW), v_reason);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_capture_session_ledger ON public.performance_sessions;
CREATE TRIGGER trg_capture_session_ledger AFTER INSERT OR UPDATE ON public.performance_sessions
  FOR EACH ROW EXECUTE FUNCTION public.capture_session_ledger();

-- Engine override transparency
ALTER TABLE public.engine_settings ADD COLUMN IF NOT EXISTS is_override boolean NOT NULL DEFAULT true;
