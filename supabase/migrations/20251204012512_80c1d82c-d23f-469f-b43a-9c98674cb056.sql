-- Create injury library table (master list of injuries)
CREATE TABLE public.injury_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  body_area TEXT NOT NULL,
  sport_relevance TEXT[] DEFAULT ARRAY['baseball', 'softball']::TEXT[],
  severity_range TEXT NOT NULL DEFAULT 'Grade I-III',
  description TEXT NOT NULL,
  symptoms TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  typical_timeline TEXT,
  impact_on_performance TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create injury education content table
CREATE TABLE public.injury_education_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  injury_id UUID REFERENCES public.injury_library(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,
  content_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  sport TEXT DEFAULT 'both',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user injury progress table
CREATE TABLE public.user_injury_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  total_sections_viewed INTEGER NOT NULL DEFAULT 0,
  badges_earned TEXT[] DEFAULT ARRAY[]::TEXT[],
  last_visit_date DATE,
  sections_completed TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.injury_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injury_education_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_injury_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for injury_library (public read for authenticated users)
CREATE POLICY "Authenticated users can view injury library"
ON public.injury_library FOR SELECT
USING (auth.uid() IS NOT NULL);

-- RLS policies for injury_education_content (public read for authenticated users)
CREATE POLICY "Authenticated users can view injury content"
ON public.injury_education_content FOR SELECT
USING (auth.uid() IS NOT NULL);

-- RLS policies for user_injury_progress
CREATE POLICY "Users can view their own progress"
ON public.user_injury_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
ON public.user_injury_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
ON public.user_injury_progress FOR UPDATE
USING (auth.uid() = user_id);

-- Seed initial injury library with common baseball/softball injuries
INSERT INTO public.injury_library (name, body_area, sport_relevance, severity_range, description, symptoms, typical_timeline, impact_on_performance) VALUES
('Rotator Cuff Strain', 'Shoulder', ARRAY['baseball', 'softball'], 'Grade I-III', 'Injury to the muscles and tendons that stabilize the shoulder joint, common in throwing athletes.', ARRAY['Shoulder pain during throwing', 'Weakness in arm', 'Pain at night', 'Decreased range of motion'], '2-12 weeks depending on severity', 'Significantly impacts throwing velocity and accuracy'),
('UCL Sprain (Tommy John)', 'Elbow', ARRAY['baseball', 'softball'], 'Grade I-III', 'Injury to the ulnar collateral ligament on the inner elbow, often from repetitive throwing stress.', ARRAY['Inner elbow pain', 'Pop sensation during throw', 'Decreased velocity', 'Numbness in fingers'], '6-18 months for surgical cases', 'May require surgical intervention for complete tears'),
('Hamstring Strain', 'Leg', ARRAY['baseball', 'softball'], 'Grade I-III', 'Tear or strain of the hamstring muscles at the back of the thigh, common during sprinting.', ARRAY['Sudden sharp pain', 'Popping sensation', 'Swelling', 'Difficulty walking'], '1-8 weeks depending on grade', 'Affects running speed and base running'),
('Ankle Sprain', 'Ankle', ARRAY['baseball', 'softball'], 'Grade I-III', 'Stretching or tearing of ligaments around the ankle, often from awkward landings or direction changes.', ARRAY['Pain and swelling', 'Bruising', 'Instability', 'Difficulty bearing weight'], '1-6 weeks depending on severity', 'Impacts mobility and fielding'),
('Lower Back Strain', 'Back', ARRAY['baseball', 'softball'], 'Grade I-III', 'Injury to muscles or ligaments in the lower back from rotational forces during batting or throwing.', ARRAY['Localized back pain', 'Muscle spasms', 'Stiffness', 'Pain with rotation'], '2-6 weeks typically', 'Affects batting power and throwing mechanics'),
('Labrum Tear (SLAP)', 'Shoulder', ARRAY['baseball', 'softball'], 'Grade I-IV', 'Tear of the cartilage ring (labrum) that surrounds the shoulder socket.', ARRAY['Deep shoulder pain', 'Catching or clicking', 'Decreased throwing velocity', 'Pain with overhead motion'], '3-6 months, may require surgery', 'Significant impact on throwing athletes'),
('Tennis Elbow (Lateral Epicondylitis)', 'Elbow', ARRAY['baseball', 'softball'], 'Mild-Severe', 'Inflammation of tendons on the outer elbow from repetitive gripping and wrist extension.', ARRAY['Outer elbow pain', 'Weak grip strength', 'Pain with lifting', 'Morning stiffness'], '6 weeks - 6 months', 'Affects grip strength and bat control'),
('Plantar Fasciitis', 'Foot', ARRAY['baseball', 'softball'], 'Mild-Severe', 'Inflammation of the tissue connecting the heel to the toes, common from running and standing.', ARRAY['Heel pain in morning', 'Pain after standing', 'Tenderness on sole', 'Stiffness'], '6-12 months for full resolution', 'Impacts running and standing endurance');