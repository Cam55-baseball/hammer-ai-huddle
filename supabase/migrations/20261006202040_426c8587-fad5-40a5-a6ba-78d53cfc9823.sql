CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'anon_training_hmac_key') THEN
    PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'anon_training_hmac_key', 'HMAC key for anonymous training IDs');
  END IF;
END $$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS anon_training_opt_out boolean NOT NULL DEFAULT false;
ALTER TABLE public.parent_consents ADD COLUMN IF NOT EXISTS training_opt_in boolean NOT NULL DEFAULT false;
ALTER TABLE public.parent_consents ADD COLUMN IF NOT EXISTS training_opt_in_at timestamptz;

CREATE TABLE public.anon_training_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pid text NOT NULL,
  week_start date NOT NULL,
  age_band text,
  sport text,
  role text,
  season_phase text,
  training_age_band text,
  growth_mode boolean,
  readiness_band text,
  card_type text,
  movement_slug text,
  dose jsonb NOT NULL DEFAULT '{}'::jsonb,
  rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  outcome text,
  logged jsonb NOT NULL DEFAULT '{}'::jsonb,
  measures jsonb NOT NULL DEFAULT '{}'::jsonb,
  delta_2w jsonb NOT NULL DEFAULT '{}'::jsonb,
  delta_4w jsonb NOT NULL DEFAULT '{}'::jsonb,
  delta_8w jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX anon_training_pid_idx ON public.anon_training_records(pid, week_start);
GRANT SELECT ON public.anon_training_records TO authenticated;
GRANT ALL ON public.anon_training_records TO service_role;
ALTER TABLE public.anon_training_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and admins read anonymous training records" ON public.anon_training_records FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.anon_training_refresh_state (
  user_id uuid PRIMARY KEY,
  refreshed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.anon_training_refresh_state TO service_role;
