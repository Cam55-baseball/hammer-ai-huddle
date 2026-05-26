
INSERT INTO public.asb_topic_registry (topic_id, topic_class, authority_pathway, replay_policy, materialization_policy, description, introduced_in_engine_version) VALUES
  ('athlete.schedule.day_type',         'athlete_intent',        'athlete',           'deterministic', 'on_demand', 'Athlete-declared day type (training/game/rest/travel) for a calendar date.', 'wave-3'),
  ('athlete.schedule.day_type.deleted', 'athlete_intent',        'athlete',           'deterministic', 'on_demand', 'Athlete retraction of a previously declared day type.', 'wave-3'),
  ('onboarding.step_completed',         'observability',         'athlete',           'deterministic', 'transient', 'Onboarding step completion marker (lineage only; non-authoritative).', 'wave-3'),
  ('onboarding.path_selected',          'athlete_intent',        'athlete',           'deterministic', 'on_demand', 'Athlete-selected onboarding path / persona.', 'wave-3'),
  ('onboarding.primer_acknowledged',    'observability',         'athlete',           'deterministic', 'transient', 'Athlete acknowledged the survivability/constitutional primer.', 'wave-3'),
  ('prescription.daily.rendered',       'training_prescription', 'ai',                'deterministic', 'on_demand', 'Daily prescription rendered by runtime.', 'wave-1'),
  ('prescription.override.requested',   'authority_override',    'coach_parent_org',  'deterministic', 'on_demand', 'Override of a daily prescription requested.', 'wave-1'),
  ('prescription.override.acknowledged','authority_override',    'athlete',           'deterministic', 'on_demand', 'Athlete acknowledged a prescription override.', 'wave-1'),
  ('session.started',                   'session_execution',     'athlete',           'deterministic', 'on_demand', 'Training session started.', 'wave-1'),
  ('session.block.started',             'session_execution',     'athlete',           'deterministic', 'on_demand', 'Session block started.', 'wave-1'),
  ('session.block.completed',           'session_execution',     'athlete',           'deterministic', 'on_demand', 'Session block completed.', 'wave-1'),
  ('session.block.modified',            'session_execution',     'athlete',           'deterministic', 'on_demand', 'Session block modified during execution.', 'wave-1'),
  ('session.block.skipped',             'session_execution',     'athlete',           'deterministic', 'on_demand', 'Session block skipped.', 'wave-1'),
  ('session.block.substituted',         'session_execution',     'athlete',           'deterministic', 'on_demand', 'Session block substituted with an alternate.', 'wave-1'),
  ('session.deviation.logged',          'session_feedback',      'athlete',           'deterministic', 'on_demand', 'Athlete-logged deviation from prescribed session.', 'wave-1'),
  ('session.response.captured',         'session_feedback',      'athlete',           'deterministic', 'on_demand', 'Post-session athlete response captured.', 'wave-1'),
  ('runtime.feedback.captured',         'observability',         'athlete',           'deterministic', 'transient', 'Generic runtime feedback signal (non-authoritative).', 'wave-1')
ON CONFLICT (topic_id) DO NOTHING;
