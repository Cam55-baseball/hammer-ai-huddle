DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.gp_games; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.gp_at_bats; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.gp_pitches; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.gp_defense_plays; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.gp_baserun_events; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.gp_subs; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE public.gp_games REPLICA IDENTITY FULL;
ALTER TABLE public.gp_at_bats REPLICA IDENTITY FULL;
ALTER TABLE public.gp_pitches REPLICA IDENTITY FULL;
ALTER TABLE public.gp_defense_plays REPLICA IDENTITY FULL;
ALTER TABLE public.gp_baserun_events REPLICA IDENTITY FULL;
ALTER TABLE public.gp_subs REPLICA IDENTITY FULL;