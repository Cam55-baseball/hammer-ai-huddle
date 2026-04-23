ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS activation_choice text;
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status);