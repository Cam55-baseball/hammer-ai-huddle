
CREATE TABLE public.checkout_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT,
  tier TEXT,
  sport TEXT,
  sim_id TEXT,
  severity TEXT,
  gap TEXT,
  pct INTEGER,
  from_slug TEXT,
  ab_variant TEXT,
  stripe_session_id TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_checkout_attempts_user ON public.checkout_attempts(user_id);
CREATE INDEX idx_checkout_attempts_started ON public.checkout_attempts(started_at DESC);
CREATE INDEX idx_checkout_attempts_pending ON public.checkout_attempts(started_at) WHERE completed_at IS NULL;

ALTER TABLE public.checkout_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert their own checkout attempts"
ON public.checkout_attempts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view their own checkout attempts"
ON public.checkout_attempts FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users update their own checkout attempts"
ON public.checkout_attempts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE VIEW public.checkout_ab_summary
WITH (security_invoker = true) AS
SELECT
  ab_variant,
  COUNT(*) AS started,
  COUNT(completed_at) AS completed,
  ROUND(100.0 * COUNT(completed_at)::numeric / NULLIF(COUNT(*), 0), 2) AS conversion_pct
FROM public.checkout_attempts
GROUP BY ab_variant;
