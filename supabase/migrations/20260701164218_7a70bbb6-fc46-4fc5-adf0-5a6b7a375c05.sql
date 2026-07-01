
-- Phase 2 — Canonical Prescription Pipeline
-- 1) Dedup existing wk_prescriptions so we can add the unique constraint.
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY user_id, plan_date, movement_slug ORDER BY created_at ASC, id ASC) AS rn
  FROM public.wk_prescriptions
)
DELETE FROM public.wk_prescriptions p
USING ranked r
WHERE p.id = r.id AND r.rn > 1;

-- 2) Enforce constitutional uniqueness at the storage layer.
CREATE UNIQUE INDEX IF NOT EXISTS wk_prescriptions_user_date_slug_uniq
  ON public.wk_prescriptions (user_id, plan_date, movement_slug);

-- 3) Generation diagnostics table (Fix 10).
CREATE TABLE IF NOT EXISTS public.wk_generation_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_date date NOT NULL,
  generation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  generator_version text NOT NULL,
  season_phase text,
  adaptation text,
  generation_ms integer,
  validation_status text NOT NULL,
  exercise_count integer NOT NULL DEFAULT 0,
  duplicate_count integer NOT NULL DEFAULT 0,
  ordering_ok boolean NOT NULL DEFAULT true,
  metadata_complete boolean NOT NULL DEFAULT true,
  cards_produced jsonb NOT NULL DEFAULT '{}'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wk_generation_diagnostics TO authenticated;
GRANT ALL ON public.wk_generation_diagnostics TO service_role;

ALTER TABLE public.wk_generation_diagnostics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own diagnostics"
  ON public.wk_generation_diagnostics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS wk_generation_diagnostics_user_date_idx
  ON public.wk_generation_diagnostics (user_id, plan_date, created_at DESC);

-- 4) Atomic persist RPC (Fix 2) — DELETE + INSERT + diagnostics in one transaction.
CREATE OR REPLACE FUNCTION public.wk_persist_prescriptions_atomic(
  p_user uuid,
  p_date date,
  p_rows jsonb,
  p_diag jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_diag_id uuid;
BEGIN
  IF p_user IS NULL OR p_date IS NULL THEN
    RAISE EXCEPTION 'p_user and p_date are required';
  END IF;

  DELETE FROM public.wk_prescriptions
  WHERE user_id = p_user AND plan_date = p_date;

  IF jsonb_typeof(p_rows) = 'array' AND jsonb_array_length(p_rows) > 0 THEN
    INSERT INTO public.wk_prescriptions (
      user_id, plan_date, phase, slot, sequence_order, sequence_role,
      movement_slug, movement_name, sets, reps, tempo, load_pct,
      cns_cost, cns_clamped, substituted_from_slug, substitution_reason,
      why_payload, rationale, adaptation, engine, why_v2,
      validator_report, generator_version, status
    )
    SELECT
      p_user,
      p_date,
      (r->>'phase'),
      (r->>'slot'),
      (r->>'sequence_order')::int,
      NULLIF(r->>'sequence_role',''),
      (r->>'movement_slug'),
      (r->>'movement_name'),
      NULLIF(r->>'sets','')::int,
      NULLIF(r->>'reps','')::int,
      NULLIF(r->>'tempo',''),
      NULLIF(r->>'load_pct','')::int,
      COALESCE((r->>'cns_cost')::int, 0),
      COALESCE((r->>'cns_clamped')::boolean, false),
      NULLIF(r->>'substituted_from_slug',''),
      NULLIF(r->>'substitution_reason',''),
      COALESCE(r->'why_payload','{}'::jsonb),
      NULLIF(r->>'rationale',''),
      NULLIF(r->>'adaptation',''),
      NULLIF(r->>'engine',''),
      NULLIF(r->'why_v2','null'::jsonb),
      NULLIF(r->'validator_report','null'::jsonb),
      NULLIF(r->>'generator_version',''),
      COALESCE(NULLIF(r->>'status',''), 'planned')
    FROM jsonb_array_elements(p_rows) AS r;
  END IF;

  INSERT INTO public.wk_generation_diagnostics (
    user_id, plan_date, generator_version, season_phase, adaptation,
    generation_ms, validation_status, exercise_count, duplicate_count,
    ordering_ok, metadata_complete, cards_produced, warnings, errors
  ) VALUES (
    p_user,
    p_date,
    COALESCE(p_diag->>'generator_version','unknown'),
    p_diag->>'season_phase',
    p_diag->>'adaptation',
    NULLIF(p_diag->>'generation_ms','')::int,
    COALESCE(p_diag->>'validation_status','published'),
    COALESCE((p_diag->>'exercise_count')::int, 0),
    COALESCE((p_diag->>'duplicate_count')::int, 0),
    COALESCE((p_diag->>'ordering_ok')::boolean, true),
    COALESCE((p_diag->>'metadata_complete')::boolean, true),
    COALESCE(p_diag->'cards_produced','{}'::jsonb),
    COALESCE(p_diag->'warnings','[]'::jsonb),
    COALESCE(p_diag->'errors','[]'::jsonb)
  ) RETURNING id INTO v_diag_id;

  RETURN v_diag_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.wk_persist_prescriptions_atomic(uuid, date, jsonb, jsonb) TO service_role;
