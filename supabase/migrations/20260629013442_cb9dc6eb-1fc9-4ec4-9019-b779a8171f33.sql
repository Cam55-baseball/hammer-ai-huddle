ALTER TABLE public.iq_situations ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS iq_situations_deleted_at_idx ON public.iq_situations (deleted_at) WHERE deleted_at IS NULL;