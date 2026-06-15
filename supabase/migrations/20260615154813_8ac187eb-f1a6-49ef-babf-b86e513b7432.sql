
-- Historical Landmark Immutability — Phase 0 closeout rule §0.6
-- Once written, a video_landmark_runs row is append-only. Upgrading the
-- landmark model bumps LANDMARK_MODEL_VERSION and inserts a NEW row under
-- the existing UNIQUE (video_id, landmark_model_version) constraint.

CREATE OR REPLACE FUNCTION public.tg_video_landmark_runs_no_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'historical_landmark_immutable: video_landmark_runs row % is append-only and cannot be updated', OLD.id
    USING ERRCODE = 'check_violation';
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_video_landmark_runs_no_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user <> 'service_role' AND current_user <> 'postgres' AND current_user <> 'supabase_admin' THEN
    RAISE EXCEPTION 'historical_landmark_immutable: video_landmark_runs row % cannot be deleted by role %', OLD.id, current_user
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN OLD;
END;
$$;

-- Drop the legacy updated_at trigger; the table is now strictly append-only.
DROP TRIGGER IF EXISTS trg_video_landmark_runs_updated_at ON public.video_landmark_runs;

DROP TRIGGER IF EXISTS trg_video_landmark_runs_immutable_update ON public.video_landmark_runs;
CREATE TRIGGER trg_video_landmark_runs_immutable_update
  BEFORE UPDATE ON public.video_landmark_runs
  FOR EACH ROW EXECUTE FUNCTION public.tg_video_landmark_runs_no_update();

DROP TRIGGER IF EXISTS trg_video_landmark_runs_immutable_delete ON public.video_landmark_runs;
CREATE TRIGGER trg_video_landmark_runs_immutable_delete
  BEFORE DELETE ON public.video_landmark_runs
  FOR EACH ROW EXECUTE FUNCTION public.tg_video_landmark_runs_no_delete();
