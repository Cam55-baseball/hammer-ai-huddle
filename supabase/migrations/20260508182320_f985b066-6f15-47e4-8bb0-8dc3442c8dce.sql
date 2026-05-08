-- Add "For Your Team" category + Ask the Coach + Scout Feed submodules under each tier
INSERT INTO public.demo_registry (node_type, slug, parent_slug, title, tagline, component_key, display_order, is_active)
VALUES
  ('category', 'coach-hub-5tool',   '5tool',      'For Your Team', 'What coaches & scouts see', NULL, 5, true),
  ('category', 'coach-hub-g2w',     'golden2way', 'For Your Team', 'What coaches & scouts see', NULL, 7, true),
  ('category', 'coach-hub-pitcher', 'pitcher',    'For Your Team', 'What coaches & scouts see', NULL, 5, true),

  ('submodule', 'ask-the-coach-5tool',   'coach-hub-5tool',   'Ask the Coach', 'See what coaches see',                   'ask-the-coach', 1, true),
  ('submodule', 'scout-feed-5tool',      'coach-hub-5tool',   'Scout Feed',    'What scouts see when they find you',     'scout-feed',    2, true),

  ('submodule', 'ask-the-coach-g2w',     'coach-hub-g2w',     'Ask the Coach', 'See what coaches see',                   'ask-the-coach', 1, true),
  ('submodule', 'scout-feed-g2w',        'coach-hub-g2w',     'Scout Feed',    'What scouts see when they find you',     'scout-feed',    2, true),

  ('submodule', 'ask-the-coach-pitcher', 'coach-hub-pitcher', 'Ask the Coach', 'See what coaches see',                   'ask-the-coach', 1, true),
  ('submodule', 'scout-feed-pitcher',    'coach-hub-pitcher', 'Scout Feed',    'What scouts see when they find you',     'scout-feed',    2, true)
ON CONFLICT (node_type, slug) DO NOTHING;