
-- ============ demo_registry ============
CREATE TABLE public.demo_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_type text NOT NULL CHECK (node_type IN ('tier','category','submodule')),
  slug text NOT NULL,
  parent_slug text,
  title text NOT NULL,
  tagline text,
  icon_name text,
  component_key text,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  ab_variant text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (node_type, slug)
);

ALTER TABLE public.demo_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_registry public read"
  ON public.demo_registry FOR SELECT
  USING (true);

CREATE POLICY "demo_registry admin write"
  ON public.demo_registry FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_demo_registry_parent ON public.demo_registry(parent_slug);
CREATE INDEX idx_demo_registry_type ON public.demo_registry(node_type);

-- ============ demo_progress ============
CREATE TABLE public.demo_progress (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  demo_state text NOT NULL DEFAULT 'pending'
    CHECK (demo_state IN ('pending','in_progress','skipped','completed')),
  current_node text,
  viewed_submodules text[] NOT NULL DEFAULT '{}',
  viewed_tiers text[] NOT NULL DEFAULT '{}',
  skipped_at timestamptz,
  completed_at timestamptz,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  variant text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_progress own select"
  ON public.demo_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "demo_progress own insert"
  ON public.demo_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "demo_progress own update"
  ON public.demo_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_demo_progress_state ON public.demo_progress(demo_state);

CREATE TRIGGER trg_demo_progress_updated_at
  BEFORE UPDATE ON public.demo_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============ demo_events ============
CREATE TABLE public.demo_events (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  node_slug text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_events own insert"
  ON public.demo_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "demo_events own select"
  ON public.demo_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_demo_events_user_time ON public.demo_events(user_id, created_at DESC);

-- ============ Seed registry ============
-- Tiers
INSERT INTO public.demo_registry (node_type, slug, parent_slug, title, tagline, icon_name, display_order) VALUES
  ('tier', '5tool',      NULL, '5 Tool Player',     'Hit. Run. Field. Throw. Recover.', 'Sparkles',  1),
  ('tier', 'pitcher',    NULL, 'Complete Pitcher',  'Command the mound.',               'Target',    2),
  ('tier', 'golden2way', NULL, 'The Golden 2-Way',  'Do it all. The Unicorn path.',     'Crown',     3);

-- Categories
INSERT INTO public.demo_registry (node_type, slug, parent_slug, title, tagline, icon_name, display_order) VALUES
  ('category','5tool-hitting-power','5tool','Hitting / Power','Drive the ball with intent.','Dumbbell',1),
  ('category','5tool-speed','5tool','Speed','Steal bases. Beat throws.','Zap',2),
  ('category','5tool-defense','5tool','Defense','Shut down innings.','Shield',3),
  ('category','5tool-player-care','5tool','Player Care','Fuel. Recover. Repeat.','Heart',4),

  ('category','pitcher-arsenal','pitcher','Arsenal','Build dominant stuff.','Flame',1),
  ('category','pitcher-command','pitcher','Command','Locate every pitch.','Target',2),
  ('category','pitcher-conditioning','pitcher','Conditioning','Heat Factory programming.','Activity',3),
  ('category','pitcher-recovery','pitcher','Recovery','Stay healthy all season.','Heart',4),

  ('category','golden2way-unicorn','golden2way','The Unicorn System','Two-way mastery.','Crown',1),
  ('category','golden2way-hitting','golden2way','Hitting / Power','Drive the ball.','Dumbbell',2),
  ('category','golden2way-pitching','golden2way','Pitching','Command the mound.','Flame',3),
  ('category','golden2way-speed','golden2way','Speed','Beat the throw.','Zap',4),
  ('category','golden2way-defense','golden2way','Defense','Lock it down.','Shield',5),
  ('category','golden2way-care','golden2way','Player Care','Fuel and recover.','Heart',6);

-- Submodules
INSERT INTO public.demo_registry (node_type, slug, parent_slug, title, tagline, icon_name, component_key, display_order) VALUES
  -- 5tool / hitting-power
  ('submodule','hitting-analysis','5tool-hitting-power','Hitting Analysis','Frame-by-frame swing breakdown.','Video','hitting-analysis',1),
  ('submodule','iron-bambino','5tool-hitting-power','Iron Bambino','24-week power progression.','Dumbbell','iron-bambino',2),
  ('submodule','tex-vision','5tool-hitting-power','Tex Vision','Daily 16-drill visual training.','Eye','tex-vision',3),
  ('submodule','royal-timing','5tool-hitting-power','Royal Timing Audit','Lock your load timing.','Clock','royal-timing',4),
  ('submodule','video-library-hit','5tool-hitting-power','Video Library','Curated drill vault.','Library','video-library',5),
  ('submodule','custom-cards-hit','5tool-hitting-power','Custom Card Creation','Build your own drills.','Plus','custom-cards',6),
  ('submodule','hammer-block-hit','5tool-hitting-power','Hammer Block Builder','Lifting blocks engineered for hitters.','Layers','hammer-block-builder',7),

  -- 5tool / speed
  ('submodule','speed-lab','5tool-speed','Speed Lab','Tracked sprint analytics.','Zap','speed-lab',1),
  ('submodule','base-stealing','5tool-speed','Base Stealing Trainer','0.01s precision reads.','Footprints','base-stealing',2),
  ('submodule','baserunning-iq','5tool-speed','Baserunning IQ','37 micro-lessons.','Brain','baserunning-iq',3),

  -- 5tool / defense
  ('submodule','throwing-analysis','5tool-defense','Throwing Analysis','Mechanics + arm load.','Video','throwing-analysis',1),
  ('submodule','drill-library-def','5tool-defense','Drill Library','Position-aware drills.','Library','drill-library',2),
  ('submodule','pickoff-trainer','5tool-defense','Pick-off Trainer','Randomized signal reps.','Target','pickoff-trainer',3),

  -- 5tool / player-care
  ('submodule','nutrition','5tool-player-care','Nutrition Hub','Performance-grade fueling.','Apple','nutrition',1),
  ('submodule','regulation','5tool-player-care','Regulation','Daily readiness 0–100.','Activity','regulation',2),
  ('submodule','vault-care','5tool-player-care','Vault','Your private journal.','Lock','vault',3),

  -- pitcher / arsenal
  ('submodule','pitching-analysis','pitcher-arsenal','Pitching Analysis','Mechanics breakdown.','Video','pitching-analysis',1),
  ('submodule','pitch-design','pitcher-arsenal','Pitch Design','Build new offerings.','Settings','pitch-design',2),
  ('submodule','bullpen-planner','pitcher-arsenal','Bullpen Planner','Periodized pen days.','Calendar','bullpen-planner',3),

  -- pitcher / command
  ('submodule','command-grid','pitcher-command','Command Grid','Locate every pitch.','Grid','command-grid',1),
  ('submodule','royal-timing-pit','pitcher-command','Royal Timing','Tempo audit.','Clock','royal-timing',2),

  -- pitcher / conditioning
  ('submodule','heat-factory','pitcher-conditioning','Heat Factory','Full-body strength.','Flame','heat-factory',1),
  ('submodule','explosive-cond','pitcher-conditioning','Explosive Conditioning','CNS-aware.','Zap','explosive-conditioning',2),

  -- pitcher / recovery
  ('submodule','regulation-pit','pitcher-recovery','Regulation','Readiness index.','Activity','regulation',1),
  ('submodule','vault-pit','pitcher-recovery','Vault','Track your arm health.','Lock','vault',2),

  -- golden2way
  ('submodule','unicorn-engine','golden2way-unicorn','Unicorn Engine','Two-way 24-week program.','Crown','unicorn-engine',1),
  ('submodule','merged-builder','golden2way-unicorn','Merged Block Builder','Hit + pitch in one block.','Layers','hammer-block-builder',2),
  ('submodule','g2w-hitting-analysis','golden2way-hitting','Hitting Analysis','Swing breakdown.','Video','hitting-analysis',1),
  ('submodule','g2w-iron-bambino','golden2way-hitting','Iron Bambino','Power progression.','Dumbbell','iron-bambino',2),
  ('submodule','g2w-pitching-analysis','golden2way-pitching','Pitching Analysis','Mechanics breakdown.','Video','pitching-analysis',1),
  ('submodule','g2w-heat-factory','golden2way-pitching','Heat Factory','Strength for arms.','Flame','heat-factory',2),
  ('submodule','g2w-speed-lab','golden2way-speed','Speed Lab','Sprint analytics.','Zap','speed-lab',1),
  ('submodule','g2w-throwing','golden2way-defense','Throwing Analysis','Arm mechanics.','Video','throwing-analysis',1),
  ('submodule','g2w-nutrition','golden2way-care','Nutrition Hub','Fuel for two-way load.','Apple','nutrition',1),
  ('submodule','g2w-regulation','golden2way-care','Regulation','Daily readiness.','Activity','regulation',2);
