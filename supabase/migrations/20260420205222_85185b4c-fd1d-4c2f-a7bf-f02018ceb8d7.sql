-- =========================================
-- ENUMS
-- =========================================
DO $$ BEGIN
  CREATE TYPE public.video_type_enum AS ENUM (
    'drill','game_at_bat','practice_rep','breakdown','slow_motion','pov','comparison'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.skill_domain_enum AS ENUM (
    'hitting','fielding','throwing','base_running','pitching'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.video_tag_layer_enum AS ENUM (
    'movement_pattern','result','context','correction'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================
-- EXTEND library_videos
-- =========================================
ALTER TABLE public.library_videos
  ADD COLUMN IF NOT EXISTS video_format public.video_type_enum,
  ADD COLUMN IF NOT EXISTS skill_domains public.skill_domain_enum[] DEFAULT '{}'::public.skill_domain_enum[],
  ADD COLUMN IF NOT EXISTS ai_description text;

-- =========================================
-- TAXONOMY
-- =========================================
CREATE TABLE IF NOT EXISTS public.video_tag_taxonomy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  layer public.video_tag_layer_enum NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  skill_domain public.skill_domain_enum NOT NULL,
  description text,
  created_by uuid,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (layer, key, skill_domain)
);
CREATE INDEX IF NOT EXISTS idx_vtt_layer_domain ON public.video_tag_taxonomy(layer, skill_domain) WHERE active;

ALTER TABLE public.video_tag_taxonomy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Taxonomy readable by all" ON public.video_tag_taxonomy;
CREATE POLICY "Taxonomy readable by all" ON public.video_tag_taxonomy
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owner manages taxonomy" ON public.video_tag_taxonomy;
CREATE POLICY "Owner manages taxonomy" ON public.video_tag_taxonomy
  FOR ALL USING (public.has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role));

DROP TRIGGER IF EXISTS trg_vtt_updated_at ON public.video_tag_taxonomy;
CREATE TRIGGER trg_vtt_updated_at BEFORE UPDATE ON public.video_tag_taxonomy
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- ASSIGNMENTS (video <-> tag)
-- =========================================
CREATE TABLE IF NOT EXISTS public.video_tag_assignments (
  video_id uuid NOT NULL REFERENCES public.library_videos(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.video_tag_taxonomy(id) ON DELETE CASCADE,
  weight smallint NOT NULL DEFAULT 1 CHECK (weight BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (video_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_vta_tag ON public.video_tag_assignments(tag_id);

ALTER TABLE public.video_tag_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Assignments readable by all" ON public.video_tag_assignments;
CREATE POLICY "Assignments readable by all" ON public.video_tag_assignments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Video owner manages assignments" ON public.video_tag_assignments;
CREATE POLICY "Video owner manages assignments" ON public.video_tag_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.library_videos lv WHERE lv.id = video_id AND lv.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.library_videos lv WHERE lv.id = video_id AND lv.owner_id = auth.uid())
  );

-- =========================================
-- RULES
-- =========================================
CREATE TABLE IF NOT EXISTS public.video_tag_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_domain public.skill_domain_enum NOT NULL,
  movement_key text NOT NULL,
  result_key text,
  context_key text,
  correction_key text NOT NULL,
  strength smallint NOT NULL DEFAULT 5 CHECK (strength BETWEEN 1 AND 10),
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vtr_lookup ON public.video_tag_rules(skill_domain, movement_key) WHERE active;

ALTER TABLE public.video_tag_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Rules readable by all" ON public.video_tag_rules;
CREATE POLICY "Rules readable by all" ON public.video_tag_rules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owner manages rules" ON public.video_tag_rules;
CREATE POLICY "Owner manages rules" ON public.video_tag_rules
  FOR ALL USING (public.has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role));

DROP TRIGGER IF EXISTS trg_vtr_updated_at ON public.video_tag_rules;
CREATE TRIGGER trg_vtr_updated_at BEFORE UPDATE ON public.video_tag_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- PERFORMANCE METRICS
-- =========================================
CREATE TABLE IF NOT EXISTS public.video_performance_metrics (
  video_id uuid PRIMARY KEY REFERENCES public.library_videos(id) ON DELETE CASCADE,
  suggestion_count integer NOT NULL DEFAULT 0,
  watch_count integer NOT NULL DEFAULT 0,
  total_watch_seconds bigint NOT NULL DEFAULT 0,
  post_view_improvement_sum numeric NOT NULL DEFAULT 0,
  post_view_improvement_n integer NOT NULL DEFAULT 0,
  last_recomputed_at timestamptz
);

ALTER TABLE public.video_performance_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Metrics readable by all" ON public.video_performance_metrics;
CREATE POLICY "Metrics readable by all" ON public.video_performance_metrics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owner manages metrics" ON public.video_performance_metrics;
CREATE POLICY "Owner manages metrics" ON public.video_performance_metrics
  FOR ALL USING (public.has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role));

-- =========================================
-- USER OUTCOMES
-- =========================================
CREATE TABLE IF NOT EXISTS public.video_user_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid NOT NULL REFERENCES public.library_videos(id) ON DELETE CASCADE,
  suggested_at timestamptz NOT NULL DEFAULT now(),
  watched_at timestamptz,
  watch_seconds integer,
  suggestion_reason jsonb,
  post_score_delta numeric,
  mode text CHECK (mode IN ('immediate','session','long_term')),
  skill_domain public.skill_domain_enum,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vuo_user ON public.video_user_outcomes(user_id, video_id);
CREATE INDEX IF NOT EXISTS idx_vuo_watched ON public.video_user_outcomes(watched_at) WHERE watched_at IS NOT NULL;

ALTER TABLE public.video_user_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User reads own outcomes" ON public.video_user_outcomes;
CREATE POLICY "User reads own outcomes" ON public.video_user_outcomes
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "User writes own outcomes" ON public.video_user_outcomes;
CREATE POLICY "User writes own outcomes" ON public.video_user_outcomes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "User updates own outcomes" ON public.video_user_outcomes;
CREATE POLICY "User updates own outcomes" ON public.video_user_outcomes
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'owner'::app_role));

