-- Add column to map each module to its Stripe subscription details
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS module_subscription_mapping jsonb DEFAULT '{}'::jsonb;

-- Track if any module has pending cancellation
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS has_pending_cancellations BOOLEAN DEFAULT false;

-- Create webhook events tracking table (idempotency)
CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  processed_at timestamptz DEFAULT now(),
  user_email text,
  details jsonb
);

-- Enable RLS
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Service role can insert webhook events"
ON public.processed_webhook_events
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can select webhook events"
ON public.processed_webhook_events
FOR SELECT
TO service_role
USING (true);