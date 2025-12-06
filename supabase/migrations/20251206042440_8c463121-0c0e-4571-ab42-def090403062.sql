
-- Create mind_fuel_lessons table for content library
CREATE TABLE public.mind_fuel_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  content_type TEXT NOT NULL,
  lesson_text TEXT NOT NULL,
  author TEXT,
  sport TEXT DEFAULT 'both',
  is_ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create mind_fuel_streaks table for user progress
CREATE TABLE public.mind_fuel_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_visit_date DATE,
  total_visits INTEGER NOT NULL DEFAULT 0,
  lessons_collected INTEGER NOT NULL DEFAULT 0,
  badges_earned TEXT[] DEFAULT ARRAY[]::TEXT[],
  categories_explored JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT mind_fuel_streaks_user_id_key UNIQUE (user_id)
);

-- Create user_viewed_lessons table for tracking
CREATE TABLE public.user_viewed_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.mind_fuel_lessons(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT user_viewed_lessons_unique UNIQUE (user_id, lesson_id)
);

-- Enable RLS on all tables
ALTER TABLE public.mind_fuel_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mind_fuel_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_viewed_lessons ENABLE ROW LEVEL SECURITY;

-- RLS policies for mind_fuel_lessons (read-only for authenticated users)
CREATE POLICY "Authenticated users can view lessons"
ON public.mind_fuel_lessons FOR SELECT
USING (auth.uid() IS NOT NULL);

-- RLS policies for mind_fuel_streaks
CREATE POLICY "Users can view their own streak"
ON public.mind_fuel_streaks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streak"
ON public.mind_fuel_streaks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streak"
ON public.mind_fuel_streaks FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for user_viewed_lessons
CREATE POLICY "Users can view their own viewed lessons"
ON public.user_viewed_lessons FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own viewed lessons"
ON public.user_viewed_lessons FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Service role policies for edge function operations
CREATE POLICY "Service role can insert lessons"
ON public.mind_fuel_lessons FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can insert streaks"
ON public.mind_fuel_streaks FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update streaks"
ON public.mind_fuel_streaks FOR UPDATE
USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_mind_fuel_streaks_updated_at
BEFORE UPDATE ON public.mind_fuel_streaks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial content library (500+ lessons across all categories)

-- Mental Mastery & High-Performance Psychology
INSERT INTO public.mind_fuel_lessons (category, subcategory, content_type, lesson_text, author, sport) VALUES
-- Staying Present
('mental_mastery', 'staying_present', 'quote', 'The present moment is the only moment available to us, and it is the door to all moments.', 'Thich Nhat Hanh', 'both'),
('mental_mastery', 'staying_present', 'mantra', 'Right here. Right now. This is my moment.', NULL, 'both'),
('mental_mastery', 'staying_present', 'lesson', 'Elite performers train their minds to stay in the present by focusing on one pitch, one play, one breath at a time. The past is already gone, the future hasn''t arrived—all you control is now.', NULL, 'both'),
('mental_mastery', 'staying_present', 'teaching', 'Before each at-bat or pitch, take one deep breath and say internally: "Be here now." This resets your nervous system and anchors you to the present moment.', NULL, 'both'),
('mental_mastery', 'staying_present', 'principle', 'Presence is power. When your mind wanders to outcomes, gently redirect it back to the task at hand. This is a skill that improves with practice.', NULL, 'both'),
('mental_mastery', 'staying_present', 'quote', 'Wherever you are, be all there.', 'Jim Elliot', 'both'),
('mental_mastery', 'staying_present', 'mantra', 'I am fully present. My focus is unbreakable.', NULL, 'both'),
('mental_mastery', 'staying_present', 'lesson', 'Your body can only be in one place at a time—your mind should follow. When you notice thoughts drifting to past failures or future worries, acknowledge them and return to your breath.', NULL, 'both'),

-- Process Over Outcome
('mental_mastery', 'process_over_outcome', 'quote', 'The score takes care of itself when you take care of the process.', 'Bill Walsh', 'both'),
('mental_mastery', 'process_over_outcome', 'lesson', 'Champions fall in love with the process, not the prize. Every practice, every rep, every moment of preparation is the real victory.', NULL, 'both'),
('mental_mastery', 'process_over_outcome', 'mantra', 'Trust the process. The results will follow.', NULL, 'both'),
('mental_mastery', 'process_over_outcome', 'teaching', 'Write down your process goals—not outcome goals. Instead of "I want to bat .300," focus on "I will take quality swings in every at-bat."', NULL, 'baseball'),
('mental_mastery', 'process_over_outcome', 'teaching', 'Write down your process goals—not outcome goals. Instead of "I want to hit .400," focus on "I will see the ball deep and drive it with intent in every at-bat."', NULL, 'softball'),
('mental_mastery', 'process_over_outcome', 'principle', 'Attachment to outcomes creates anxiety. Commitment to the process creates excellence. Focus on what you can control.', NULL, 'both'),
('mental_mastery', 'process_over_outcome', 'quote', 'Success is peace of mind in knowing you did your best.', 'John Wooden', 'both'),
('mental_mastery', 'process_over_outcome', 'lesson', 'When you detach from results and attach to effort, you unlock your highest potential. The scoreboard is a byproduct of your dedication to the process.', NULL, 'both'),