-- =========================================
-- SEED TAXONOMY
-- =========================================
INSERT INTO public.video_tag_taxonomy (layer, key, label, skill_domain, description) VALUES
-- HITTING — movement_pattern
('movement_pattern','hands_forward_early','Hands drifting forward early','hitting',NULL),
('movement_pattern','elbow_disconnect','Back elbow disconnect','hitting',NULL),
('movement_pattern','late_barrel','Late barrel delivery','hitting',NULL),
('movement_pattern','early_extension','Early extension','hitting',NULL),
('movement_pattern','steep_attack_angle','Steep attack angle','hitting',NULL),
('movement_pattern','flat_path','Flat bat path','hitting',NULL),
('movement_pattern','over_rotation','Over rotation','hitting',NULL),
('movement_pattern','under_rotation','Under rotation','hitting',NULL),
('movement_pattern','head_pull_off','Head pulling off','hitting',NULL),
('movement_pattern','weight_stuck_back','Weight stuck back','hitting',NULL),
('movement_pattern','weight_leak_forward','Weight leaking forward','hitting',NULL),
-- HITTING — result
('result','roll_over_contact','Roll-over contact','hitting',NULL),
('result','weak_contact','Weak contact','hitting',NULL),
('result','jam_shot','Jam shot','hitting',NULL),
('result','pop_up','Pop up','hitting',NULL),
('result','hard_line_drive','Hard line drive','hitting',NULL),
('result','barrel','Barreled ball','hitting',NULL),
('result','opposite_field_flare','Opposite-field flare','hitting',NULL),
('result','ground_ball_middle','Ground ball up the middle','hitting',NULL),
('result','missed_pitch','Missed pitch','hitting',NULL),
-- HITTING — context
('context','two_strike','Two-strike count','hitting',NULL),
('context','risp','Runners in scoring position','hitting',NULL),
('context','high_velocity','High velocity','hitting',NULL),
('context','breaking_ball','Breaking ball','hitting',NULL),
('context','inside_pitch','Inside pitch','hitting',NULL),
('context','outside_pitch','Outside pitch','hitting',NULL),
('context','high_pitch','High pitch','hitting',NULL),
('context','low_pitch','Low pitch','hitting',NULL),
('context','game_pressure','Game pressure','hitting',NULL),
('context','fatigue_state','Fatigue state','hitting',NULL),
-- HITTING — correction
('correction','keep_hands_back','Keep hands back','hitting',NULL),
('correction','barrel_stays_behind_hands','Barrel stays behind hands','hitting',NULL),
('correction','stay_through_ball','Stay through the ball','hitting',NULL),
('correction','match_plane_early','Match the plane early','hitting',NULL),
('correction','improve_adjustability','Improve adjustability','hitting',NULL),
('correction','maintain_posture','Maintain posture','hitting',NULL),
('correction','direction_through_contact','Direction through contact','hitting',NULL),
('correction','barrel_control','Barrel control','hitting',NULL),
-- FIELDING
('movement_pattern','slow_first_step','Slow first step','fielding',NULL),
('movement_pattern','glove_drift','Glove drift','fielding',NULL),
('movement_pattern','poor_footwork_angle','Poor footwork angle','fielding',NULL),
('movement_pattern','late_exchange','Late exchange','fielding',NULL),
('movement_pattern','arm_lag','Arm lag','fielding',NULL),
('result','booted_ball','Booted ball','fielding',NULL),
('result','late_throw','Late throw','fielding',NULL),
('result','offline_throw','Offline throw','fielding',NULL),
('result','double_clutch','Double clutch','fielding',NULL),
('correction','reaction_drills','Reaction drills','fielding',NULL),
('correction','first_step_quickness','First-step quickness','fielding',NULL),
('correction','clean_glove_path','Clean glove path','fielding',NULL),
('correction','quick_exchange','Quick exchange','fielding',NULL),
-- THROWING
('movement_pattern','arm_lag','Arm lag','throwing',NULL),
('movement_pattern','short_arm','Short arm action','throwing',NULL),
('correction','clean_arm_path','Clean arm path','throwing',NULL),
-- BASE RUNNING
('movement_pattern','slow_first_step','Slow first step','base_running',NULL),
('correction','first_step_quickness','First-step quickness','base_running',NULL),
-- PITCHING
('movement_pattern','early_extension','Early extension','pitching',NULL),
('movement_pattern','arm_lag','Arm lag','pitching',NULL),
('correction','maintain_posture','Maintain posture','pitching',NULL),
('correction','clean_arm_path','Clean arm path','pitching',NULL)
ON CONFLICT (layer, key, skill_domain) DO NOTHING;

