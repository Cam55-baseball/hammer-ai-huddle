ALTER TABLE public.physio_health_profiles ADD COLUMN IF NOT EXISTS meals_per_day integer;
ALTER TABLE public.physio_health_profiles ADD CONSTRAINT health_meals_positive CHECK (meals_per_day IS NULL OR meals_per_day > 0) NOT VALID;
ALTER TABLE public.athlete_mpi_settings ADD COLUMN IF NOT EXISTS season_history jsonb;
COMMENT ON COLUMN public.athlete_context.season_phase IS 'DEPRECATED: athlete_mpi_settings owns season; context envelope derives it. Historical values retained, not authored.';
COMMENT ON COLUMN public.physio_health_profiles.date_of_birth IS 'DEPRECATED: age reads profiles.date_of_birth; historical values retained.';
CREATE OR REPLACE FUNCTION public.project_season_timeline_record() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE h jsonb; sp text;
BEGIN
 IF NEW.tag <> 'SEASON' THEN RETURN NEW; END IF;
 SELECT sport_primary INTO sp FROM public.athlete_context WHERE user_id=NEW.user_id;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'tag',tag,'start_date',start_date,'end_date',end_date,'dates',dates,'source',source,'payload',payload,'summary',summary,'created_at',created_at,'undone_at',undone_at) ORDER BY created_at DESC),'[]'::jsonb) INTO h FROM public.schedule_timeline_entries WHERE user_id=NEW.user_id AND tag='SEASON';
 INSERT INTO public.athlete_mpi_settings(user_id,sport,season_history) VALUES(NEW.user_id,coalesce(sp,'baseball'),h) ON CONFLICT(user_id) DO UPDATE SET season_history=EXCLUDED.season_history;
 RETURN NEW;
END $$;
CREATE TRIGGER onboarding_season_record AFTER INSERT OR UPDATE ON public.schedule_timeline_entries FOR EACH ROW EXECUTE FUNCTION public.project_season_timeline_record();
DO $ddl$
DECLARE def text;
BEGIN
 def := pg_get_functiondef('public.get_athlete_context_envelope(uuid)'::regprocedure);
 def := replace(def, 'v_ctx public.athlete_context%ROWTYPE;', 'v_ctx public.athlete_context%ROWTYPE; v_season public.athlete_mpi_settings%ROWTYPE;');
 def := replace(def, 'SELECT * INTO v_ctx FROM public.athlete_context WHERE user_id = p_user;', 'SELECT * INTO v_ctx FROM public.athlete_context WHERE user_id = p_user; SELECT * INTO v_season FROM public.athlete_mpi_settings WHERE user_id = p_user;');
 def := replace(def, '''value'', v_ctx.season_phase', '''value'', v_season.season_status');
 def := replace(def, '''source'', ''athlete_context.season_phase''', '''source'', ''athlete_mpi_settings.season_status''');
 def := replace(def, 'CASE WHEN v_ctx.season_phase IS NULL THEN ''missing'' ELSE ''self_report'' END', 'CASE WHEN v_season.season_status IS NULL THEN ''missing'' ELSE ''derived'' END');
 def := replace(def, '''missing'', v_ctx.season_phase IS NULL', '''missing'', v_season.season_status IS NULL');
 EXECUTE def;
END $ddl$;