ALTER TABLE public.arm_ledger_entries ADD COLUMN IF NOT EXISTS game_sport text;
ALTER TABLE public.arm_ledger_entries ADD COLUMN IF NOT EXISTS game_sources jsonb;
ALTER TABLE public.arm_ledger_entries DROP CONSTRAINT arm_ledger_entries_throw_type_check;
ALTER TABLE public.arm_ledger_entries ADD CONSTRAINT arm_ledger_entries_throw_type_check CHECK (throw_type IN ('catch_play','position_throws','infield_quick_release','infield_short_hops','outfield_crow_hop','long_toss','catcher_throwdowns','pitcher_warmup','pitcher_catch_play','pap_max_throws','pap_warmup','game_pitches_coach','game_throws_coach','game_pitches_self'));
CREATE OR REPLACE FUNCTION public.sync_game_arm_day(p_user uuid,p_date date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s text; n integer; lineage jsonb;
BEGIN
  SELECT sport_primary INTO s FROM public.athlete_context WHERE user_id=p_user;
  PERFORM pg_advisory_xact_lock(hashtextextended('game-arm:'||p_user::text||':'||p_date::text,0));
  SELECT coalesce(sum(count),0)::integer,coalesce(jsonb_agg(jsonb_build_object('game_id',id,'sport',sport,'date',game_date,'count',count) ORDER BY id),'[]'::jsonb)
  INTO n,lineage FROM (
    SELECT g.id,g.sport,g.game_date,greatest(coalesce(g.pitch_count,0),(SELECT count(*)::integer FROM public.gp_pitches p WHERE p.game_id=g.id AND p.user_id=p_user AND p.perspective='pitcher')) AS count
    FROM public.gp_games g WHERE g.user_id=p_user AND g.game_date=p_date AND g.sport=s
      AND g.deleted_at IS NULL AND coalesce(g.ignored_for_training,false)=false AND g.status IN ('final','completed')
  ) q WHERE count>0;
  IF n>0 OR EXISTS(SELECT 1 FROM public.arm_ledger_entries WHERE user_id=p_user AND entry_date=p_date AND throw_type='game_pitches_self') THEN
    INSERT INTO public.arm_ledger_entries(user_id,entry_date,source,throw_type,count,status,game_sport,game_sources)
      VALUES(p_user,p_date,'pitching','game_pitches_self',n,'done',s,lineage)
    ON CONFLICT(user_id,entry_date,throw_type) DO UPDATE SET count=excluded.count,status='done',game_sport=excluded.game_sport,game_sources=excluded.game_sources,updated_at=now();
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.sync_game_arm_day(uuid,date) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.game_arm_sync_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE g public.gp_games;
BEGIN
  IF TG_TABLE_NAME='gp_games' THEN
    IF TG_OP<>'INSERT' THEN PERFORM public.sync_game_arm_day(OLD.user_id,OLD.game_date); END IF;
    IF TG_OP<>'DELETE' THEN PERFORM public.sync_game_arm_day(NEW.user_id,NEW.game_date); END IF;
  ELSE
    IF TG_OP<>'INSERT' THEN
      SELECT * INTO g FROM public.gp_games WHERE id=OLD.game_id;
      IF FOUND THEN PERFORM public.sync_game_arm_day(g.user_id,g.game_date); END IF;
    END IF;
    IF TG_OP<>'DELETE' THEN
      SELECT * INTO g FROM public.gp_games WHERE id=NEW.game_id;
      IF FOUND THEN PERFORM public.sync_game_arm_day(g.user_id,g.game_date); END IF;
    END IF;
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.game_arm_sync_trigger() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER gp_games_arm_sync AFTER INSERT OR UPDATE OR DELETE ON public.gp_games FOR EACH ROW EXECUTE FUNCTION public.game_arm_sync_trigger();
CREATE TRIGGER gp_pitches_arm_sync AFTER INSERT OR UPDATE OR DELETE ON public.gp_pitches FOR EACH ROW EXECUTE FUNCTION public.game_arm_sync_trigger();