ALTER TABLE public.anon_training_refresh_state ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.anon_pid(_user uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT encode(extensions.hmac(_user::text, (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_training_hmac_key' LIMIT 1), 'sha256'), 'hex')
$$;

CREATE OR REPLACE FUNCTION public.anon_training_eligible(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT p.account_paused_at IS NULL AND p.date_of_birth IS NOT NULL AND
      CASE WHEN date_part('year', age(current_date, p.date_of_birth))::int >= 13 THEN NOT p.anon_training_opt_out
           ELSE EXISTS (SELECT 1 FROM parent_consents c WHERE c.child_user_id = p.id AND c.withdrawn_at IS NULL
                          AND c.payment_confirmed_at IS NOT NULL AND c.training_opt_in) END
    FROM profiles p WHERE p.id = _user), false)
$$;

CREATE OR REPLACE FUNCTION public.anon_training_remove(_user uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  DELETE FROM anon_training_records WHERE pid = anon_pid(_user);
  GET DIAGNOSTICS n = ROW_COUNT;
  DELETE FROM anon_training_refresh_state WHERE user_id = _user;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.anon_age_band(_age int) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN _age IS NULL THEN NULL WHEN _age <= 8 THEN '7-8' WHEN _age <= 10 THEN '9-10' WHEN _age <= 12 THEN '11-12'
    WHEN _age <= 14 THEN '13-14' WHEN _age <= 16 THEN '15-16' WHEN _age <= 18 THEN '17-18' WHEN _age <= 22 THEN '19-22' ELSE '23+' END
$$;

-- Rebuilds one player's anonymous records (all history). Not eligible → removes them.
CREATE OR REPLACE FUNCTION public.anon_training_refresh(_user uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pid text; n int := 0;
BEGIN
  IF NOT anon_training_eligible(_user) THEN
    PERFORM anon_training_remove(_user);
    RETURN 0;
  END IF;
  v_pid := anon_pid(_user);
  DELETE FROM anon_training_records WHERE pid = v_pid;

  WITH prof AS (
    SELECT p.id, p.date_of_birth, ac.sport_primary, ac.lifting_age_years, ac.position_primary,
      CASE WHEN EXISTS (SELECT 1 FROM unnest(COALESCE(p.positions, ARRAY[]::text[])) x WHERE x ~* '^(p|rhp|lhp|sp|rp)$|pitch')
                AND EXISTS (SELECT 1 FROM unnest(COALESCE(p.positions, ARRAY[]::text[])) x WHERE x !~* '^(p|rhp|lhp|sp|rp)$|pitch') THEN 'two_way'
           WHEN EXISTS (SELECT 1 FROM unnest(COALESCE(p.positions, ARRAY[]::text[])) x WHERE x ~* '^(p|rhp|lhp|sp|rp)$|pitch') THEN 'pitcher'
           ELSE 'position' END AS role
    FROM profiles p LEFT JOIN athlete_context ac ON ac.user_id = p.id WHERE p.id = _user
  ),
  meas AS (
    SELECT date_trunc('week', recorded_at)::date AS wk, metric_key, avg(value) AS v
    FROM athlete_metric_observations
    WHERE user_id = _user AND source NOT IN ('workload','readiness','lifting') AND value IS NOT NULL
    GROUP BY 1, 2
  ),
  meas_wk AS (SELECT wk, jsonb_object_agg(metric_key, round(v::numeric, 3)) AS m FROM meas GROUP BY wk),
  ready AS (
    SELECT date_trunc('week', recorded_at)::date AS wk, avg(value) AS v FROM athlete_metric_observations
    WHERE user_id = _user AND metric_key = 'readiness.readiness_score' GROUP BY 1
  ),
  rx AS (
    SELECT r.*, date_trunc('week', r.plan_date)::date AS wk,
      COALESCE((SELECT sum(COALESCE(cardinality(l.reps_completed), l.sets_completed, 0)) FROM wk_session_logs l WHERE l.prescription_id = r.id), 0) AS logged_sets,
      (SELECT jsonb_build_object('sets', sum(l.sets_completed), 'reps', sum(COALESCE(l.total_reps_completed, 0)), 'load', max(l.load_used),
              'seconds', sum(l.duration_seconds_completed), 'feet', sum(l.distance_feet_completed))
         FROM wk_session_logs l WHERE l.prescription_id = r.id) AS logged,
      EXISTS (SELECT 1 FROM wk_session_logs l WHERE l.prescription_id = r.id) AS has_log,
      EXISTS (SELECT 1 FROM hammer_daily_task_completions c WHERE c.user_id = r.user_id AND c.plan_date = r.plan_date AND c.task_id = r.id::text AND c.completed IS TRUE) AS checked,
      (SELECT COALESCE(jsonb_agg(DISTINCT s.rule), '[]'::jsonb) FROM wk_final_check_swaps s WHERE s.user_id = r.user_id AND s.plan_date = r.plan_date) AS day_rules
    FROM wk_prescriptions r WHERE r.user_id = _user
  )
  INSERT INTO anon_training_records (pid, week_start, age_band, sport, role, season_phase, training_age_band, growth_mode, readiness_band,
    card_type, movement_slug, dose, rules, outcome, logged, measures, delta_2w, delta_4w, delta_8w)
  SELECT v_pid, rx.wk,
    anon_age_band(date_part('year', age(rx.plan_date, prof.date_of_birth))::int),
    prof.sport_primary, prof.role, rx.phase,
    CASE WHEN prof.lifting_age_years IS NULL THEN NULL WHEN prof.lifting_age_years < 1 THEN 'beginner' WHEN prof.lifting_age_years < 4 THEN 'intermediate'
         WHEN prof.lifting_age_years < 6 THEN 'advanced' ELSE 'elite' END,
    COALESCE((SELECT max(h.inches) - min(h.inches) >= 0.75 FROM athlete_height_checks h WHERE h.user_id = _user AND h.measured_on BETWEEN rx.plan_date - 92 AND rx.plan_date), false),
    (SELECT CASE WHEN rd.v < 40 THEN 'low' WHEN rd.v < 70 THEN 'moderate' ELSE 'high' END FROM ready rd WHERE rd.wk = rx.wk),
    rx.slot, rx.movement_slug,
    jsonb_strip_nulls(jsonb_build_object('sets', rx.sets, 'reps', rx.reps, 'total_reps', rx.total_reps, 'load_pct', rx.load_pct, 'distance_feet', rx.distance_feet,
      'duration_seconds', rx.duration_seconds, 'intensity', rx.intensity_mode, 'rir_low', rx.rir_low, 'rir_high', rx.rir_high, 'unit', rx.dosage_unit, 'tempo', rx.tempo)),
    jsonb_strip_nulls(jsonb_build_object('adaptation', rx.adaptation, 'intent', rx.intent_tag, 'cns_clamped', rx.cns_clamped,
      'substituted', rx.substituted_from_slug IS NOT NULL, 'day_rules', rx.day_rules)),
    CASE WHEN rx.checked OR (rx.has_log AND (rx.sets IS NULL OR rx.sets <= 0 OR rx.logged_sets >= rx.sets)) THEN 'done'
         WHEN rx.has_log THEN 'cut_short'
         WHEN rx.status = 'missed' OR rx.plan_date < current_date THEN 'missed'
         ELSE 'pending' END,
    COALESCE(jsonb_strip_nulls(rx.logged), '{}'::jsonb),
    COALESCE((SELECT m FROM meas_wk WHERE meas_wk.wk = rx.wk), '{}'::jsonb),
    '{}'::jsonb, '{}'::jsonb, '{}'::jsonb
  FROM rx CROSS JOIN prof;
  GET DIAGNOSTICS n = ROW_COUNT;

  -- What worked: change in each measure from the prescription week to 2, 4 and 8 weeks later.
  UPDATE anon_training_records a SET
    delta_2w = COALESCE((SELECT jsonb_object_agg(m0.metric_key, round((m1.v - m0.v)::numeric, 3)) FROM (
        SELECT metric_key, avg(value) v FROM athlete_metric_observations WHERE user_id = _user AND source NOT IN ('workload','readiness','lifting')
          AND date_trunc('week', recorded_at)::date = a.week_start GROUP BY 1) m0
      JOIN (SELECT metric_key, avg(value) v FROM athlete_metric_observations WHERE user_id = _user AND source NOT IN ('workload','readiness','lifting')
          AND date_trunc('week', recorded_at)::date = a.week_start + 14 GROUP BY 1) m1 USING (metric_key)), '{}'::jsonb),
    delta_4w = COALESCE((SELECT jsonb_object_agg(m0.metric_key, round((m1.v - m0.v)::numeric, 3)) FROM (
        SELECT metric_key, avg(value) v FROM athlete_metric_observations WHERE user_id = _user AND source NOT IN ('workload','readiness','lifting')
          AND date_trunc('week', recorded_at)::date = a.week_start GROUP BY 1) m0
      JOIN (SELECT metric_key, avg(value) v FROM athlete_metric_observations WHERE user_id = _user AND source NOT IN ('workload','readiness','lifting')
          AND date_trunc('week', recorded_at)::date = a.week_start + 28 GROUP BY 1) m1 USING (metric_key)), '{}'::jsonb),
    delta_8w = COALESCE((SELECT jsonb_object_agg(m0.metric_key, round((m1.v - m0.v)::numeric, 3)) FROM (
        SELECT metric_key, avg(value) v FROM athlete_metric_observations WHERE user_id = _user AND source NOT IN ('workload','readiness','lifting')
          AND date_trunc('week', recorded_at)::date = a.week_start GROUP BY 1) m0
      JOIN (SELECT metric_key, avg(value) v FROM athlete_metric_observations WHERE user_id = _user AND source NOT IN ('workload','readiness','lifting')
          AND date_trunc('week', recorded_at)::date = a.week_start + 56 GROUP BY 1) m1 USING (metric_key)), '{}'::jsonb)
  WHERE a.pid = v_pid;

  INSERT INTO anon_training_refresh_state (user_id, refreshed_at) VALUES (_user, now())
  ON CONFLICT (user_id) DO UPDATE SET refreshed_at = now();
  RETURN n;
END $$;

-- Refresh the stalest eligible players (called by the existing hourly plan job).
CREATE OR REPLACE FUNCTION public.anon_training_refresh_batch(_limit int DEFAULT 200)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid; n int := 0;
BEGIN
  FOR u IN
    SELECT p.id FROM profiles p LEFT JOIN anon_training_refresh_state s ON s.user_id = p.id
    WHERE anon_training_eligible(p.id) AND EXISTS (SELECT 1 FROM wk_prescriptions r WHERE r.user_id = p.id)
    ORDER BY s.refreshed_at NULLS FIRST LIMIT _limit
  LOOP
    PERFORM anon_training_refresh(u); n := n + 1;
  END LOOP;
  RETURN n;
END $$;

-- Turning off (13+), pausing, withdrawing, or a parent saying no removes records at once.
CREATE OR REPLACE FUNCTION public.anon_training_on_profile_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.anon_training_opt_out AND NOT OLD.anon_training_opt_out) OR (NEW.account_paused_at IS NOT NULL AND OLD.account_paused_at IS NULL) THEN
    PERFORM anon_training_remove(NEW.id);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_anon_training_profile ON public.profiles;
CREATE TRIGGER trg_anon_training_profile AFTER UPDATE OF anon_training_opt_out, account_paused_at ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.anon_training_on_profile_change();

CREATE OR REPLACE FUNCTION public.anon_training_on_consent_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (OLD.training_opt_in AND NOT NEW.training_opt_in) OR (NEW.withdrawn_at IS NOT NULL AND OLD.withdrawn_at IS NULL) THEN
    PERFORM anon_training_remove(NEW.child_user_id);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_anon_training_consent ON public.parent_consents;
CREATE TRIGGER trg_anon_training_consent AFTER UPDATE OF training_opt_in, withdrawn_at ON public.parent_consents
  FOR EACH ROW EXECUTE FUNCTION public.anon_training_on_consent_change();

REVOKE EXECUTE ON FUNCTION public.anon_pid(uuid), public.anon_training_eligible(uuid), public.anon_training_remove(uuid),
  public.anon_training_refresh(uuid), public.anon_training_refresh_batch(int),
  public.anon_training_on_profile_change(), public.anon_training_on_consent_change() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anon_training_refresh_batch(int), public.anon_training_refresh(uuid), public.anon_training_remove(uuid) TO service_role;

INSERT INTO public.consent_texts (kind, version, body)
SELECT 'parent_promise', 2, body FROM public.consent_texts WHERE kind = 'parent_promise' AND version = 1
ON CONFLICT DO NOTHING;
INSERT INTO public.consent_texts (kind, version, body)
SELECT 'parent_notice', 2, body || E'\n\nOptional: Help improve Hammers Modality. If you say yes, we use your child''s training information — what was prescribed, what was completed, what worked, and numbers like angles, timing and speeds — with name, email, birthdate, photos and videos removed, to improve our training programs. It stays inside Hammers Modality and is never sold or given to other companies to train their AI. You can turn this off anytime, and we''ll remove your child''s information from future training. This is off unless you check the box.'
FROM public.consent_texts WHERE kind = 'parent_notice' AND version = 1
ON CONFLICT DO NOTHING;