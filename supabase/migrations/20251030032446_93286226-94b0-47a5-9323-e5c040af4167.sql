-- Add coupon tracking columns to subscriptions table
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS discount_percent integer,
  ADD COLUMN IF NOT EXISTS coupon_name text;

-- Add index for efficient querying of subscriptions with coupons
CREATE INDEX IF NOT EXISTS idx_subscriptions_coupon_code 
  ON public.subscriptions(coupon_code) 
  WHERE coupon_code IS NOT NULL;