-- Visualization
('mental_mastery', 'visualization', 'lesson', 'Your brain cannot distinguish between a vividly imagined experience and a real one. Use this power—visualize success before you step into performance.', NULL, 'both'),
('mental_mastery', 'visualization', 'teaching', 'Spend 5 minutes before each game with eyes closed, seeing yourself execute perfectly. Feel the bat in your hands, hear the crowd, see the ball coming in slow motion.', NULL, 'baseball'),
('mental_mastery', 'visualization', 'teaching', 'Spend 5 minutes before each game with eyes closed, seeing yourself execute perfectly. Feel the ball leaving your hand with power and precision.', NULL, 'softball'),
('mental_mastery', 'visualization', 'quote', 'I never hit a shot, not even in practice, without having a very sharp, in-focus picture of it in my head.', 'Jack Nicklaus', 'both'),
('mental_mastery', 'visualization', 'mantra', 'I see it. I believe it. I achieve it.', NULL, 'both'),
('mental_mastery', 'visualization', 'principle', 'Visualization is mental rehearsal. The more detailed and emotionally connected your mental imagery, the more your body prepares for success.', NULL, 'both'),
('mental_mastery', 'visualization', 'lesson', 'Before sleep, replay your best performances in your mind. This encodes success patterns into your subconscious and builds unshakeable confidence.', NULL, 'both'),

-- Work Ethic
('mental_mastery', 'work_ethic', 'quote', 'Hard work beats talent when talent doesn''t work hard.', 'Tim Notke', 'both'),
('mental_mastery', 'work_ethic', 'lesson', 'The greatest athletes aren''t always the most talented—they''re the ones who refuse to be outworked. Your work ethic is the one thing completely within your control.', NULL, 'both'),
('mental_mastery', 'work_ethic', 'mantra', 'I will not be outworked. My effort is non-negotiable.', NULL, 'both'),
('mental_mastery', 'work_ethic', 'teaching', 'Every day, do something that your competition isn''t willing to do. Those extra swings, that additional film study, those early morning workouts—they compound into greatness.', NULL, 'both'),
('mental_mastery', 'work_ethic', 'quote', 'The only place where success comes before work is in the dictionary.', 'Vidal Sassoon', 'both'),
('mental_mastery', 'work_ethic', 'principle', 'Elite performers embrace the grind. They find joy in the struggle because they know growth lives in discomfort.', NULL, 'both'),
('mental_mastery', 'work_ethic', 'lesson', 'Your work ethic is your signature. It speaks when you''re not in the room and creates opportunities when none seem to exist.', NULL, 'both'),

-- Motivation & Focus
('mental_mastery', 'motivation_focus', 'lesson', 'Motivation is fleeting—discipline is forever. Build systems that don''t rely on how you feel, but on who you''re becoming.', NULL, 'both'),
('mental_mastery', 'motivation_focus', 'quote', 'The successful warrior is the average person with laser-like focus.', 'Bruce Lee', 'both'),
('mental_mastery', 'motivation_focus', 'mantra', 'My focus is my superpower. Nothing can break my concentration.', NULL, 'both'),
('mental_mastery', 'motivation_focus', 'teaching', 'Eliminate distractions ruthlessly. Put your phone away during training. Give 100% of your attention to the task at hand. Partial focus equals partial results.', NULL, 'both'),
('mental_mastery', 'motivation_focus', 'principle', 'Intensity without focus is just noise. Learn to channel your energy like a laser beam, not a floodlight.', NULL, 'both'),
('mental_mastery', 'motivation_focus', 'quote', 'Concentration is the secret of strength.', 'Ralph Waldo Emerson', 'both'),
('mental_mastery', 'motivation_focus', 'lesson', 'The ability to focus on demand is trainable. Start with short periods of intense concentration and gradually extend them. This is mental conditioning.', NULL, 'both'),

-- Clutch Mindset
('mental_mastery', 'clutch_mindset', 'quote', 'Pressure is a privilege. It only comes to those who earn it.', 'Billie Jean King', 'both'),
('mental_mastery', 'clutch_mindset', 'lesson', 'Clutch performers don''t feel less pressure—they''ve trained themselves to perform through it. They embrace big moments as opportunities, not threats.', NULL, 'both'),
('mental_mastery', 'clutch_mindset', 'mantra', 'I was made for this moment. Pressure is my fuel.', NULL, 'both'),
('mental_mastery', 'clutch_mindset', 'teaching', 'In clutch situations, slow everything down. Take a deep breath, narrow your focus to one simple task, and trust your training. You''ve done this a thousand times.', NULL, 'both'),
('mental_mastery', 'clutch_mindset', 'principle', 'Big-moment performers have a short memory. They don''t carry the weight of previous at-bats or pitches into the current moment.', NULL, 'both'),
('mental_mastery', 'clutch_mindset', 'quote', 'I want the ball. Give me the ball. I''m not afraid of any moment.', 'Michael Jordan', 'both'),
('mental_mastery', 'clutch_mindset', 'lesson', 'Reframe pressure as excitement. The physiological response is identical—your interpretation determines your performance.', NULL, 'both'),

-- Positive Self-Talk
('mental_mastery', 'positive_self_talk', 'lesson', 'The most important conversations you have are the ones with yourself. Speak to yourself like you would to your best friend—with encouragement, belief, and compassion.', NULL, 'both'),
('mental_mastery', 'positive_self_talk', 'mantra', 'I am capable. I am prepared. I am ready.', NULL, 'both'),
('mental_mastery', 'positive_self_talk', 'teaching', 'Create a personal power phrase for difficult moments. Something short and meaningful like "I''ve got this" or "Trust the training." Use it as your mental reset button.', NULL, 'both'),
('mental_mastery', 'positive_self_talk', 'quote', 'Whether you think you can or you think you can''t, you''re right.', 'Henry Ford', 'both'),
('mental_mastery', 'positive_self_talk', 'principle', 'Negative self-talk is a habit that can be broken. Catch yourself, interrupt the pattern, and replace it with constructive thoughts.', NULL, 'both'),
('mental_mastery', 'positive_self_talk', 'mantra', 'My inner voice is my biggest supporter, not my worst critic.', NULL, 'both'),
('mental_mastery', 'positive_self_talk', 'lesson', 'Words create reality. The story you tell yourself shapes your confidence, effort, and ultimately your results. Choose your words wisely.', NULL, 'both'),

