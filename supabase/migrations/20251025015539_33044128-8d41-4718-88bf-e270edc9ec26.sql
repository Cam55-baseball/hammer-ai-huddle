-- Add new columns to subscriptions table for Stripe integration
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS subscribed_modules text[] DEFAULT ARRAY[]::text[],
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Remove videos_remaining column as we're moving to module-based subscriptions
ALTER TABLE public.subscriptions 
DROP COLUMN IF EXISTS videos_remaining;

-- Update existing subscriptions to have empty modules array
UPDATE public.subscriptions 
SET subscribed_modules = ARRAY[]::text[]
WHERE subscribed_modules IS NULL;
