ALTER TABLE public.mastery_identity_settings ADD COLUMN IF NOT EXISTS pitching_standards jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.gp_games
 ADD COLUMN IF NOT EXISTS pitcher_outs integer, ADD COLUMN IF NOT EXISTS pitcher_hits integer, ADD COLUMN IF NOT EXISTS pitcher_runs integer,
 ADD COLUMN IF NOT EXISTS pitcher_earned_runs integer, ADD COLUMN IF NOT EXISTS pitcher_innings integer, ADD COLUMN IF NOT EXISTS pitcher_scoring_pos_innings integer,
 ADD COLUMN IF NOT EXISTS pitcher_risp_runners integer, ADD COLUMN IF NOT EXISTS pitcher_runners_on integer, ADD COLUMN IF NOT EXISTS pitcher_runners_stranded integer,
 ADD COLUMN IF NOT EXISTS pitcher_sb_allowed integer, ADD COLUMN IF NOT EXISTS pitcher_steal_attempts integer, ADD COLUMN IF NOT EXISTS pitcher_pickoffs integer,
 ADD COLUMN IF NOT EXISTS pitcher_pickoff_attempts integer, ADD COLUMN IF NOT EXISTS pitcher_time_to_plate_sec numeric[],
 ADD COLUMN IF NOT EXISTS pitcher_pfp_chances integer, ADD COLUMN IF NOT EXISTS pitcher_pfp_errors integer;
ALTER TABLE public.gp_pitches ADD COLUMN IF NOT EXISTS exit_velo numeric;
CREATE TABLE public.practice_swing_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, sport text NOT NULL CHECK (sport IN ('baseball','softball')),
 practice_date date NOT NULL DEFAULT current_date,
 practice_type text NOT NULL CHECK (practice_type IN ('tee','soft_toss','front_toss','coach_bp','machine','live_bp','live_ab')),
 pitch_mph numeric CHECK (pitch_mph IS NULL OR pitch_mph > 0), release_ft numeric CHECK (release_ft IS NULL OR release_ft > 0),
 pitch_mix text CHECK (pitch_mix IS NULL OR pitch_mix IN ('fastballs','mixed')),
 swings integer NOT NULL CHECK (swings >= 0), whiffs integer NOT NULL CHECK (whiffs >= 0 AND whiffs <= swings),
 created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_swing_logs TO authenticated;
GRANT ALL ON public.practice_swing_logs TO service_role;
ALTER TABLE public.practice_swing_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own practice swings" ON public.practice_swing_logs FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());