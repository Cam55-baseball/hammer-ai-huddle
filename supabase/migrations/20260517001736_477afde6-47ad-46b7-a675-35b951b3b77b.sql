
-- ============================================================
-- ASB Phase 1: Canonical event ledger + lineage + snapshots
-- Append-only, replay-safe, immutable, RLS-enforced
-- ============================================================

-- ---------- Enums ----------
CREATE TYPE public.asb_actor_role AS ENUM (
  'medical', 'athlete', 'coach', 'parent', 'org', 'ai', 'system'
);

CREATE TYPE public.asb_authority_pathway AS ENUM (
  'medical', 'organism_safety', 'longitudinal_survivability',
  'athlete', 'coach_parent_org', 'ai', 'population_priors', 'system'
);

CREATE TYPE public.asb_replay_policy AS ENUM (
  'deterministic', 'deterministic_with_inputs', 'non_replayable_informational'
);

CREATE TYPE public.asb_materialization_policy AS ENUM (
  'snapshot', 'on_demand', 'transient'
);

CREATE TYPE public.asb_topic_class AS ENUM (
  'organism_truth', 'athlete_intent', 'authority_override', 'hard_stop',
  'rehabilitation_state', 'readiness', 'training_prescription',
  'session_execution', 'session_feedback', 'recovery_state',
  'constraint_signal', 'confidence_signal', 'observability',
  'org_propagation', 'ai_proposal', 'medical_event'
);

-- ---------- Topic registry ----------
CREATE TABLE public.asb_topic_registry (
  topic_id TEXT PRIMARY KEY,
  topic_class public.asb_topic_class NOT NULL,
  authority_pathway public.asb_authority_pathway NOT NULL,
  replay_policy public.asb_replay_policy NOT NULL,
  materialization_policy public.asb_materialization_policy NOT NULL,
  description TEXT NOT NULL,
  introduced_in_engine_version TEXT NOT NULL,
  deprecated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Engine version registry ----------
CREATE TABLE public.asb_engine_versions (
  engine_version TEXT PRIMARY KEY,
  schema_version INTEGER NOT NULL,
  released_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deprecated_at TIMESTAMPTZ,
  notes TEXT
);

-- ---------- Event ledger (append-only) ----------
CREATE TABLE public.asb_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL,
  topic_id TEXT NOT NULL REFERENCES public.asb_topic_registry(topic_id),
  actor_role public.asb_actor_role NOT NULL,
  actor_id UUID,
  -- 5 canonical timestamps (replay determinism)
  occurred_at TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_at TIMESTAMPTZ NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  engine_version TEXT NOT NULL REFERENCES public.asb_engine_versions(engine_version),
  idempotency_key TEXT NOT NULL UNIQUE,
  causality_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  lineage_refs JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX idx_asb_events_athlete_occurred ON public.asb_events(athlete_id, occurred_at DESC);
CREATE INDEX idx_asb_events_topic ON public.asb_events(topic_id);
CREATE INDEX idx_asb_events_actor ON public.asb_events(actor_role, actor_id);

-- ---------- Lineage ----------
CREATE TABLE public.asb_event_lineage (
  lineage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_event_id UUID NOT NULL REFERENCES public.asb_events(event_id),
  child_event_id UUID NOT NULL REFERENCES public.asb_events(event_id),
  derivation_type TEXT NOT NULL,
  engine_version TEXT NOT NULL REFERENCES public.asb_engine_versions(engine_version),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parent_event_id, child_event_id, derivation_type)
);

CREATE INDEX idx_asb_lineage_parent ON public.asb_event_lineage(parent_event_id);
CREATE INDEX idx_asb_lineage_child ON public.asb_event_lineage(child_event_id);