-- Discipline Over Motivation
('mental_mastery', 'discipline_over_motivation', 'quote', 'We don''t rise to the level of our goals. We fall to the level of our systems.', 'James Clear', 'both'),
('mental_mastery', 'discipline_over_motivation', 'lesson', 'Motivation gets you started; discipline keeps you going. Build routines so strong that they don''t require willpower to execute.', NULL, 'both'),
('mental_mastery', 'discipline_over_motivation', 'mantra', 'I don''t wait to feel like it. I do it because I said I would.', NULL, 'both'),
('mental_mastery', 'discipline_over_motivation', 'teaching', 'Schedule your most important training activities. What gets scheduled gets done. Treat your development like a non-negotiable appointment.', NULL, 'both'),
('mental_mastery', 'discipline_over_motivation', 'principle', 'Discipline is freedom. It frees you from the tyranny of moods, excuses, and fluctuating emotions.', NULL, 'both'),
('mental_mastery', 'discipline_over_motivation', 'quote', 'Discipline is the bridge between goals and accomplishment.', 'Jim Rohn', 'both'),
('mental_mastery', 'discipline_over_motivation', 'lesson', 'Motivation is like a wave—it comes and goes. Discipline is like the ocean—constant and reliable. Be the ocean.', NULL, 'both'),

-- Unstoppable Habits
('mental_mastery', 'unstoppable_habits', 'lesson', 'Champions are not made in the big moments—they''re made in the countless small moments that build unshakeable habits.', NULL, 'both'),
('mental_mastery', 'unstoppable_habits', 'teaching', 'Stack new habits onto existing ones. After brushing your teeth, visualize for 2 minutes. After warming up, do your mental preparation routine. Habits chain together.', NULL, 'both'),
('mental_mastery', 'unstoppable_habits', 'quote', 'You will never change your life until you change something you do daily.', 'John C. Maxwell', 'both'),
('mental_mastery', 'unstoppable_habits', 'mantra', 'My habits define my destiny. I choose them wisely.', NULL, 'both'),
('mental_mastery', 'unstoppable_habits', 'principle', 'Small daily improvements compound into massive long-term gains. 1% better every day means you''re 37 times better after one year.', NULL, 'both'),
('mental_mastery', 'unstoppable_habits', 'lesson', 'Your habits are your autopilot. Program them with intention, and you''ll fly toward excellence without constant effort.', NULL, 'both'),

-- Dominating Journey
('mental_mastery', 'dominating_journey', 'lesson', 'Take ownership of your development. No coach, parent, or teammate is responsible for your growth—only you. Dominate your journey.', NULL, 'both'),
('mental_mastery', 'dominating_journey', 'mantra', 'I own my journey. I control my destiny. I dominate my thoughts.', NULL, 'both'),
('mental_mastery', 'dominating_journey', 'teaching', 'Every morning, remind yourself: "Today, I am in control." Take responsibility for your attitude, effort, and response to challenges.', NULL, 'both'),
('mental_mastery', 'dominating_journey', 'quote', 'The only person you are destined to become is the person you decide to be.', 'Ralph Waldo Emerson', 'both'),
('mental_mastery', 'dominating_journey', 'principle', 'Victims complain about circumstances. Champions create their circumstances. Which will you be?', NULL, 'both'),
('mental_mastery', 'dominating_journey', 'lesson', 'Your journey is yours alone. Stop comparing it to others. Focus on being better than you were yesterday.', NULL, 'both'),

-- Creating Reality
('mental_mastery', 'creating_reality', 'lesson', 'Your beliefs shape your reality. If you believe you can succeed, you act differently, train differently, and ultimately perform differently.', NULL, 'both'),
('mental_mastery', 'creating_reality', 'quote', 'The mind is everything. What you think, you become.', 'Buddha', 'both'),
('mental_mastery', 'creating_reality', 'mantra', 'I create my reality. My thoughts become my actions. My actions become my results.', NULL, 'both'),
('mental_mastery', 'creating_reality', 'teaching', 'Write down your vision for who you want to become. Read it every morning. This programming trains your subconscious to seek opportunities aligned with that vision.', NULL, 'both'),
('mental_mastery', 'creating_reality', 'principle', 'Expectation is a powerful force. What you expect, you tend to find. Expect excellence from yourself.', NULL, 'both'),
('mental_mastery', 'creating_reality', 'lesson', 'You are not a product of your circumstances—you are a product of your decisions. Every choice shapes your future.', NULL, 'both'),

-- Emotional Balance & Peace
-- Finding Peace
('emotional_balance', 'finding_peace', 'lesson', 'Peace is not the absence of pressure—it''s the presence of calm within the storm. Develop inner stillness that cannot be shaken by external events.', NULL, 'both'),
('emotional_balance', 'finding_peace', 'quote', 'Peace is not something you wish for. It''s something you make, something you do.', 'Robert Fulghum', 'both'),
('emotional_balance', 'finding_peace', 'mantra', 'I carry peace within me. No situation can steal my calm.', NULL, 'both'),
('emotional_balance', 'finding_peace', 'teaching', 'Create a pre-performance ritual that brings you to a state of calm alertness. This could be deep breathing, listening to specific music, or a brief meditation.', NULL, 'both'),
('emotional_balance', 'finding_peace', 'principle', 'Inner peace is a competitive advantage. When others are rattled, your calm becomes your power.', NULL, 'both'),
('emotional_balance', 'finding_peace', 'lesson', 'Find joy in the journey, not just the destination. Celebrate small wins and find moments of gratitude even in difficult seasons.', NULL, 'both'),

