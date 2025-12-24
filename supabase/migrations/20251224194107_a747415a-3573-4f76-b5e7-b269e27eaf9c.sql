-- Add new columns to custom_activity_templates for card customization and reminders
ALTER TABLE public.custom_activity_templates 
ADD COLUMN IF NOT EXISTS reminder_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_time time DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS display_nickname text,
ADD COLUMN IF NOT EXISTS custom_logo_url text,
ADD COLUMN IF NOT EXISTS embedded_running_sessions jsonb;

-- Create shared_activity_templates table for template sharing
CREATE TABLE IF NOT EXISTS public.shared_activity_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.custom_activity_templates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  share_code text UNIQUE NOT NULL,
  is_public boolean DEFAULT true,
  expires_at timestamp with time zone,
  view_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.shared_activity_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own shared templates" ON public.shared_activity_templates
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shared templates" ON public.shared_activity_templates
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shared templates" ON public.shared_activity_templates
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shared templates" ON public.shared_activity_templates
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public shared templates" ON public.shared_activity_templates
FOR SELECT USING (is_public = true);

-- Create hydration_settings table
CREATE TABLE IF NOT EXISTS public.hydration_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  enabled boolean DEFAULT true,
  daily_goal_oz integer DEFAULT 100,
  reminder_interval_minutes integer DEFAULT 60,
  start_time time DEFAULT '07:00:00',
  end_time time DEFAULT '21:00:00',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.hydration_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own hydration settings" ON public.hydration_settings
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own hydration settings" ON public.hydration_settings
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own hydration settings" ON public.hydration_settings
FOR UPDATE USING (auth.uid() = user_id);

-- Create hydration_logs table
CREATE TABLE IF NOT EXISTS public.hydration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  log_date date DEFAULT CURRENT_DATE,
  amount_oz numeric NOT NULL,
  logged_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.hydration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own hydration logs" ON public.hydration_logs
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own hydration logs" ON public.hydration_logs
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own hydration logs" ON public.hydration_logs
FOR DELETE USING (auth.uid() = user_id);

-- Create running_presets table
CREATE TABLE IF NOT EXISTS public.running_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL, -- 'intervals', 'tempo', 'recovery', 'distance', 'speed'
  preset_data jsonb NOT NULL DEFAULT '{}',
  difficulty text DEFAULT 'intermediate',
  estimated_duration_minutes integer,
  is_system boolean DEFAULT false,
  user_id uuid, -- null for system presets
  sport text DEFAULT 'both',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.running_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view system presets" ON public.running_presets
FOR SELECT USING (is_system = true);

CREATE POLICY "Users can view own presets" ON public.running_presets
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own presets" ON public.running_presets
FOR INSERT WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can update own presets" ON public.running_presets
FOR UPDATE USING (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can delete own presets" ON public.running_presets
FOR DELETE USING (auth.uid() = user_id AND is_system = false);

-- Insert system running presets
INSERT INTO public.running_presets (name, description, category, preset_data, difficulty, estimated_duration_minutes, is_system, sport) VALUES
('400m Repeats', 'Classic speed workout with 400m intervals', 'intervals', '{"sessions":[{"distance_value":400,"distance_unit":"meters","time_goal":"1:30","pace_goal":"Fast"}],"rest_between":"90 seconds","repetitions":8}', 'intermediate', 45, true, 'both'),
('800m Repeats', 'Middle-distance interval training', 'intervals', '{"sessions":[{"distance_value":800,"distance_unit":"meters","time_goal":"3:00","pace_goal":"Hard"}],"rest_between":"2 minutes","repetitions":6}', 'advanced', 50, true, 'both'),
('Ladder Workout', 'Progressive distance intervals: 200-400-800-400-200m', 'intervals', '{"sessions":[{"distance_value":200,"distance_unit":"meters"},{"distance_value":400,"distance_unit":"meters"},{"distance_value":800,"distance_unit":"meters"},{"distance_value":400,"distance_unit":"meters"},{"distance_value":200,"distance_unit":"meters"}],"rest_between":"Equal to work time"}', 'advanced', 40, true, 'both'),
('Classic Tempo', '20-minute steady state at threshold pace', 'tempo', '{"sessions":[{"distance_value":3,"distance_unit":"miles","pace_goal":"Comfortably hard"}],"warmup":"1 mile easy","cooldown":"1 mile easy"}', 'intermediate', 45, true, 'both'),
('Progressive Tempo', 'Build from moderate to threshold pace', 'tempo', '{"sessions":[{"distance_value":4,"distance_unit":"miles","pace_goal":"Start easy, finish hard"}],"notes":"Each mile slightly faster than the last"}', 'intermediate', 40, true, 'both'),
('Easy Recovery', 'Low-intensity recovery jog', 'recovery', '{"sessions":[{"distance_value":2,"distance_unit":"miles","pace_goal":"Very easy, conversational"}],"notes":"Focus on active recovery"}', 'beginner', 25, true, 'both'),
('Shake-out Run', 'Short and easy pre-game/race run', 'recovery', '{"sessions":[{"distance_value":1.5,"distance_unit":"miles","pace_goal":"Easy"}],"notes":"Keep it light and loose"}', 'beginner', 15, true, 'both'),
('Long Slow Distance', 'Aerobic base building run', 'distance', '{"sessions":[{"distance_value":8,"distance_unit":"miles","pace_goal":"Easy, conversational"}],"notes":"Build endurance without intensity"}', 'intermediate', 75, true, 'both'),
('Fartlek', 'Unstructured speed play', 'speed', '{"sessions":[{"distance_value":4,"distance_unit":"miles","pace_goal":"Varied"}],"notes":"Alternate between fast and easy based on feel"}', 'intermediate', 35, true, 'both'),
('Hill Sprints', 'Power-building hill repeats', 'speed', '{"sessions":[{"distance_value":100,"distance_unit":"meters","pace_goal":"All-out"}],"rest_between":"Walk back down","repetitions":10,"notes":"Find a steep hill, sprint up"}', 'advanced', 30, true, 'both')
ON CONFLICT DO NOTHING;