INSERT INTO public.asb_topic_registry (topic_id, topic_class, authority_pathway, replay_policy, materialization_policy, description, introduced_in_engine_version) VALUES
  ('intelligence.next_step.resolved', 'ai_proposal', 'ai', 'deterministic_with_inputs', 'on_demand', 'Coach Hammer canonical next-step authority resolved (AI primary, heuristic fallback).', 'hammer-consolidation-v1'),
  ('onboarding.knowledge_gap_resolved', 'athlete_intent', 'athlete', 'deterministic', 'snapshot', 'Athlete answered a Hammer knowledge-gap question; value persisted to profile.', 'hammer-consolidation-v1'),
  ('hammer.chat.message', 'observability', 'ai', 'non_replayable_informational', 'transient', 'Conversational message exchanged with Coach Hammer (in-memory; informational only).', 'hammer-consolidation-v1'),
  ('prescription.daily.modality.warmup',      'training_prescription', 'longitudinal_survivability', 'deterministic_with_inputs', 'on_demand', 'Daily warm-up prescription block.', 'hammer-consolidation-v1'),
  ('prescription.daily.modality.speed',       'training_prescription', 'longitudinal_survivability', 'deterministic_with_inputs', 'on_demand', 'Daily speed/explosive prescription block.', 'hammer-consolidation-v1'),
  ('prescription.daily.modality.strength',    'training_prescription', 'longitudinal_survivability', 'deterministic_with_inputs', 'on_demand', 'Daily strength prescription block.', 'hammer-consolidation-v1'),
  ('prescription.daily.modality.hitting',     'training_prescription', 'longitudinal_survivability', 'deterministic_with_inputs', 'on_demand', 'Daily hitting prescription block.', 'hammer-consolidation-v1'),
  ('prescription.daily.modality.throwing',    'training_prescription', 'longitudinal_survivability', 'deterministic_with_inputs', 'on_demand', 'Daily throwing prescription block.', 'hammer-consolidation-v1'),
  ('prescription.daily.modality.defense',     'training_prescription', 'longitudinal_survivability', 'deterministic_with_inputs', 'on_demand', 'Daily defense prescription block.', 'hammer-consolidation-v1'),
  ('prescription.daily.modality.baserunning', 'training_prescription', 'longitudinal_survivability', 'deterministic_with_inputs', 'on_demand', 'Daily baserunning prescription block.', 'hammer-consolidation-v1'),
  ('prescription.daily.modality.fueling',     'training_prescription', 'longitudinal_survivability', 'deterministic_with_inputs', 'on_demand', 'Daily fueling prescription block.', 'hammer-consolidation-v1'),
  ('prescription.daily.modality.recovery',    'training_prescription', 'longitudinal_survivability', 'deterministic_with_inputs', 'on_demand', 'Daily recovery prescription block.', 'hammer-consolidation-v1')
ON CONFLICT (topic_id) DO UPDATE SET
  topic_class = EXCLUDED.topic_class,
  authority_pathway = EXCLUDED.authority_pathway,
  replay_policy = EXCLUDED.replay_policy,
  materialization_policy = EXCLUDED.materialization_policy,
  description = EXCLUDED.description;