-- Overcoming Fear
('emotional_balance', 'overcoming_fear', 'lesson', 'Fear is not your enemy—it''s information. It tells you that something matters. Use it as fuel, not a barrier.', NULL, 'both'),
('emotional_balance', 'overcoming_fear', 'quote', 'Courage is not the absence of fear, but rather the judgment that something else is more important than fear.', 'Ambrose Redmoon', 'both'),
('emotional_balance', 'overcoming_fear', 'mantra', 'I face my fears. I grow through discomfort. I am braver than I know.', NULL, 'both'),
('emotional_balance', 'overcoming_fear', 'teaching', 'When fear arises, ask: "What''s the worst that could happen?" Then ask: "Can I handle that?" The answer is almost always yes.', NULL, 'both'),
('emotional_balance', 'overcoming_fear', 'principle', 'Fear of failure leads to failure. Fear of success leads to self-sabotage. Release both and play free.', NULL, 'both'),
('emotional_balance', 'overcoming_fear', 'lesson', 'Every elite performer has experienced fear. The difference is they act despite it. Action is the antidote to fear.', NULL, 'both'),
('emotional_balance', 'overcoming_fear', 'quote', 'Do one thing every day that scares you.', 'Eleanor Roosevelt', 'both'),

-- Neutral Mindset
('emotional_balance', 'neutral_mindset', 'lesson', 'The neutral mindset is the elite performer''s secret weapon. Don''t get too high after success or too low after failure. Stay even.', NULL, 'both'),
('emotional_balance', 'neutral_mindset', 'teaching', 'After each play, take a breath and reset to neutral. Whether it was a strikeout or a home run, the next at-bat deserves a fresh mind.', NULL, 'baseball'),
('emotional_balance', 'neutral_mindset', 'teaching', 'After each pitch or play, take a breath and reset to neutral. Whether it was a strikeout or a home run, the next moment deserves a fresh mind.', NULL, 'softball'),
('emotional_balance', 'neutral_mindset', 'mantra', 'Next play mentality. What just happened doesn''t define what''s next.', NULL, 'both'),
('emotional_balance', 'neutral_mindset', 'principle', 'Emotional stability creates performance consistency. Train yourself to respond, not react.', NULL, 'both'),
('emotional_balance', 'neutral_mindset', 'quote', 'The less you respond to negativity, the more peaceful your life becomes.', 'Unknown', 'both'),
('emotional_balance', 'neutral_mindset', 'lesson', 'Neutrality is not indifference—it''s intelligent emotional regulation. Care deeply, but don''t let emotions control your performance.', NULL, 'both'),

-- Breathing Techniques
('emotional_balance', 'breathing_techniques', 'teaching', 'Box breathing: Inhale for 4 counts, hold for 4 counts, exhale for 4 counts, hold for 4 counts. This activates your parasympathetic nervous system and reduces anxiety.', NULL, 'both'),
('emotional_balance', 'breathing_techniques', 'lesson', 'Your breath is the bridge between your conscious and unconscious mind. Control your breath, control your state.', NULL, 'both'),
('emotional_balance', 'breathing_techniques', 'teaching', 'Before stepping into the box or onto the mound, take one deep belly breath. This signals to your body that you''re safe and ready.', NULL, 'both'),
('emotional_balance', 'breathing_techniques', 'mantra', 'Breathe in confidence. Breathe out doubt.', NULL, 'both'),
('emotional_balance', 'breathing_techniques', 'principle', 'When pressure rises, breathing tends to become shallow. Consciously deepen your breath to maintain composure.', NULL, 'both'),
('emotional_balance', 'breathing_techniques', 'teaching', 'Try the 4-7-8 technique: Inhale for 4 counts, hold for 7 counts, exhale slowly for 8 counts. Use before bed to improve sleep quality.', NULL, 'both'),

-- Meditation Drills
('emotional_balance', 'meditation_drills', 'teaching', '60-second reset: Close your eyes, focus only on your breath, and let thoughts pass like clouds. Use between innings or during breaks.', NULL, 'both'),
('emotional_balance', 'meditation_drills', 'lesson', 'Meditation is not about stopping thoughts—it''s about observing them without attachment. This skill transfers directly to pressure situations.', NULL, 'both'),
('emotional_balance', 'meditation_drills', 'teaching', 'Body scan meditation: Mentally scan from head to toe, releasing tension in each area. Takes 2 minutes and creates full-body relaxation.', NULL, 'both'),
('emotional_balance', 'meditation_drills', 'principle', 'Just 5 minutes of daily meditation can significantly improve focus, emotional regulation, and performance under pressure.', NULL, 'both'),
('emotional_balance', 'meditation_drills', 'mantra', 'I quiet my mind. In stillness, I find strength.', NULL, 'both'),

-- Life Balance
('emotional_balance', 'life_balance', 'lesson', 'You are more than an athlete. Nurture relationships, hobbies, and interests outside of your sport. This creates a resilient identity.', NULL, 'both'),
('emotional_balance', 'life_balance', 'quote', 'The goal is not to be perfect by the end. The goal is to be better today.', 'Simon Sinek', 'both'),
('emotional_balance', 'life_balance', 'teaching', 'Schedule time for activities that have nothing to do with your sport. This prevents burnout and keeps your passion alive.', NULL, 'both'),
('emotional_balance', 'life_balance', 'principle', 'Joy fuels performance. If you lose the love of the game, your performance will suffer. Protect your passion.', NULL, 'both'),
('emotional_balance', 'life_balance', 'mantra', 'I am a whole person. My sport is part of me, not all of me.', NULL, 'both'),
('emotional_balance', 'life_balance', 'lesson', 'Find happiness independent of outcomes. Your worth is not defined by your batting average or ERA.', NULL, 'both'),