-- ---------- Confidence records ----------
CREATE TABLE public.asb_confidence_records (
  record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.asb_events(event_id),
  signal_key TEXT NOT NULL,
  confidence NUMERIC(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  uncertainty_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  missingness_markers JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_asb_confidence_event ON public.asb_confidence_records(event_id);

-- ---------- Authority overrides ----------
CREATE TABLE public.asb_authority_overrides (
  override_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL,
  actor_role public.asb_actor_role NOT NULL,
  actor_id UUID,
  target_event_id UUID NOT NULL REFERENCES public.asb_events(event_id),
  justification TEXT NOT NULL,
  risk_acknowledgement JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_asb_overrides_athlete ON public.asb_authority_overrides(athlete_id, occurred_at DESC);
CREATE INDEX idx_asb_overrides_target ON public.asb_authority_overrides(target_event_id);

-- ---------- State snapshots (disposable) ----------
CREATE TABLE public.asb_state_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL,
  snapshot_kind TEXT NOT NULL,
  as_of_event_id UUID NOT NULL REFERENCES public.asb_events(event_id),
  engine_version TEXT NOT NULL REFERENCES public.asb_engine_versions(engine_version),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (athlete_id, snapshot_kind, as_of_event_id, engine_version)
);

CREATE INDEX idx_asb_snapshots_athlete_kind ON public.asb_state_snapshots(athlete_id, snapshot_kind, created_at DESC);

-- ---------- Org propagation log ----------
CREATE TABLE public.asb_org_propagation_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  athlete_id UUID NOT NULL,
  propagated_event_id UUID NOT NULL REFERENCES public.asb_events(event_id),
  propagation_kind TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_asb_org_prop_org ON public.asb_org_propagation_log(org_id, occurred_at DESC);
CREATE INDEX idx_asb_org_prop_athlete ON public.asb_org_propagation_log(athlete_id);

-- ============================================================
-- Immutability triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.asb_block_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ASB ledger tables are append-only (table=%, op=%)',
    TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER asb_events_block_update BEFORE UPDATE ON public.asb_events
  FOR EACH ROW EXECUTE FUNCTION public.asb_block_mutation();
CREATE TRIGGER asb_events_block_delete BEFORE DELETE ON public.asb_events
  FOR EACH ROW EXECUTE FUNCTION public.asb_block_mutation();

CREATE TRIGGER asb_lineage_block_update BEFORE UPDATE ON public.asb_event_lineage
  FOR EACH ROW EXECUTE FUNCTION public.asb_block_mutation();
CREATE TRIGGER asb_lineage_block_delete BEFORE DELETE ON public.asb_event_lineage
  FOR EACH ROW EXECUTE FUNCTION public.asb_block_mutation();

CREATE TRIGGER asb_confidence_block_update BEFORE UPDATE ON public.asb_confidence_records
  FOR EACH ROW EXECUTE FUNCTION public.asb_block_mutation();
CREATE TRIGGER asb_confidence_block_delete BEFORE DELETE ON public.asb_confidence_records
  FOR EACH ROW EXECUTE FUNCTION public.asb_block_mutation();

CREATE TRIGGER asb_overrides_block_update BEFORE UPDATE ON public.asb_authority_overrides
  FOR EACH ROW EXECUTE FUNCTION public.asb_block_mutation();
CREATE TRIGGER asb_overrides_block_delete BEFORE DELETE ON public.asb_authority_overrides
  FOR EACH ROW EXECUTE FUNCTION public.asb_block_mutation();

CREATE TRIGGER asb_org_prop_block_update BEFORE UPDATE ON public.asb_org_propagation_log
  FOR EACH ROW EXECUTE FUNCTION public.asb_block_mutation();
CREATE TRIGGER asb_org_prop_block_delete BEFORE DELETE ON public.asb_org_propagation_log
  FOR EACH ROW EXECUTE FUNCTION public.asb_block_mutation();

-- snapshots: update blocked, delete allowed (disposable)
CREATE TRIGGER asb_snapshots_block_update BEFORE UPDATE ON public.asb_state_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.asb_block_mutation();

-- AI actors cannot author organism_truth-class events (constitutional rule)
CREATE OR REPLACE FUNCTION public.asb_enforce_ai_authority_boundary()
RETURNS TRIGGER AS $$
DECLARE
  v_class public.asb_topic_class;
BEGIN
  SELECT topic_class INTO v_class
    FROM public.asb_topic_registry
    WHERE topic_id = NEW.topic_id;

  IF NEW.actor_role = 'ai' AND v_class IN (
    'organism_truth', 'athlete_intent', 'authority_override',
    'hard_stop', 'rehabilitation_state'
  ) THEN
    RAISE EXCEPTION 'AI actor forbidden from authoring topic_class=% (topic=%)',
      v_class, NEW.topic_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER asb_events_ai_boundary BEFORE INSERT ON public.asb_events
  FOR EACH ROW EXECUTE FUNCTION public.asb_enforce_ai_authority_boundary();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.asb_topic_registry        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asb_engine_versions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asb_events                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asb_event_lineage         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asb_confidence_records    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asb_authority_overrides   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asb_state_snapshots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asb_org_propagation_log   ENABLE ROW LEVEL SECURITY;

-- Registries: read-only to authenticated users
CREATE POLICY "Topic registry readable by authenticated"
  ON public.asb_topic_registry FOR SELECT TO authenticated USING (true);

CREATE POLICY "Engine versions readable by authenticated"
  ON public.asb_engine_versions FOR SELECT TO authenticated USING (true);

-- Athlete-scoped reads
CREATE POLICY "Athletes read own events"
  ON public.asb_events FOR SELECT TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Athletes read lineage of own events"
  ON public.asb_event_lineage FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.asb_events e
    WHERE e.event_id = asb_event_lineage.child_event_id
      AND e.athlete_id = auth.uid()
  ));

