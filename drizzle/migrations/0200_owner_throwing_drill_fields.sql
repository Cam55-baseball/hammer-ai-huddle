ALTER TABLE public.owner_drills
  ADD COLUMN IF NOT EXISTS throw_steps jsonb,
  ADD COLUMN IF NOT EXISTS throw_intent text,
  ADD COLUMN IF NOT EXISTS throw_flight text,
  ADD COLUMN IF NOT EXISTS throw_pulldowns boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS throw_contexts text[],
  ADD COLUMN IF NOT EXISTS throw_role_fit text[];
COMMENT ON COLUMN public.owner_drills.throw_steps IS 'Owner throwing drill: [{ft, throws, pulldownThrows?}]';