-- =========================================
-- SEED RULES
-- =========================================
INSERT INTO public.video_tag_rules (skill_domain, movement_key, result_key, context_key, correction_key, strength, notes) VALUES
('hitting','hands_forward_early','roll_over_contact',NULL,'keep_hands_back',8,'Classic roll-over fix'),
('hitting','hands_forward_early','roll_over_contact',NULL,'barrel_stays_behind_hands',7,NULL),
('hitting','head_pull_off','weak_contact',NULL,'stay_through_ball',7,NULL),
('hitting','steep_attack_angle','pop_up',NULL,'match_plane_early',7,NULL),
('hitting','early_extension',NULL,NULL,'maintain_posture',6,NULL),
('hitting','over_rotation',NULL,NULL,'direction_through_contact',6,NULL),
('fielding','slow_first_step',NULL,NULL,'reaction_drills',8,NULL),
('fielding','slow_first_step',NULL,NULL,'first_step_quickness',8,NULL),
('fielding','glove_drift','booted_ball',NULL,'clean_glove_path',7,NULL),
('fielding','late_exchange','late_throw',NULL,'quick_exchange',7,NULL),
('throwing','arm_lag',NULL,NULL,'clean_arm_path',7,NULL),
('pitching','early_extension',NULL,NULL,'maintain_posture',7,NULL)
ON CONFLICT DO NOTHING;