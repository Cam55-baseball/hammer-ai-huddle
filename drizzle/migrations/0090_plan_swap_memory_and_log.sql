CREATE TABLE public.athlete_equipment_memory (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 request_id uuid NOT NULL,
 scope text NOT NULL CHECK (scope IN ('today','always')),
 plan_date date NOT NULL,
 confirmed_have text[] NOT NULL DEFAULT '{}',
 confirmed_lacks text[] NOT NULL DEFAULT '{}',
 equipment_context_id uuid REFERENCES public.athlete_equipment_context(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,request_id),
 CHECK (NOT (confirmed_have && confirmed_lacks)),
 CHECK (cardinality(confirmed_lacks) > 0)
);
GRANT SELECT ON public.athlete_equipment_memory TO authenticated;
GRANT ALL ON public.athlete_equipment_memory TO service_role;
ALTER TABLE public.athlete_equipment_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Athletes read their own confirmed Swap facts" ON public.athlete_equipment_memory FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX athlete_equipment_memory_user_date_idx ON public.athlete_equipment_memory(user_id,plan_date);
COMMENT ON TABLE public.athlete_equipment_memory IS 'Server-committed Swap availability receipts, not a second equipment inventory. Canonical inventory remains athlete_equipment_context. Today applies only to plan_date; always patches persistent context in the same certified transaction. No standalone client writes.';
CREATE TABLE public.plan_swap_log (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 request_id uuid NOT NULL,
 prescription_id uuid NOT NULL REFERENCES public.wk_prescriptions(id),
 plan_date date NOT NULL,
 equipment_memory_id uuid NOT NULL REFERENCES public.athlete_equipment_memory(id),
 request_fingerprint text NOT NULL,
 before_row jsonb NOT NULL,
 after_row jsonb NOT NULL,
 certification jsonb NOT NULL,
 reason text NOT NULL CHECK(length(btrim(reason)) > 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,request_id)
);
GRANT SELECT ON public.plan_swap_log TO authenticated;
GRANT ALL ON public.plan_swap_log TO service_role;
ALTER TABLE public.plan_swap_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Athletes read their own Swap receipts" ON public.plan_swap_log FOR SELECT TO authenticated USING(auth.uid() = user_id);
CREATE INDEX plan_swap_log_prescription_idx ON public.plan_swap_log(prescription_id,created_at);
COMMENT ON TABLE public.plan_swap_log IS 'Atomic server-owned Swap and idempotency receipts. No client writes, no scout access, no model-authorized certification. Only certified transactions may append; athlete completion logging remains separate.';