CREATE POLICY "Athletes read confidence of own events"
  ON public.asb_confidence_records FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.asb_events e
    WHERE e.event_id = asb_confidence_records.event_id
      AND e.athlete_id = auth.uid()
  ));

CREATE POLICY "Athletes read own overrides"
  ON public.asb_authority_overrides FOR SELECT TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Athletes read own snapshots"
  ON public.asb_state_snapshots FOR SELECT TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Athletes read own org propagation"
  ON public.asb_org_propagation_log FOR SELECT TO authenticated
  USING (athlete_id = auth.uid());

-- No INSERT/UPDATE/DELETE policies for non-service roles → all writes flow
-- through service role (event runtime, built in Phase 2).

-- ============================================================
-- Seed: initial engine version + canonical topic registry
-- ============================================================
INSERT INTO public.asb_engine_versions (engine_version, schema_version, notes) VALUES
  ('v1.0.0', 1, 'ASB Phase 1 — initial canonical event ledger');

INSERT INTO public.asb_topic_registry
  (topic_id, topic_class, authority_pathway, replay_policy, materialization_policy, description, introduced_in_engine_version)
VALUES
  ('organism.truth.v1',              'organism_truth',        'organism_safety',           'deterministic',              'snapshot',   'Canonical organism truth signal',                 'v1.0.0'),
  ('athlete.intent.v1',              'athlete_intent',        'athlete',                   'deterministic_with_inputs',  'snapshot',   'Athlete-declared intent / goal',                  'v1.0.0'),
  ('authority.override.v1',          'authority_override',    'athlete',                   'deterministic',              'snapshot',   'Authority override emitted by a human actor',     'v1.0.0'),
  ('hard_stop.v1',                   'hard_stop',             'medical',                   'deterministic',              'snapshot',   'Medical/safety hard stop',                        'v1.0.0'),
  ('rehab.state.v1',                 'rehabilitation_state',  'medical',                   'deterministic',              'snapshot',   'Rehabilitation state transition',                 'v1.0.0'),
  ('readiness.daily.v1',             'readiness',             'longitudinal_survivability','deterministic_with_inputs',  'snapshot',   'Daily organism readiness derivation',             'v1.0.0'),
  ('training.prescription.v1',       'training_prescription', 'longitudinal_survivability','deterministic_with_inputs',  'snapshot',   'Daily training prescription',                     'v1.0.0'),
  ('session.execution.v1',           'session_execution',     'athlete',                   'deterministic',              'snapshot',   'Session execution event',                         'v1.0.0'),
  ('session.feedback.v1',            'session_feedback',      'athlete',                   'deterministic',              'snapshot',   'Post-session athlete feedback',                   'v1.0.0'),
  ('recovery.state.v1',              'recovery_state',        'longitudinal_survivability','deterministic_with_inputs',  'snapshot',   'Recovery state derivation',                       'v1.0.0'),
  ('constraint.signal.v1',           'constraint_signal',     'organism_safety',           'deterministic_with_inputs',  'snapshot',   'Constraint / risk foreclosure signal',            'v1.0.0'),
  ('confidence.signal.v1',           'confidence_signal',     'system',                    'deterministic',              'on_demand',  'Per-signal confidence emission',                  'v1.0.0'),
  ('observability.v1',               'observability',         'system',                    'non_replayable_informational','transient', 'Observability / telemetry event',                 'v1.0.0'),
  ('org.propagation.v1',             'org_propagation',       'coach_parent_org',          'deterministic',              'on_demand',  'Organizational propagation event',                'v1.0.0'),
  ('ai.proposal.v1',                 'ai_proposal',           'ai',                        'deterministic_with_inputs',  'on_demand',  'AI-emitted proposal (never organism truth)',      'v1.0.0'),
  ('medical.event.v1',               'medical_event',         'medical',                   'deterministic',              'snapshot',   'Medical-authored event',                          'v1.0.0');