-- Slump Breaking
('emotional_balance', 'slump_breaking', 'lesson', 'Slumps are mental, not physical. Your skills haven''t vanished—your confidence has hidden them. Trust what you''ve built.', NULL, 'both'),
('emotional_balance', 'slump_breaking', 'teaching', 'During a slump, simplify everything. Focus on one basic fundamental and rebuild from there. Complexity creates confusion.', NULL, 'both'),
('emotional_balance', 'slump_breaking', 'mantra', 'This is temporary. My breakthrough is coming. I trust the process.', NULL, 'both'),
('emotional_balance', 'slump_breaking', 'quote', 'The comeback is always stronger than the setback.', 'Unknown', 'both'),
('emotional_balance', 'slump_breaking', 'principle', 'Pressing harder during a slump makes it worse. Loosen up, breathe, and let your natural ability emerge.', NULL, 'both'),
('emotional_balance', 'slump_breaking', 'lesson', 'Every great player has faced slumps. What separates them is how they respond. Stay positive, stay working, stay patient.', NULL, 'both'),

-- Leadership & Character Building
-- Sportsmanship
('leadership', 'sportsmanship', 'lesson', 'How you handle victory reveals your character. How you handle defeat reveals your soul. Excel at both.', NULL, 'both'),
('leadership', 'sportsmanship', 'quote', 'Sports do not build character. They reveal it.', 'Heywood Broun', 'both'),
('leadership', 'sportsmanship', 'mantra', 'I compete with honor. I win with humility. I lose with grace.', NULL, 'both'),
('leadership', 'sportsmanship', 'teaching', 'Shake hands with opponents after every game, win or lose. Respect the competition—they make you better.', NULL, 'both'),
('leadership', 'sportsmanship', 'principle', 'True sportsmanship means wanting to win, but not at the expense of your integrity. Play hard, play fair, play with class.', NULL, 'both'),
('leadership', 'sportsmanship', 'lesson', 'Your reputation is built one interaction at a time. Be the player others respect, not just for talent, but for character.', NULL, 'both'),

-- Leadership Lessons
('leadership', 'leadership_lessons', 'lesson', 'Leaders don''t wait to be appointed—they step up. Look for ways to serve your team before looking for recognition.', NULL, 'both'),
('leadership', 'leadership_lessons', 'quote', 'A leader is one who knows the way, goes the way, and shows the way.', 'John C. Maxwell', 'both'),
('leadership', 'leadership_lessons', 'mantra', 'I lead by example. My actions speak louder than my words.', NULL, 'both'),
('leadership', 'leadership_lessons', 'teaching', 'The best leaders make those around them better. Ask yourself: "How can I help my teammates succeed today?"', NULL, 'both'),
('leadership', 'leadership_lessons', 'principle', 'Leadership is influence, nothing more, nothing less. You don''t need a title to lead—you need impact.', NULL, 'both'),
('leadership', 'leadership_lessons', 'lesson', 'Leaders take responsibility when things go wrong and give credit when things go right. This builds trust and loyalty.', NULL, 'both'),
('leadership', 'leadership_lessons', 'quote', 'The greatest leader is not the one with the most followers, but the one who creates the most leaders.', 'Unknown', 'both'),

-- Accountability
('leadership', 'accountability', 'lesson', 'Excuses are the nails that build the house of failure. Take ownership of everything—your attitude, effort, and results.', NULL, 'both'),
('leadership', 'accountability', 'quote', 'It is not only what we do, but also what we do not do, for which we are accountable.', 'Molière', 'both'),
('leadership', 'accountability', 'mantra', 'I own my outcomes. No excuses. No blame. Only action.', NULL, 'both'),
('leadership', 'accountability', 'teaching', 'When you make a mistake, acknowledge it immediately, learn from it, and move forward. Hiding mistakes stunts growth.', NULL, 'both'),
('leadership', 'accountability', 'principle', 'Accountability is not punishment—it''s empowerment. When you own your actions, you control your destiny.', NULL, 'both'),
('leadership', 'accountability', 'lesson', 'Hold yourself to a higher standard than anyone else would hold you. Self-accountability is the foundation of excellence.', NULL, 'both'),

-- Support Team
('leadership', 'support_team', 'lesson', 'You become the average of the five people you spend the most time with. Choose your circle wisely.', NULL, 'both'),
('leadership', 'support_team', 'quote', 'Surround yourself with only people who are going to lift you higher.', 'Oprah Winfrey', 'both'),
('leadership', 'support_team', 'teaching', 'Identify your "board of directors"—coaches, mentors, family, and friends who support your growth. Invest in these relationships.', NULL, 'both'),
('leadership', 'support_team', 'mantra', 'I build a team around me that believes in me, even when I doubt myself.', NULL, 'both'),
('leadership', 'support_team', 'principle', 'Great achievements are never solo acts. Build a network of people who challenge you, encourage you, and hold you accountable.', NULL, 'both'),
('leadership', 'support_team', 'lesson', 'Support is a two-way street. Be the kind of friend and teammate you wish to have.', NULL, 'both'),

-- Encouragement
('leadership', 'encouragement', 'lesson', 'Your words have power. Use them to lift others up. A single word of encouragement can change someone''s entire day.', NULL, 'both'),
('leadership', 'encouragement', 'quote', 'Encouragement is oxygen to the soul.', 'George M. Adams', 'both'),
('leadership', 'encouragement', 'mantra', 'I uplift those around me. My energy is contagious.', NULL, 'both'),
('leadership', 'encouragement', 'teaching', 'Make it a habit to encourage at least one teammate during every practice and game. Be specific—tell them exactly what they''re doing well.', NULL, 'both'),
('leadership', 'encouragement', 'principle', 'Encouragement costs nothing but creates everything. It builds confidence, strengthens bonds, and elevates performance.', NULL, 'both'),
('leadership', 'encouragement', 'lesson', 'The best leaders are the best encouragers. They see potential in others before others see it in themselves.', NULL, 'both'),

