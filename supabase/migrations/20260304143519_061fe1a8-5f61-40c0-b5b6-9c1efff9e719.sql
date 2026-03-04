ALTER TABLE public.subscriptions 
  ADD COLUMN IF NOT EXISTS module_data_status jsonb DEFAULT '{}'::jsonb;