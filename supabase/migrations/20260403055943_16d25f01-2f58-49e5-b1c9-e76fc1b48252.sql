
-- Add unique constraint on athlete_events to prevent duplicate day-types per date
ALTER TABLE public.athlete_events
  ADD CONSTRAINT athlete_events_user_date_unique UNIQUE (user_id, event_date);

-- Add unique constraint on calendar_events to prevent duplicate manual events
-- Using a partial unique index since we want to allow multiple events of different types
CREATE UNIQUE INDEX IF NOT EXISTS calendar_events_user_date_type_related_unique
  ON public.calendar_events (user_id, event_date, event_type, related_id)
  WHERE related_id IS NOT NULL;
