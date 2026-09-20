CREATE TABLE public.tcs_runner_auth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.tcs_runner_auth TO service_role;
ALTER TABLE public.tcs_runner_auth ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No client access to the runner token"
ON public.tcs_runner_auth FOR SELECT TO authenticated
USING (false);

INSERT INTO public.tcs_runner_auth (token) VALUES (encode(gen_random_bytes(32), 'hex'));