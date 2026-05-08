ALTER TABLE public.demo_registry
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'all';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'demo_registry_audience_check'
  ) THEN
    ALTER TABLE public.demo_registry
      ADD CONSTRAINT demo_registry_audience_check
      CHECK (audience IN ('all','team'));
  END IF;
END $$;

UPDATE public.demo_registry
SET audience = 'team'
WHERE slug IN (
  'coach-hub-5tool','coach-hub-golden2way','coach-hub-pitcher',
  'ask-the-coach-5tool','ask-the-coach-golden2way','ask-the-coach-pitcher',
  'scout-feed-5tool','scout-feed-golden2way','scout-feed-pitcher'
);