-- Being Good Teammate
('leadership', 'being_good_teammate', 'lesson', 'Being a great teammate means showing up—physically, mentally, and emotionally—every single day, regardless of your role.', NULL, 'both'),
('leadership', 'being_good_teammate', 'teaching', 'Celebrate your teammates'' successes as if they were your own. Their wins are your wins. True teams think "we" not "me."', NULL, 'both'),
('leadership', 'being_good_teammate', 'mantra', 'I put the team first. My contribution matters, even when it''s invisible.', NULL, 'both'),
('leadership', 'being_good_teammate', 'quote', 'Talent wins games, but teamwork and intelligence win championships.', 'Michael Jordan', 'both'),
('leadership', 'being_good_teammate', 'principle', 'Good teammates make everyone around them better. They''re the glue that holds winning cultures together.', NULL, 'both'),
('leadership', 'being_good_teammate', 'lesson', 'Pick up your teammates when they fall. Cheer loudest when it''s not your moment. This is the essence of team.', NULL, 'both'),

-- Energy & Positivity
('leadership', 'energy_positivity', 'lesson', 'Energy is contagious. Be the spark that ignites your team, not the drain that depletes them.', NULL, 'both'),
('leadership', 'energy_positivity', 'mantra', 'I bring the energy. I set the tone. I lead with positivity.', NULL, 'both'),
('leadership', 'energy_positivity', 'teaching', 'Your body language speaks before you do. Walk with confidence, stand tall, and smile—even when you don''t feel like it.', NULL, 'both'),
('leadership', 'energy_positivity', 'quote', 'Your vibe attracts your tribe.', 'Unknown', 'both'),
('leadership', 'energy_positivity', 'principle', 'Positive energy is a choice, not a feeling. Choose it daily, especially when circumstances are difficult.', NULL, 'both'),
('leadership', 'energy_positivity', 'lesson', 'One person''s energy can shift an entire team''s momentum. Be that person who changes the game with your presence.', NULL, 'both'),

-- Negative Environments
('leadership', 'negative_environments', 'lesson', 'Recognize toxic environments early. Negativity spreads faster than positivity—protect your mental space.', NULL, 'both'),
('leadership', 'negative_environments', 'teaching', 'When negativity arises, don''t engage. Redirect conversations toward solutions or simply walk away.', NULL, 'both'),
('leadership', 'negative_environments', 'mantra', 'I don''t feed negativity. I starve it with silence and action.', NULL, 'both'),
('leadership', 'negative_environments', 'principle', 'You can''t control others, but you can control your exposure to them. Limit time with energy vampires.', NULL, 'both'),
('leadership', 'negative_environments', 'quote', 'Stay away from negative people. They have a problem for every solution.', 'Albert Einstein', 'both'),
('leadership', 'negative_environments', 'lesson', 'Sometimes the bravest thing is walking away from a situation that no longer serves your growth.', NULL, 'both'),

-- Damage Control
('leadership', 'damage_control', 'lesson', 'In-game awareness means recognizing when momentum is shifting and taking immediate action to stop the bleeding.', NULL, 'both'),
('leadership', 'damage_control', 'teaching', 'When things start going wrong, slow down. Call time, take a breath, gather your team, and reset. Panic accelerates failure.', NULL, 'both'),
('leadership', 'damage_control', 'mantra', 'I stay calm in chaos. I am the eye of the storm.', NULL, 'both'),
('leadership', 'damage_control', 'principle', 'Damage control starts with emotional regulation. You can''t fix a situation you''re panicking about.', NULL, 'both'),
('leadership', 'damage_control', 'lesson', 'The best competitors have short memories and quick resets. One bad inning doesn''t define a game. One bad game doesn''t define a season.', NULL, 'both'),

-- Conflict Resolution
('leadership', 'conflict_resolution', 'lesson', 'Conflict avoided today becomes a bigger problem tomorrow. Address issues directly, respectfully, and promptly.', NULL, 'both'),
('leadership', 'conflict_resolution', 'teaching', 'When addressing conflict, focus on behavior, not character. Say "When you did X, it affected Y" instead of "You are Z."', NULL, 'both'),
('leadership', 'conflict_resolution', 'mantra', 'I seek understanding before demanding to be understood.', NULL, 'both'),
('leadership', 'conflict_resolution', 'quote', 'The quality of our lives depends not on whether or not we have conflicts, but on how we respond to them.', 'Thomas Crum', 'both'),
('leadership', 'conflict_resolution', 'principle', 'The goal of conflict resolution isn''t winning—it''s understanding. Seek solutions that serve the team, not your ego.', NULL, 'both'),

-- Legacy Building
('leadership', 'legacy_building', 'lesson', 'Your legacy is not what you achieve—it''s what you leave behind in others. Build people, not just records.', NULL, 'both'),
('leadership', 'legacy_building', 'quote', 'A life is not important except in the impact it has on other lives.', 'Jackie Robinson', 'both'),
('leadership', 'legacy_building', 'mantra', 'I play for something bigger than myself. My impact outlasts my career.', NULL, 'both'),
('leadership', 'legacy_building', 'teaching', 'Think about how you want to be remembered. Then work backward to align your daily actions with that vision.', NULL, 'both'),
('leadership', 'legacy_building', 'principle', 'Legacy is built in the small moments—how you treat the equipment manager, how you respond to a loss, how you celebrate others'' wins.', NULL, 'both'),
('leadership', 'legacy_building', 'lesson', 'The greatest athletes are remembered not just for their stats, but for how they made people feel.', NULL, 'both'),

