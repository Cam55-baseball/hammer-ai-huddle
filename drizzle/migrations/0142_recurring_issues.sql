CREATE TABLE public.athlete_recurring_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sport text NOT NULL,
  skill_domain text NOT NULL,
  fault_key text NOT NULL,
  analysis_count integer NOT NULL DEFAULT 0,
  video_ids uuid[] NOT NULL DEFAULT '{}',
  corroborating_signal_ids uuid[] NOT NULL DEFAULT '{}',
  first_seen timestamptz NOT NULL,
  last_seen timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, sport, skill_domain, fault_key)
);
GRANT SELECT ON public.athlete_recurring_issues TO authenticated;
GRANT ALL ON public.athlete_recurring_issues TO service_role;
ALTER TABLE public.athlete_recurring_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players read own recurring issues" ON public.athlete_recurring_issues
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Connected coaches read recurring issues" ON public.athlete_recurring_issues
  FOR SELECT TO authenticated USING (public.coach_connected_to(auth.uid(), user_id));

-- One rule: same finding tag in 2+ SAVED analyses within 28 days,
-- or 1 saved analysis plus a practice/game/coach indication of the same tag within 28 days.
CREATE OR REPLACE FUNCTION public.recompute_recurring_issues(_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.athlete_recurring_issues WHERE user_id = _user;
  INSERT INTO public.athlete_recurring_issues (user_id, sport, skill_domain, fault_key, analysis_count, video_ids, corroborating_signal_ids, first_seen, last_seen)
  SELECT f.user_id, f.sport, f.skill_domain, f.fault_key,
         count(DISTINCT f.video_id), array_agg(DISTINCT f.video_id),
         coalesce((SELECT array_agg(s.id) FROM public.wk_fault_signals s
                   WHERE s.user_id = _user AND s.fault_key = f.fault_key
                     AND s.source IN ('game_hub','log_trend','coach_note')
                     AND s.observed_at >= now() - interval '28 days'), '{}'),
         min(f.created_at), max(f.created_at)
  FROM public.analysis_fault_findings f
  JOIN public.videos v ON v.id = f.video_id AND v.user_id = f.user_id AND v.temporary_until IS NULL
  WHERE f.user_id = _user AND f.created_at >= now() - interval '28 days'
    AND f.sport IS NOT NULL AND f.fault_key IS NOT NULL AND f.fault_key <> 'other'
  GROUP BY f.user_id, f.sport, f.skill_domain, f.fault_key
  HAVING count(DISTINCT f.video_id) >= 2
      OR EXISTS (SELECT 1 FROM public.wk_fault_signals s
                 WHERE s.user_id = _user AND s.fault_key = f.fault_key
                   AND s.source IN ('game_hub','log_trend','coach_note')
                   AND s.observed_at >= now() - interval '28 days');
END $$;
REVOKE EXECUTE ON FUNCTION public.recompute_recurring_issues(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_recurring_from_finding()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN PERFORM public.recompute_recurring_issues(NEW.user_id);
  EXCEPTION WHEN others THEN RAISE WARNING 'recurring issues: %', SQLERRM; END;
  RETURN NEW;
END $$;
CREATE TRIGGER recurring_from_finding AFTER INSERT ON public.analysis_fault_findings
  FOR EACH ROW EXECUTE FUNCTION public.trg_recurring_from_finding();
CREATE TRIGGER recurring_from_video_save AFTER UPDATE OF temporary_until ON public.videos
  FOR EACH ROW WHEN (OLD.temporary_until IS DISTINCT FROM NEW.temporary_until)
  EXECUTE FUNCTION public.trg_recurring_from_finding();