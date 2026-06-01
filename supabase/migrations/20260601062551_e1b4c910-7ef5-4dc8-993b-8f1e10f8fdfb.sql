-- Phase A §1 — Register relational.* topics in asb_topic_registry.
-- Additive, idempotent (ON CONFLICT DO NOTHING). No existing rows mutated.
INSERT INTO public.asb_topic_registry
  (topic_id, topic_class, authority_pathway, replay_policy, materialization_policy, description, introduced_in_engine_version)
VALUES
  ('relational.conversation.turn',                 'observability',     'athlete',           'deterministic_with_inputs', 'on_demand', 'Athlete↔Hammer conversation turn (interpretive overlay; Phase 152).', 'asb-1.0.0'),
  ('relational.conversation.shared',               'observability',     'coach_parent_org',  'deterministic_with_inputs', 'on_demand', 'Conversation segment shared with another scope (interpretive overlay; Phase 152).', 'asb-1.0.0'),
  ('relational.conversation.redacted',             'observability',     'athlete',           'deterministic_with_inputs', 'on_demand', 'Conversation segment redacted by athlete (interpretive overlay; Phase 152).', 'asb-1.0.0'),
  ('relational.psych.self_report',                 'confidence_signal', 'athlete',           'deterministic_with_inputs', 'on_demand', 'Athlete-authored psychological state self-report (interpretive overlay; Phase 153).', 'asb-1.0.0'),
  ('relational.psych.inferred',                    'confidence_signal', 'ai',                'deterministic_with_inputs', 'on_demand', 'AI-inferred psych signal, bounded by confidence (interpretive overlay; Phase 153).', 'asb-1.0.0'),
  ('relational.psych.transition',                  'confidence_signal', 'system',            'deterministic_with_inputs', 'on_demand', 'Psych state transition derived from accumulated signals (Phase 153).', 'asb-1.0.0'),
  ('relational.developmental.age_observed',        'constraint_signal', 'athlete',           'deterministic_with_inputs', 'snapshot',  'Observed athlete age / DOB anchor (Phase 154).', 'asb-1.0.0'),
  ('relational.developmental.growth_attestation',  'constraint_signal', 'coach_parent_org',  'deterministic_with_inputs', 'snapshot',  'Growth attestation from parent/coach (Phase 154).', 'asb-1.0.0'),
  ('relational.developmental.puberty_marker',      'constraint_signal', 'coach_parent_org',  'deterministic_with_inputs', 'snapshot',  'Puberty milestone marker (Phase 154).', 'asb-1.0.0'),
  ('relational.developmental.deload_window',       'constraint_signal', 'system',            'deterministic_with_inputs', 'on_demand', 'Developmental deload window (Phase 154).', 'asb-1.0.0'),
  ('relational.developmental.transition',          'constraint_signal', 'system',            'deterministic_with_inputs', 'snapshot',  'Developmental stage transition (Phase 154).', 'asb-1.0.0'),
  ('relational.developmental.gate_decision',       'constraint_signal', 'system',            'deterministic_with_inputs', 'on_demand', 'Developmental gate decision applied to load/intensity (Phase 154).', 'asb-1.0.0'),
  ('relational.relationship.created',              'org_propagation',   'coach_parent_org',  'deterministic_with_inputs', 'snapshot',  'Relationship created between athlete and counterparty (Phase 152).', 'asb-1.0.0'),
  ('relational.relationship.confirmed',            'org_propagation',   'coach_parent_org',  'deterministic_with_inputs', 'snapshot',  'Relationship confirmed by counterparty (Phase 152).', 'asb-1.0.0'),
  ('relational.relationship.revoked',              'org_propagation',   'coach_parent_org',  'deterministic',             'snapshot',  'Relationship revoked (Phase 152).', 'asb-1.0.0'),
  ('relational.relationship.paused',               'org_propagation',   'coach_parent_org',  'deterministic',             'snapshot',  'Relationship paused (Phase 152).', 'asb-1.0.0')
ON CONFLICT (topic_id) DO NOTHING;