-- Helping Others
('leadership', 'helping_others', 'lesson', 'Selfless leadership is the highest form of leadership. Serve others, and you''ll find your own purpose amplified.', NULL, 'both'),
('leadership', 'helping_others', 'quote', 'No one has ever become poor by giving.', 'Anne Frank', 'both'),
('leadership', 'helping_others', 'mantra', 'My success is measured by how many people I help succeed.', NULL, 'both'),
('leadership', 'helping_others', 'teaching', 'Mentor younger players. Share your knowledge freely. This not only helps them—it deepens your own understanding.', NULL, 'both'),
('leadership', 'helping_others', 'principle', 'Helping others creates a ripple effect that extends far beyond what you can see. Your impact multiplies.', NULL, 'both'),

-- Silver Lining
('leadership', 'silver_lining', 'lesson', 'Every setback contains a setup for a comeback. Train yourself to find the lesson in every loss.', NULL, 'both'),
('leadership', 'silver_lining', 'quote', 'In the middle of difficulty lies opportunity.', 'Albert Einstein', 'both'),
('leadership', 'silver_lining', 'mantra', 'I find the gift in every challenge. Every obstacle is an opportunity.', NULL, 'both'),
('leadership', 'silver_lining', 'teaching', 'After every difficult experience, ask: "What can I learn from this? How did this make me stronger?"', NULL, 'both'),
('leadership', 'silver_lining', 'principle', 'Optimism is not blind positivity—it''s the disciplined practice of finding constructive meaning in all experiences.', NULL, 'both'),

-- Unshakeable Character
('leadership', 'unshakeable_character', 'lesson', 'Character is who you are when no one is watching. Build integrity in private, and it will shine in public.', NULL, 'both'),
('leadership', 'unshakeable_character', 'quote', 'Reputation is what men and women think of us; character is what God and angels know of us.', 'Thomas Paine', 'both'),
('leadership', 'unshakeable_character', 'mantra', 'My character is my foundation. It cannot be shaken.', NULL, 'both'),
('leadership', 'unshakeable_character', 'teaching', 'Define your core values. Write them down. Review them weekly. Let them guide every decision you make.', NULL, 'both'),
('leadership', 'unshakeable_character', 'principle', 'Skills can be taught, but character must be built. Invest in both—one creates talent, the other creates legacy.', NULL, 'both'),
('leadership', 'unshakeable_character', 'lesson', 'When faced with ethical dilemmas, choose the harder right over the easier wrong. Every time.', NULL, 'both'),

