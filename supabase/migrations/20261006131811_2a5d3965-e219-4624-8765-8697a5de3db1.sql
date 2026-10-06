ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone text;

CREATE TABLE public.wk_missed_lift_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled_from date,
  last_run_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.wk_missed_lift_settings TO service_role;
ALTER TABLE public.wk_missed_lift_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.wk_missed_lift_settings (id, enabled_from) VALUES (1, NULL);

CREATE OR REPLACE FUNCTION public.wk_mark_missed_lifts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from date;
  v_missed int := 0;
  v_cut int := 0;
  v_done int := 0;
BEGIN
  SELECT enabled_from INTO v_from FROM wk_missed_lift_settings WHERE id = 1 FOR UPDATE;
  IF v_from IS NULL THEN
    v_from := (now() AT TIME ZONE 'UTC')::date;
    UPDATE wk_missed_lift_settings SET enabled_from = v_from, updated_at = now() WHERE id = 1;
  END IF;

  CREATE TEMP TABLE _due ON COMMIT DROP AS
  SELECT rx.id, rx.sets,
         COALESCE((SELECT sum(COALESCE(cardinality(l.reps_completed), l.sets_completed, 0))
                   FROM wk_session_logs l WHERE l.prescription_id = rx.id), 0) AS logged_sets,
         EXISTS (SELECT 1 FROM wk_session_logs l WHERE l.prescription_id = rx.id) AS has_log
  FROM wk_prescriptions rx
  LEFT JOIN profiles p ON p.id = rx.user_id
  WHERE rx.slot = 'lift'
    AND rx.status IN ('planned', 'pending')
    AND rx.plan_date >= v_from
    AND rx.plan_date < (now() AT TIME ZONE
          CASE WHEN p.timezone IS NOT NULL
                AND EXISTS (SELECT 1 FROM pg_timezone_names t WHERE t.name = p.timezone)
               THEN p.timezone ELSE 'Etc/GMT+12' END)::date;

  -- Fully logged: done.
  UPDATE wk_prescriptions rx SET status = 'completed'
  FROM _due d WHERE rx.id = d.id AND d.has_log AND d.logged_sets >= GREATEST(COALESCE(d.sets, 1), 1);
  GET DIAGNOSTICS v_done = ROW_COUNT;

  -- Partly logged: the quick log's "Cut short" (status completed + cut_short outcome on the log).
  UPDATE wk_session_logs l
     SET metrics = COALESCE(l.metrics, '{}'::jsonb) || jsonb_build_object('one_tap_outcome', 'cut_short')
  FROM _due d
  WHERE l.prescription_id = d.id AND d.has_log AND d.logged_sets < GREATEST(COALESCE(d.sets, 1), 1)
    AND COALESCE(l.metrics->>'one_tap_outcome', '') = '';
  UPDATE wk_prescriptions rx SET status = 'completed'
  FROM _due d WHERE rx.id = d.id AND d.has_log AND d.logged_sets < GREATEST(COALESCE(d.sets, 1), 1);
  GET DIAGNOSTICS v_cut = ROW_COUNT;

  -- Nothing logged: missed.
  UPDATE wk_prescriptions rx SET status = 'missed'
  FROM _due d WHERE rx.id = d.id AND NOT d.has_log;
  GET DIAGNOSTICS v_missed = ROW_COUNT;

  UPDATE wk_missed_lift_settings SET last_run_at = now() WHERE id = 1;
  RETURN jsonb_build_object('enabled_from', v_from, 'missed', v_missed, 'cut_short', v_cut, 'completed', v_done);
END;
$$;
REVOKE ALL ON FUNCTION public.wk_mark_missed_lifts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wk_mark_missed_lifts() TO service_role;

-- A missed lift can be changed by the player for 7 days after its date.
CREATE OR REPLACE FUNCTION public.wk_guard_missed_edit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'missed' AND NEW.status IS DISTINCT FROM OLD.status
     AND auth.uid() IS NOT NULL
     AND OLD.plan_date < (now() AT TIME ZONE 'UTC')::date - 8 THEN
    RAISE EXCEPTION 'This lift was more than 7 days ago and can no longer be changed';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER wk_rx_guard_missed BEFORE UPDATE OF status ON public.wk_prescriptions
FOR EACH ROW EXECUTE FUNCTION public.wk_guard_missed_edit();