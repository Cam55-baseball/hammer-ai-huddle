ALTER TABLE public.owner_drills ADD COLUMN IF NOT EXISTS care_measure text;
COMMENT ON COLUMN public.owner_drills.care_measure IS 'Owner Nov 1: measure for tissue-care / focus-routine activities: time | rounds | check_off';

CREATE TABLE public.pitching_tracked_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL DEFAULT 'bullpen_before_start' CHECK (event_type IN ('bullpen_before_start')),
  bullpen_outing_id uuid,
  start_outing_id uuid,
  bullpen_date date NOT NULL,
  start_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_type, bullpen_date)
);
GRANT SELECT ON public.pitching_tracked_events TO authenticated;
GRANT ALL ON public.pitching_tracked_events TO service_role;
ALTER TABLE public.pitching_tracked_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players read own tracked pitching events" ON public.pitching_tracked_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Owner Nov 1 (Option C): a bullpen the day before a start is just logged; it is also recorded
-- as a tracked event. Tracking never blocks or changes the outing write.
CREATE OR REPLACE FUNCTION public.track_bullpen_before_start()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d date;
BEGIN
  IF NEW.status = 'thrown' AND NEW.outing_type = 'bullpen' AND NEW.actual_date IS NOT NULL THEN
    INSERT INTO public.pitching_tracked_events (user_id, bullpen_outing_id, start_outing_id, bullpen_date, start_date)
    SELECT NEW.user_id, NEW.id, s.id, NEW.actual_date, NEW.actual_date + 1
    FROM public.pitcher_outings s
    WHERE s.user_id = NEW.user_id AND s.outing_type = 'start' AND s.status <> 'skipped'
      AND coalesce(s.actual_date, s.planned_date) = NEW.actual_date + 1
    LIMIT 1
    ON CONFLICT DO NOTHING;
  ELSIF NEW.outing_type = 'start' AND NEW.status <> 'skipped' THEN
    d := coalesce(NEW.actual_date, NEW.planned_date);
    IF d IS NOT NULL THEN
      INSERT INTO public.pitching_tracked_events (user_id, bullpen_outing_id, start_outing_id, bullpen_date, start_date)
      SELECT NEW.user_id, b.id, NEW.id, b.actual_date, d
      FROM public.pitcher_outings b
      WHERE b.user_id = NEW.user_id AND b.outing_type = 'bullpen' AND b.status = 'thrown' AND b.actual_date = d - 1
      LIMIT 1
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN others THEN
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.track_bullpen_before_start() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER pitcher_outings_track_bullpen_before_start
AFTER INSERT OR UPDATE OF status, outing_type, actual_date, planned_date ON public.pitcher_outings
FOR EACH ROW EXECUTE FUNCTION public.track_bullpen_before_start();

-- What happened next, per start: observation only. Health contents need health sharing.
CREATE OR REPLACE FUNCTION public._start_followup(_athlete uuid, _start date, _health boolean)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'start_date', _start,
    'start_thrown', EXISTS (SELECT 1 FROM public.pitcher_outings o WHERE o.user_id=_athlete AND o.outing_type='start' AND o.status='thrown' AND o.actual_date=_start),
    'start_pitch_count', (SELECT max(o.pitch_count) FROM public.pitcher_outings o WHERE o.user_id=_athlete AND o.outing_type='start' AND o.status='thrown' AND o.actual_date=_start),
    'start_innings', (SELECT max(o.innings) FROM public.pitcher_outings o WHERE o.user_id=_athlete AND o.outing_type='start' AND o.status='thrown' AND o.actual_date=_start),
    'ledger_pitches', (SELECT sum(a.count) FROM public.arm_ledger_entries a WHERE a.user_id=_athlete AND a.entry_date=_start AND a.source='pitching' AND coalesce(a.status,'') !~* 'skip|miss|cancel'),
    'days_completed_next3', (SELECT count(DISTINCT c.plan_date) FROM public.hammer_daily_task_completions c WHERE c.user_id=_athlete AND c.completed AND c.plan_date BETWEEN _start+1 AND _start+3),
    'conditioning_reps_next3', (SELECT count(*) FROM public.conditioning_rep_feedback f WHERE f.user_id=_athlete AND f.plan_date BETWEEN _start+1 AND _start+3),
    'conditioning_avg_effort_next3', (SELECT round(avg(f.effort)::numeric,1) FROM public.conditioning_rep_feedback f WHERE f.user_id=_athlete AND f.plan_date BETWEEN _start+1 AND _start+3),
    'health', CASE WHEN NOT _health THEN NULL ELSE jsonb_build_object(
      'checkins', (SELECT count(*) FROM public.vault_focus_quizzes q WHERE q.user_id=_athlete AND q.entry_date BETWEEN _start AND _start+3),
      'avg_physical_readiness', (SELECT round(avg(q.physical_readiness)::numeric,1) FROM public.vault_focus_quizzes q WHERE q.user_id=_athlete AND q.entry_date BETWEEN _start AND _start+3),
      'avg_perceived_recovery', (SELECT round(avg(q.perceived_recovery)::numeric,1) FROM public.vault_focus_quizzes q WHERE q.user_id=_athlete AND q.entry_date BETWEEN _start AND _start+3),
      'max_pain_scale', (SELECT max(q.pain_scale) FROM public.vault_focus_quizzes q WHERE q.user_id=_athlete AND q.entry_date BETWEEN _start AND _start+3),
      'soreness_reports', (SELECT count(*) FROM public.vault_focus_quizzes q WHERE q.user_id=_athlete AND q.entry_date BETWEEN _start AND _start+3 AND coalesce(array_length(q.soreness_locations,1),0)>0),
      'pain_reps', (SELECT count(*) FROM public.conditioning_rep_feedback f WHERE f.user_id=_athlete AND f.plan_date BETWEEN _start AND _start+3 AND f.pain)
    ) END
  )
$$;
REVOKE ALL ON FUNCTION public._start_followup(uuid, date, boolean) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bullpen_before_start_followups(_athlete uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _health boolean;
BEGIN
  IF NOT public._coach_training_access(_athlete) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  _health := auth.uid() = _athlete OR public.resolve_recruiting_scope(_athlete, 'health');
  RETURN jsonb_build_object(
    'health_shared', _health,
    'tracked', coalesce((SELECT jsonb_agg(public._start_followup(_athlete, e.start_date, _health) || jsonb_build_object('bullpen_date', e.bullpen_date) ORDER BY e.start_date DESC)
      FROM public.pitching_tracked_events e WHERE e.user_id=_athlete AND e.event_type='bullpen_before_start' AND e.start_date >= current_date - 182), '[]'::jsonb),
    'other_starts', coalesce((SELECT jsonb_agg(public._start_followup(_athlete, o.actual_date, _health) ORDER BY o.actual_date DESC)
      FROM (SELECT DISTINCT o.actual_date FROM public.pitcher_outings o WHERE o.user_id=_athlete AND o.outing_type='start' AND o.status='thrown'
              AND o.actual_date >= current_date - 182 AND o.actual_date <= current_date
              AND NOT EXISTS (SELECT 1 FROM public.pitching_tracked_events e WHERE e.user_id=_athlete AND e.start_date=o.actual_date)) o), '[]'::jsonb)
  );
END $$;
REVOKE ALL ON FUNCTION public.bullpen_before_start_followups(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bullpen_before_start_followups(uuid) TO authenticated;