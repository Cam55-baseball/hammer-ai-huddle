ALTER TABLE public.behavioral_events
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_behavioral_events_user_unack
  ON public.behavioral_events (user_id, created_at DESC)
  WHERE acknowledged_at IS NULL;

-- Enable realtime (idempotent)
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_consistency_snapshots; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.behavioral_events; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.hammer_state_snapshots; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE public.user_consistency_snapshots REPLICA IDENTITY FULL;
ALTER TABLE public.behavioral_events REPLICA IDENTITY FULL;
ALTER TABLE public.hammer_state_snapshots REPLICA IDENTITY FULL;

-- RLS for users to acknowledge their own events
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='behavioral_events' AND policyname='Users can update own behavioral events') THEN
    CREATE POLICY "Users can update own behavioral events"
      ON public.behavioral_events FOR UPDATE
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;