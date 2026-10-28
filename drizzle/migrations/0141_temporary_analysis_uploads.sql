-- Owner P0 (Oct 28): an analysis upload is a temporary processing record
-- until the athlete taps Save to Players Club. Existing rows stay permanent.
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS temporary_until timestamptz;
COMMENT ON COLUMN public.videos.temporary_until IS 'Set on analysis uploads; cleared when saved to Players Club. Unsaved rows past this time are cleaned up.';
CREATE INDEX IF NOT EXISTS videos_temporary_until_idx ON public.videos (temporary_until) WHERE temporary_until IS NOT NULL;

-- Ownership check that sees temporary rows (used by enrichment policies).
CREATE OR REPLACE FUNCTION public.video_owned_by_me(_video_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.videos v WHERE v.id = _video_id AND v.user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.video_owned_by_me(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.video_owned_by_me(uuid) TO authenticated, service_role;

-- Temporary rows appear nowhere in the app until saved.
DROP POLICY IF EXISTS "Temporary uploads stay hidden until saved" ON public.videos;
CREATE POLICY "Temporary uploads stay hidden until saved" ON public.videos
  AS RESTRICTIVE FOR SELECT TO authenticated, anon USING (temporary_until IS NULL);

-- Enrichment tables keep working for the clip's owner while it is temporary.
DROP POLICY IF EXISTS "owner reads landmark runs" ON public.video_landmark_runs;
CREATE POLICY "owner reads landmark runs" ON public.video_landmark_runs FOR SELECT USING (public.video_owned_by_me(video_id));
DROP POLICY IF EXISTS "owner inserts landmark runs" ON public.video_landmark_runs;
CREATE POLICY "owner inserts landmark runs" ON public.video_landmark_runs FOR INSERT WITH CHECK (public.video_owned_by_me(video_id));
DROP POLICY IF EXISTS "owner reads event runs" ON public.video_event_runs;
CREATE POLICY "owner reads event runs" ON public.video_event_runs FOR SELECT USING (public.video_owned_by_me(video_id));
DROP POLICY IF EXISTS "owner inserts event runs" ON public.video_event_runs;
CREATE POLICY "owner inserts event runs" ON public.video_event_runs FOR INSERT WITH CHECK (public.video_owned_by_me(video_id));
DROP POLICY IF EXISTS "owner reads metric runs" ON public.video_metric_runs;
CREATE POLICY "owner reads metric runs" ON public.video_metric_runs FOR SELECT USING (public.video_owned_by_me(video_id));
DROP POLICY IF EXISTS "owner inserts metric runs" ON public.video_metric_runs;
CREATE POLICY "owner inserts metric runs" ON public.video_metric_runs FOR INSERT WITH CHECK (public.video_owned_by_me(video_id));
DROP POLICY IF EXISTS "owner updates own metric runs" ON public.video_metric_runs;
CREATE POLICY "owner updates own metric runs" ON public.video_metric_runs FOR UPDATE USING (public.video_owned_by_me(video_id)) WITH CHECK (public.video_owned_by_me(video_id));
DROP POLICY IF EXISTS "owner reads analysis runs" ON public.video_analysis_runs;
CREATE POLICY "owner reads analysis runs" ON public.video_analysis_runs FOR SELECT USING (public.video_owned_by_me(video_id));
DROP POLICY IF EXISTS "owner inserts analysis runs" ON public.video_analysis_runs;
CREATE POLICY "owner inserts analysis runs" ON public.video_analysis_runs FOR INSERT WITH CHECK (public.video_owned_by_me(video_id));
DROP POLICY IF EXISTS "owner reads frame extractions" ON public.video_frame_extractions;
CREATE POLICY "owner reads frame extractions" ON public.video_frame_extractions FOR SELECT USING (public.video_owned_by_me(video_id));
DROP POLICY IF EXISTS "Users can create calibration sessions for their own videos" ON public.cv_calibration_sessions;
CREATE POLICY "Users can create calibration sessions for their own videos" ON public.cv_calibration_sessions FOR INSERT WITH CHECK (auth.uid() = user_id AND public.video_owned_by_me(video_id));
DROP POLICY IF EXISTS "Users can update their own calibration sessions" ON public.cv_calibration_sessions;
CREATE POLICY "Users can update their own calibration sessions" ON public.cv_calibration_sessions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND public.video_owned_by_me(video_id));

-- Measurements from a temporary clip enter the ledger only when it is saved.
CREATE OR REPLACE FUNCTION public.ledger_from_videos()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE f record; just_saved boolean;
BEGIN
  IF NEW.ai_analysis IS NULL OR NEW.temporary_until IS NOT NULL THEN RETURN NEW; END IF;
  just_saved := TG_OP = 'UPDATE' AND OLD.temporary_until IS NOT NULL;
  BEGIN
    FOR f IN SELECT key, value FROM jsonb_each(NEW.ai_analysis) WHERE key LIKE '%\_tiles\_deterministic' LOOP
      IF TG_OP = 'INSERT' OR just_saved OR OLD.ai_analysis IS NULL OR (OLD.ai_analysis->f.key) IS DISTINCT FROM f.value THEN
        PERFORM public.ledger_record_tiles(NEW.id, f.key, f.value);
      END IF;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[ledger] video % not recorded: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END; $function$;
DROP TRIGGER IF EXISTS ledger_videos ON public.videos;
CREATE TRIGGER ledger_videos AFTER INSERT OR UPDATE OF ai_analysis, temporary_until ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.ledger_from_videos();

-- Record of every temporary upload the 24-hour cleanup removed (snapshot first).
CREATE TABLE IF NOT EXISTS public.temporary_upload_cleanup_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL,
  user_id uuid NOT NULL,
  video_url text,
  thumbnail_url text,
  created_at_original timestamptz,
  temporary_until timestamptz,
  removed_files text[] NOT NULL DEFAULT '{}',
  outcome text NOT NULL,
  cleaned_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.temporary_upload_cleanup_log TO service_role;
ALTER TABLE public.temporary_upload_cleanup_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads temporary cleanup log" ON public.temporary_upload_cleanup_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'::app_role));
GRANT SELECT ON public.temporary_upload_cleanup_log TO authenticated;