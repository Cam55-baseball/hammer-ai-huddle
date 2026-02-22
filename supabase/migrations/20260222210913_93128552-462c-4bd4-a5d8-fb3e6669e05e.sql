ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS grandfathered_price text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS grandfathered_at timestamptz;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS tier text;