-- Life Mastery
-- Routines & Consistency
('life_mastery', 'routines_consistency', 'lesson', 'Consistency is the secret ingredient of mastery. What you do once means little; what you do every day changes everything.', NULL, 'both'),
('life_mastery', 'routines_consistency', 'quote', 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', 'Aristotle', 'both'),
('life_mastery', 'routines_consistency', 'mantra', 'My routines are my rituals. They prepare me for greatness.', NULL, 'both'),
('life_mastery', 'routines_consistency', 'teaching', 'Design a morning routine that sets you up for success. Include movement, mindset work, and a healthy meal within the first hour.', NULL, 'both'),
('life_mastery', 'routines_consistency', 'principle', 'Routines eliminate decision fatigue. When excellence becomes automatic, you free mental energy for peak performance.', NULL, 'both'),
('life_mastery', 'routines_consistency', 'lesson', 'The most successful athletes have iron-clad routines. They don''t hope for good days—they engineer them.', NULL, 'both'),

-- Discipline & Structure
('life_mastery', 'discipline_structure', 'lesson', 'Structure creates freedom. When your day has order, you maximize every minute and minimize wasted potential.', NULL, 'both'),
('life_mastery', 'discipline_structure', 'quote', 'Discipline is choosing between what you want now and what you want most.', 'Abraham Lincoln', 'both'),
('life_mastery', 'discipline_structure', 'mantra', 'I am disciplined in my actions. My structure supports my dreams.', NULL, 'both'),
('life_mastery', 'discipline_structure', 'teaching', 'Plan your week on Sunday. Block time for training, recovery, academics, and rest. Live by your calendar.', NULL, 'both'),
('life_mastery', 'discipline_structure', 'principle', 'Discipline is not restriction—it''s direction. It points your energy toward what matters most.', NULL, 'both'),

-- Cleanliness
('life_mastery', 'cleanliness', 'lesson', 'Your environment reflects your mind. A clean space creates clarity. An organized life creates focus.', NULL, 'both'),
('life_mastery', 'cleanliness', 'teaching', 'Make your bed every morning. This small act of discipline creates momentum for the rest of the day.', NULL, 'both'),
('life_mastery', 'cleanliness', 'mantra', 'I keep my space clean, my mind clear, and my intentions pure.', NULL, 'both'),
('life_mastery', 'cleanliness', 'quote', 'The objective of cleaning is not just to clean, but to feel happiness living within that environment.', 'Marie Kondo', 'both'),
('life_mastery', 'cleanliness', 'principle', 'Taking care of your equipment, your room, and your body shows self-respect. Respect breeds excellence.', NULL, 'both'),

-- Time Management
('life_mastery', 'time_management', 'lesson', 'Time is your most valuable asset. You can always make more money, but you can never make more time. Spend it wisely.', NULL, 'both'),
('life_mastery', 'time_management', 'quote', 'The bad news is time flies. The good news is you''re the pilot.', 'Michael Altshuler', 'both'),
('life_mastery', 'time_management', 'mantra', 'I protect my time like I protect my goals. Every minute matters.', NULL, 'both'),
('life_mastery', 'time_management', 'teaching', 'Use the 2-minute rule: If a task takes less than 2 minutes, do it immediately. This prevents small tasks from piling up.', NULL, 'both'),
('life_mastery', 'time_management', 'principle', 'Prioritize ruthlessly. Not everything matters equally. Focus on high-impact activities that move you toward your goals.', NULL, 'both'),

-- Life Outside Sports
('life_mastery', 'life_outside_sports', 'lesson', 'Your identity should be broader than your sport. Cultivate interests, relationships, and skills beyond the field.', NULL, 'both'),
('life_mastery', 'life_outside_sports', 'teaching', 'Develop a hobby completely unrelated to your sport. This provides mental relief and perspective.', NULL, 'both'),
('life_mastery', 'life_outside_sports', 'mantra', 'I am a whole person with many dimensions. My sport enhances my life, not limits it.', NULL, 'both'),
('life_mastery', 'life_outside_sports', 'principle', 'Athletes who have balanced lives perform better under pressure because their entire identity isn''t on the line.', NULL, 'both'),
('life_mastery', 'life_outside_sports', 'lesson', 'Invest in your education and relationships now. Your athletic career is temporary; your life continues beyond it.', NULL, 'both'),

-- Elite Habits
('life_mastery', 'elite_habits', 'lesson', 'Elite performers aren''t different in their actions—they''re different in their habits. Build the habits of champions.', NULL, 'both'),
('life_mastery', 'elite_habits', 'teaching', 'Identify one habit of someone you admire. Adopt it for 30 days. Small changes compound into massive transformations.', NULL, 'both'),
('life_mastery', 'elite_habits', 'quote', 'The chains of habit are too light to be felt until they are too heavy to be broken.', 'Warren Buffett', 'both'),
('life_mastery', 'elite_habits', 'mantra', 'My habits are the foundation of my success. I choose them with intention.', NULL, 'both'),
('life_mastery', 'elite_habits', 'principle', 'Habits are built through repetition. The more you repeat an action, the more automatic it becomes.', NULL, 'both'),
('life_mastery', 'elite_habits', 'lesson', 'Track your habits daily. What gets measured gets managed. What gets managed gets improved.', NULL, 'both'),

-- Taking Challenges
('life_mastery', 'taking_challenges', 'lesson', 'Challenges are opportunities in disguise. Embrace difficulty as the path to growth, not an obstacle to avoid.', NULL, 'both'),
('life_mastery', 'taking_challenges', 'quote', 'The only way to grow is to step outside your comfort zone.', 'Unknown', 'both'),
('life_mastery', 'taking_challenges', 'mantra', 'I welcome challenges. They forge my strength and reveal my potential.', NULL, 'both'),
('life_mastery', 'taking_challenges', 'teaching', 'Regularly take on tasks that intimidate you. This builds confidence muscle that transfers to competition.', NULL, 'both'),
('life_mastery', 'taking_challenges', 'principle', 'Comfort is the enemy of growth. Seek discomfort intentionally—that''s where transformation lives.', NULL, 'both'),

-- Finding Purpose
('life_mastery', 'finding_purpose', 'lesson', 'Purpose is your "why." When you know why you do what you do, the "how" becomes much easier.', NULL, 'both'),
('life_mastery', 'finding_purpose', 'quote', 'He who has a why to live for can bear almost any how.', 'Friedrich Nietzsche', 'both'),
('life_mastery', 'finding_purpose', 'mantra', 'I am driven by purpose, not just passion. My why fuels my discipline.', NULL, 'both'),
('life_mastery', 'finding_purpose', 'teaching', 'Write down why you play your sport. Go deeper than "I love it." Connect to something bigger than yourself.', NULL, 'both'),
('life_mastery', 'finding_purpose', 'principle', 'Purpose provides fuel when motivation runs dry. It''s the deeper reason that keeps you going.', NULL, 'both'),
('life_mastery', 'finding_purpose', 'lesson', 'Purpose is not found—it''s created. You choose what gives your life meaning through your commitments and actions.', NULL, 'both'),

-- Creating Standards
('life_mastery', 'creating_standards', 'lesson', 'Your standards determine your results. Raise your standards, and your performance will rise to meet them.', NULL, 'both'),
('life_mastery', 'creating_standards', 'quote', 'It''s not about how good you are. It''s about how good you want to be.', 'Paul Arden', 'both'),
('life_mastery', 'creating_standards', 'mantra', 'I set high standards and live by them. Excellence is my baseline.', NULL, 'both'),
('life_mastery', 'creating_standards', 'teaching', 'Write a personal code of conduct. Define what you will and won''t accept from yourself. Live by it daily.', NULL, 'both'),
('life_mastery', 'creating_standards', 'principle', 'Standards are commitments you make to yourself. They define who you are when no one is watching.', NULL, 'both'),
('life_mastery', 'creating_standards', 'lesson', 'Champions don''t lower their standards when things get hard. They adjust their effort to maintain them.', NULL, 'both'),

-- Acronyms and Standards
('life_mastery', 'creating_standards', 'acronym', 'M.A.P. = Mindset. Action. Purpose. The three pillars of elite performance.', NULL, 'both'),
('life_mastery', 'creating_standards', 'acronym', 'W.I.N. = What''s Important Now. The ultimate focus question for any moment.', NULL, 'both'),
('life_mastery', 'creating_standards', 'acronym', 'P.R.I.M.E. = Prepare. Refine. Inspire. Master. Execute. The path to peak performance.', NULL, 'both'),
('life_mastery', 'creating_standards', 'acronym', 'G.R.I.T. = Growth. Resilience. Intensity. Tenacity. The four pillars of mental toughness.', NULL, 'both'),
('life_mastery', 'creating_standards', 'acronym', 'F.O.C.U.S. = Follow One Course Until Successful. The key to achieving any goal.', NULL, 'both'),
('life_mastery', 'creating_standards', 'acronym', 'C.H.A.M.P. = Commitment. Humility. Accountability. Mental Toughness. Perseverance.', NULL, 'both'),
('life_mastery', 'creating_standards', 'acronym', 'E.L.I.T.E. = Effort. Learning. Intensity. Teamwork. Excellence. The code of champions.', NULL, 'both'),
('life_mastery', 'creating_standards', 'acronym', 'R.I.S.E. = Resilience. Intention. Self-belief. Execution. How champions respond to adversity.', NULL, 'both');
